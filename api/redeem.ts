/**
 * Serverless — ĐỔI QUÀ bằng điểm. service_role (bảng point_redemptions bật RLS, không policy).
 *  POST /api/redeem { token, action, ... }
 *   Nhân viên:
 *    'mine'                          → { balance: { earned, spent, available }, requests }
 *    'create'  { gift_name, gift_link? } → gửi yêu cầu (trạng thái pending)
 *    'cancel'  { id }                → tự hủy yêu cầu còn đang chờ
 *   Admin:
 *    'admin-list' { status? }        → mọi yêu cầu + tên NV + điểm hiện có của NV
 *    'approve' { id, points }        → duyệt, trừ `points` điểm (≤ điểm hiện có)
 *    'reject'  { id, reason }        → từ chối, bắt buộc lý do
 *    'bonus-list'   { month? }       → điểm thưởng đã cộng trong tháng (YYYY-MM, mặc định tháng này)
 *    'bonus-add'    { employee_id, points, reason } → cộng điểm thưởng (bảng point_bonuses)
 *    'bonus-delete' { id }           → xóa lượt thưởng cộng nhầm
 *  (Gộp điểm thưởng vào file này để không thêm serverless function — gói Vercel Hobby giới hạn 12.)
 *
 * Điểm hiện có = Σ stars_awarded (seeding còn hợp lệ) + Σ điểm thưởng − Σ points_spent (yêu cầu đã duyệt).
 * Nhân viên được báo kết quả qua bảng notifications; admin được báo khi có yêu cầu mới.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Supabase trả tối đa 1.000 dòng/lần → đọc theo trang (bản sao của src/services/fetchAll.ts;
// chép thẳng vào đây vì import file ngoài api/ dễ lỗi ESM trên Vercel)
async function fetchAll(build: () => any, orderBy: string): Promise<{ data: any[]; error: any }> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().order(orderBy, { ascending: true }).range(from, from + 999);
    if (error) return { data: out, error };
    out.push(...(data || []));
    if ((data || []).length < 1000) break;
  }
  return { data: out, error: null };
}

const MAX_PENDING = 3;          // tối đa 3 yêu cầu đang chờ / người
const MAX_BONUS = 1000;         // tối đa 1 lần cộng
const vnToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const nextMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 10);   // ngày 1 tháng sau
};
const svc = () =>
  createClient(process.env.VITE_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);

/** Điểm tích lũy / đã đổi / hiện có — của 1 người (empIds 1 phần tử) hoặc nhiều người. */
async function balances(s: any, empIds?: string[]) {
  const [earnQ, spentQ, bonusQ] = await Promise.all([
    fetchAll(() => {
      let q = s.from('seeding_submissions').select('employee_id, stars_awarded').eq('status', 'active');
      if (empIds) q = q.in('employee_id', empIds);
      return q;
    }, 'id'),
    fetchAll(() => {
      let q = s.from('point_redemptions').select('employee_id, points_spent').eq('status', 'approved');
      if (empIds) q = q.in('employee_id', empIds);
      return q;
    }, 'id'),
    fetchAll(() => {
      let q = s.from('point_bonuses').select('employee_id, points');
      if (empIds) q = q.in('employee_id', empIds);
      return q;
    }, 'id'),
  ]);
  if (spentQ.error) throw new Error('Chưa tạo bảng đổi quà (point_redemptions) — cần chạy SQL');
  const m: Record<string, { earned: number; spent: number; available: number }> = {};
  const get = (id: string) => (m[id] ||= { earned: 0, spent: 0, available: 0 });
  for (const r of earnQ.data) get(r.employee_id).earned += r.stars_awarded || 0;
  for (const r of spentQ.data) get(r.employee_id).spent += r.points_spent || 0;
  for (const r of bonusQ.data || []) get(r.employee_id).earned += r.points || 0;   // chưa có bảng → bỏ qua
  for (const v of Object.values(m)) v.available = v.earned - v.spent;
  return (id: string) => m[id] || { earned: 0, spent: 0, available: 0 };
}

async function notify(s: any, rows: any[]) {
  if (!rows.length) return;
  const { error } = await s.from('notifications').insert(rows);
  if (error) console.warn('[redeem] không gửi được thông báo:', error.message);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Chỉ hỗ trợ POST' });
  const s = svc();
  const body = req.body || {};
  const { data: u, error: ue } = await s.auth.getUser(body.token || '');
  if (ue || !u?.user) return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên không hợp lệ' });
  const { data: me } = await s.from('employees').select('id, full_name, role').eq('auth_user_id', u.user.id).maybeSingle();
  if (!me) return res.status(403).json({ error: 'Không tìm thấy nhân viên' });
  const isAdmin = me.role === 'admin';
  const action = body.action;

  try {
    // ================= NHÂN VIÊN =================
    if (action === 'mine') {
      const bal = (await balances(s, [me.id]))(me.id);
      const { data: requests, error } = await s.from('point_redemptions')
        .select('id, gift_name, gift_link, status, points_spent, reject_reason, created_at, reviewed_at')
        .eq('employee_id', me.id).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return res.status(200).json({ balance: bal, requests });
    }

    if (action === 'create') {
      const gift = String(body.gift_name || '').trim();
      const link = String(body.gift_link || '').trim();
      if (!gift) return res.status(400).json({ error: 'Nhập tên quà muốn đổi' });
      if (gift.length > 200) return res.status(400).json({ error: 'Tên quà tối đa 200 ký tự' });
      if (link && !/^https?:\/\/\S+$/i.test(link)) return res.status(400).json({ error: 'Link quà phải bắt đầu bằng http:// hoặc https://' });
      if (link.length > 1000) return res.status(400).json({ error: 'Link quà quá dài' });
      const { count } = await s.from('point_redemptions').select('id', { count: 'exact', head: true })
        .eq('employee_id', me.id).eq('status', 'pending');
      if ((count || 0) >= MAX_PENDING)
        return res.status(409).json({ error: `Bạn đang có ${count} yêu cầu chờ duyệt — đợi admin xử lý rồi gửi tiếp nhé.` });
      const { error } = await s.from('point_redemptions').insert({ employee_id: me.id, gift_name: gift, gift_link: link || null, status: 'pending' });
      if (error) throw error;
      // Báo cho các admin
      const { data: admins } = await s.from('employees').select('id').eq('role', 'admin').eq('employment_status', 'active');
      await notify(s, (admins || []).map((a: any) => ({
        employee_id: a.id, type: 'reward', title: 'Yêu cầu đổi quà mới',
        message: `${me.full_name} muốn đổi: ${gift}`, link_view: 'points', is_read: false,
      })));
      return res.status(200).json({ ok: true });
    }

    if (action === 'cancel') {
      const { data, error } = await s.from('point_redemptions').update({ status: 'cancelled' })
        .eq('id', body.id).eq('employee_id', me.id).eq('status', 'pending').select('id');
      if (error) throw error;
      if (!data?.length) return res.status(409).json({ error: 'Yêu cầu không còn ở trạng thái chờ duyệt' });
      return res.status(200).json({ ok: true });
    }

    // ================= ADMIN =================
    if (!isAdmin) return res.status(403).json({ error: 'Chỉ admin được duyệt đổi quà' });

    if (action === 'admin-list') {
      let q = s.from('point_redemptions')
        .select('id, employee_id, gift_name, gift_link, status, points_spent, reject_reason, created_at, reviewed_at, reviewed_by')
        .order('created_at', { ascending: false }).limit(300);
      if (body.status && body.status !== 'all') q = q.eq('status', body.status);
      const { data: rows, error } = await q;
      if (error) throw error;
      const ids = [...new Set((rows || []).flatMap((r: any) => [r.employee_id, r.reviewed_by]).filter(Boolean))] as string[];
      const { data: emps } = ids.length ? await s.from('employees').select('id, full_name, department').in('id', ids) : { data: [] };
      const em = Object.fromEntries((emps || []).map((e: any) => [e.id, e]));
      const empIds = [...new Set((rows || []).map((r: any) => r.employee_id))] as string[];
      const bal = empIds.length ? await balances(s, empIds) : () => ({ earned: 0, spent: 0, available: 0 });
      const { count: pending } = await s.from('point_redemptions').select('id', { count: 'exact', head: true }).eq('status', 'pending');
      return res.status(200).json({
        pending: pending || 0,
        requests: (rows || []).map((r: any) => ({
          ...r, full_name: em[r.employee_id]?.full_name || '(đã xóa)', department: em[r.employee_id]?.department || null,
          reviewer: r.reviewed_by ? em[r.reviewed_by]?.full_name || null : null, balance: bal(r.employee_id),
        })),
      });
    }

    if (action === 'approve' || action === 'reject') {
      const { data: row } = await s.from('point_redemptions').select('id, employee_id, gift_name, status').eq('id', body.id).maybeSingle();
      if (!row) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });
      if (row.status !== 'pending') return res.status(409).json({ error: 'Yêu cầu này đã được xử lý rồi' });
      const reviewed = { reviewed_at: new Date().toISOString(), reviewed_by: me.id };

      if (action === 'approve') {
        const points = Number(body.points);
        if (!Number.isInteger(points) || points < 0) return res.status(400).json({ error: 'Số điểm trừ phải là số nguyên ≥ 0' });
        const bal = (await balances(s, [row.employee_id]))(row.employee_id);
        if (points > bal.available) return res.status(400).json({ error: `Nhân viên chỉ còn ${bal.available} điểm — không đủ để trừ ${points} điểm` });
        const { data, error } = await s.from('point_redemptions').update({ status: 'approved', points_spent: points, reject_reason: null, ...reviewed })
          .eq('id', row.id).eq('status', 'pending').select('id');
        if (error) throw error;
        if (!data?.length) return res.status(409).json({ error: 'Yêu cầu này đã được xử lý rồi' });
        await notify(s, [{ employee_id: row.employee_id, type: 'reward', title: 'Yêu cầu đổi quà đã được duyệt 🎁',
          message: `Quà "${row.gift_name}" đã được duyệt${points ? ` — trừ ${points} điểm` : ''}.`, link_view: 'dashboard', is_read: false }]);
        return res.status(200).json({ ok: true });
      }

      const reason = String(body.reason || '').trim();
      if (!reason) return res.status(400).json({ error: 'Nhập lý do từ chối' });
      const { data, error } = await s.from('point_redemptions').update({ status: 'rejected', points_spent: 0, reject_reason: reason.slice(0, 500), ...reviewed })
        .eq('id', row.id).eq('status', 'pending').select('id');
      if (error) throw error;
      if (!data?.length) return res.status(409).json({ error: 'Yêu cầu này đã được xử lý rồi' });
      await notify(s, [{ employee_id: row.employee_id, type: 'reward', title: 'Yêu cầu đổi quà bị từ chối',
        message: `Quà "${row.gift_name}" bị từ chối. Lý do: ${reason}`, link_view: 'dashboard', is_read: false }]);
      return res.status(200).json({ ok: true });
    }

    // ---------- Điểm thưởng ----------
    if (action === 'bonus-list') {
      const month = /^\d{4}-\d{2}$/.test(body.month || '') ? body.month : vnToday().slice(0, 7);
      const { data: rows, error } = await s.from('point_bonuses')
        .select('id, employee_id, points, reason, award_date, created_at, created_by')
        .gte('award_date', `${month}-01`).lt('award_date', nextMonth(month))
        .order('created_at', { ascending: false }).limit(500);
      if (error) throw new Error('Chưa tạo bảng điểm thưởng (point_bonuses) — cần chạy SQL');
      const ids = [...new Set((rows || []).flatMap((r: any) => [r.employee_id, r.created_by]).filter(Boolean))] as string[];
      const { data: emps } = ids.length ? await s.from('employees').select('id, full_name, department').in('id', ids) : { data: [] };
      const em = Object.fromEntries((emps || []).map((e: any) => [e.id, e]));
      return res.status(200).json({
        month,
        bonuses: (rows || []).map((r: any) => ({
          ...r, full_name: em[r.employee_id]?.full_name || '(đã xóa)', department: em[r.employee_id]?.department || null,
          creator: r.created_by ? em[r.created_by]?.full_name || null : null,
        })),
      });
    }

    if (action === 'bonus-add') {
      const points = Number(body.points);
      const reason = String(body.reason || '').trim();
      if (!body.employee_id) return res.status(400).json({ error: 'Chọn nhân viên được thưởng' });
      if (!Number.isInteger(points) || points <= 0) return res.status(400).json({ error: 'Số điểm cộng phải là số nguyên lớn hơn 0' });
      if (points > MAX_BONUS) return res.status(400).json({ error: `Mỗi lần cộng tối đa ${MAX_BONUS} điểm` });
      if (!reason) return res.status(400).json({ error: 'Nhập lý do cộng điểm' });
      const { data: emp } = await s.from('employees').select('id, full_name').eq('id', body.employee_id).maybeSingle();
      if (!emp) return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
      const { error } = await s.from('point_bonuses').insert({
        employee_id: emp.id, points, reason: reason.slice(0, 500), award_date: vnToday(), created_by: me.id,
      });
      if (error) throw new Error(error.message.includes('point_bonuses') ? 'Chưa tạo bảng điểm thưởng (point_bonuses) — cần chạy SQL' : error.message);
      await notify(s, [{ employee_id: emp.id, type: 'reward', title: `Bạn được cộng ${points} điểm thưởng ⭐`,
        message: `Lý do: ${reason}`, link_view: 'dashboard', is_read: false }]);
      return res.status(200).json({ ok: true });
    }

    if (action === 'bonus-delete') {
      const { data, error } = await s.from('point_bonuses').delete().eq('id', body.id).select('id');
      if (error) throw error;
      if (!data?.length) return res.status(404).json({ error: 'Không tìm thấy lượt thưởng' });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
}
