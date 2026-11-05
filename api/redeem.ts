/**
 * Serverless — ĐỔI QUÀ bằng điểm. service_role (bảng point_redemptions bật RLS, không policy).
 *  POST /api/redeem { token, action, ... }
 *   Nhân viên:
 *    'mine'                          → { balance: { earned, spent, available }, requests }
 *    'create'  { gift_name, gift_link? } → gửi yêu cầu (trạng thái pending)
 *    'cancel'  { id }                → tự hủy yêu cầu còn đang chờ
 *   Admin:
 *    'pending-count'                 → { pending: đổi quà chờ duyệt, proposals: đề xuất đang xem xét } (số đỏ ở menu)
 *    'admin-list' { status? }        → mọi yêu cầu + tên NV + điểm hiện có của NV
 *    'approve' { id, points }        → duyệt, trừ `points` điểm (≤ điểm hiện có)
 *    'reject'  { id, reason }        → từ chối, bắt buộc lý do
 *    'bonus-list'   { month? }       → điểm thưởng đã cộng trong tháng (YYYY-MM, mặc định tháng này)
 *    'bonus-add'    { employee_id, points, reason } → cộng điểm thưởng (bảng point_bonuses)
 *    'bonus-delete' { id }           → xóa lượt thưởng cộng nhầm
 *
 *  Đề xuất cải tiến (bảng improvement_proposals):
 *    NV:    'proposal-upload-url' { name, size } → link ký sẵn để tự tải file đính kèm lên bucket 'proposal-files'
 *           'proposal-create' { category, content, plan?, attachments? } · 'proposal-mine' { month } · 'proposal-withdraw' { id }
 *    Admin: 'proposal-list' { month, status? }      · 'proposal-review' { id, status, points?, note? }
 *           Duyệt + điểm > 0 → ghi/sửa 1 dòng point_bonuses (bonus_id); bỏ duyệt → xóa dòng thưởng đó.
 *  (Gộp điểm thưởng + đề xuất vào file này để không thêm serverless function — gói Vercel Hobby giới hạn 12.)
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
const MAX_PROPOSAL_OPEN = 10;   // tối đa 10 đề xuất đang xem xét / người
const PROPOSAL_CATS: Record<string, string> = { work: 'Công việc', hr: 'Nhân sự', operation: 'Vận hành', culture: 'Văn hóa' };
const PROPOSAL_STATUS: Record<string, string> = { reviewing: 'Xem xét', approved: 'Duyệt', rejected: 'Không duyệt' };
const PROPOSAL_BUCKET = 'proposal-files';
const MAX_ATTACH = 3, MAX_ATTACH_BYTES = 10 * 1024 * 1024;
const ATTACH_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt', 'png', 'jpg', 'jpeg', 'webp', 'zip'];
const NO_PROPOSAL_TABLE = 'Chưa tạo bảng đề xuất (improvement_proposals) — cần chạy SQL';
const validMonth = (m: any) => (/^\d{4}-\d{2}$/.test(m || '') ? m : vnToday().slice(0, 7));
/** Khoảng thời gian của 1 tháng theo giờ Việt Nam (để lọc created_at) */
const monthRange = (m: string) => [`${m}-01T00:00:00+07:00`, `${nextMonth(m)}T00:00:00+07:00`];
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

/** Gắn link xem tạm (1 giờ) cho file đính kèm của danh sách đề xuất */
async function signAttachments(s: any, rows: any[]) {
  const paths = rows.flatMap((r: any) => (r.attachments || []).map((a: any) => a.path));
  if (!paths.length) return rows;
  const { data } = await s.storage.from(PROPOSAL_BUCKET).createSignedUrls(paths, 3600);
  const url = Object.fromEntries((data || []).map((d: any) => [d.path, d.signedUrl]));
  return rows.map((r: any) => ({ ...r, attachments: (r.attachments || []).map((a: any) => ({ ...a, url: url[a.path] || null })) }));
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

    // ---------- Đề xuất cải tiến (nhân viên) ----------
    if (action === 'proposal-upload-url') {
      const name = String(body.name || '').trim();
      const size = Number(body.size);
      const ext = (name.split('.').pop() || '').toLowerCase();
      if (!name || !ATTACH_EXT.includes(ext)) return res.status(400).json({ error: `File "${name}" không hỗ trợ — chỉ nhận ${ATTACH_EXT.join(', ')}` });
      if (!(size > 0) || size > MAX_ATTACH_BYTES) return res.status(400).json({ error: `File "${name}" vượt quá 10 MB` });
      const path = `${me.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { data, error } = await s.storage.from(PROPOSAL_BUCKET).createSignedUploadUrl(path);
      if (error) throw new Error('Chưa tạo kho file đề xuất (proposal-files) — cần chạy SQL');
      return res.status(200).json({ path: data.path, token: data.token });
    }

    if (action === 'proposal-create') {
      const category = String(body.category || '');
      const content = String(body.content || '').trim();
      const plan = String(body.plan || '').trim();
      if (!PROPOSAL_CATS[category]) return res.status(400).json({ error: 'Chọn mục đề xuất' });
      if (content.length < 10) return res.status(400).json({ error: 'Ý tưởng đề xuất cần ít nhất 10 ký tự' });
      if (content.length > 3000) return res.status(400).json({ error: 'Ý tưởng đề xuất tối đa 3.000 ký tự' });
      if (plan.length > 5000) return res.status(400).json({ error: 'Phương án triển khai tối đa 5.000 ký tự' });
      const attachments = (Array.isArray(body.attachments) ? body.attachments : []).slice(0, MAX_ATTACH)
        .filter((a: any) => typeof a?.path === 'string' && a.path.startsWith(`${me.id}/`))   // chỉ nhận file do chính mình tải lên
        .map((a: any) => ({ path: a.path, name: String(a.name || 'file').slice(0, 200), size: Number(a.size) || 0 }));
      if (!attachments.length) return res.status(400).json({ error: 'Đính kèm file phương án triển khai' });
      const { count, error: ce } = await s.from('improvement_proposals').select('id', { count: 'exact', head: true })
        .eq('employee_id', me.id).eq('status', 'reviewing');
      if (ce) throw new Error(NO_PROPOSAL_TABLE);
      if ((count || 0) >= MAX_PROPOSAL_OPEN)
        return res.status(409).json({ error: `Bạn đang có ${count} đề xuất chờ xem xét — đợi admin xử lý bớt rồi gửi tiếp nhé.` });
      const { error } = await s.from('improvement_proposals')
        .insert({ employee_id: me.id, category, content, plan: plan || null, attachments, status: 'reviewing' });
      if (error) throw error;
      const { data: admins } = await s.from('employees').select('id').eq('role', 'admin').eq('employment_status', 'active');
      await notify(s, (admins || []).map((a: any) => ({
        employee_id: a.id, type: 'proposal', title: `Đề xuất cải tiến mới · ${PROPOSAL_CATS[category]}`,
        message: `${me.full_name}: ${content.slice(0, 140)}${content.length > 140 ? '…' : ''}`, link_view: 'proposals', is_read: false,
      })));
      return res.status(200).json({ ok: true });
    }

    if (action === 'proposal-mine') {
      const month = validMonth(body.month);
      const [from, to] = monthRange(month);
      const { data: rows, error } = await s.from('improvement_proposals')
        .select('id, category, content, plan, attachments, status, points, admin_note, created_at, reviewed_at')
        .eq('employee_id', me.id).gte('created_at', from).lt('created_at', to)
        .order('created_at', { ascending: false }).limit(200);
      if (error) throw new Error(NO_PROPOSAL_TABLE);
      return res.status(200).json({ month, proposals: await signAttachments(s, rows || []) });
    }

    if (action === 'proposal-withdraw') {
      const { data, error } = await s.from('improvement_proposals').delete()
        .eq('id', body.id).eq('employee_id', me.id).eq('status', 'reviewing').select('id, attachments');
      if (error) throw error;
      if (!data?.length) return res.status(409).json({ error: 'Đề xuất đã được admin xử lý, không rút lại được' });
      const paths = (data[0].attachments || []).map((a: any) => a.path);
      if (paths.length) await s.storage.from(PROPOSAL_BUCKET).remove(paths);
      return res.status(200).json({ ok: true });
    }

    // ================= ADMIN =================
    if (!isAdmin) return res.status(403).json({ error: 'Chỉ admin được duyệt đổi quà' });

    if (action === 'pending-count') {
      const [r, p] = await Promise.all([
        s.from('point_redemptions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        s.from('improvement_proposals').select('id', { count: 'exact', head: true }).eq('status', 'reviewing'),
      ]);
      if (r.error) throw r.error;
      return res.status(200).json({ pending: r.count || 0, proposals: p.error ? 0 : p.count || 0 });   // chưa có bảng đề xuất → 0
    }

    // ---------- Đề xuất cải tiến (admin) ----------
    if (action === 'proposal-list') {
      const month = validMonth(body.month);
      const [from, to] = monthRange(month);
      const { data: all, error } = await fetchAll(() => {
        let q = s.from('improvement_proposals')
          .select('id, employee_id, category, content, plan, attachments, status, points, admin_note, created_at, reviewed_at, reviewed_by')
          .gte('created_at', from).lt('created_at', to);
        if (PROPOSAL_STATUS[body.status]) q = q.eq('status', body.status);
        return q;
      }, 'id');
      if (error) throw new Error(NO_PROPOSAL_TABLE);
      const rows = await signAttachments(s, all.sort((a: any, b: any) => b.created_at.localeCompare(a.created_at)));
      const ids = [...new Set((rows || []).flatMap((r: any) => [r.employee_id, r.reviewed_by]).filter(Boolean))] as string[];
      const { data: emps } = ids.length ? await s.from('employees').select('id, full_name, department').in('id', ids) : { data: [] };
      const em = Object.fromEntries((emps || []).map((e: any) => [e.id, e]));
      const { count: reviewing } = await s.from('improvement_proposals').select('id', { count: 'exact', head: true }).eq('status', 'reviewing');
      return res.status(200).json({
        month, reviewing: reviewing || 0,
        proposals: (rows || []).map((r: any) => ({
          ...r, full_name: em[r.employee_id]?.full_name || '(đã xóa)', department: em[r.employee_id]?.department || null,
          reviewer: r.reviewed_by ? em[r.reviewed_by]?.full_name || null : null,
        })),
      });
    }

    if (action === 'proposal-review') {
      const status = String(body.status || '');
      if (!PROPOSAL_STATUS[status]) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
      const points = status === 'approved' ? Number(body.points ?? 0) : 0;
      if (!Number.isInteger(points) || points < 0) return res.status(400).json({ error: 'Điểm thưởng phải là số nguyên ≥ 0' });
      if (points > MAX_BONUS) return res.status(400).json({ error: `Mỗi đề xuất thưởng tối đa ${MAX_BONUS} điểm` });
      const note = String(body.note || '').trim().slice(0, 1000) || null;
      const { data: row, error: re } = await s.from('improvement_proposals')
        .select('id, employee_id, category, content, status, points, admin_note, bonus_id').eq('id', body.id).maybeSingle();
      if (re) throw new Error(NO_PROPOSAL_TABLE);
      if (!row) return res.status(404).json({ error: 'Không tìm thấy đề xuất' });

      // Đồng bộ điểm thưởng: duyệt + điểm > 0 → có đúng 1 dòng point_bonuses; ngược lại → không có
      let bonusId: string | null = row.bonus_id;
      const reason = `Đề xuất cải tiến (${PROPOSAL_CATS[row.category]}): ${row.content.slice(0, 120)}${row.content.length > 120 ? '…' : ''}`;
      if (points > 0) {
        if (bonusId) {
          const { data: upd, error } = await s.from('point_bonuses').update({ points, reason }).eq('id', bonusId).select('id');
          if (error) throw error;
          if (!upd?.length) bonusId = null;   // dòng thưởng đã bị xóa tay ở Điểm thưởng → tạo lại
        }
        if (!bonusId) {
          const { data: b, error } = await s.from('point_bonuses')
            .insert({ employee_id: row.employee_id, points, reason, award_date: vnToday(), created_by: me.id }).select('id').single();
          if (error) throw error;
          bonusId = b.id;
        }
      } else if (bonusId) {
        const { error } = await s.from('point_bonuses').delete().eq('id', bonusId);
        if (error) throw error;
        bonusId = null;
      }

      const { error: ue } = await s.from('improvement_proposals').update({
        status, points, admin_note: note, bonus_id: bonusId,
        reviewed_at: status === 'reviewing' ? null : new Date().toISOString(), reviewed_by: status === 'reviewing' ? null : me.id,
      }).eq('id', row.id);
      if (ue) throw ue;

      if (status !== row.status || points !== row.points || note !== (row.admin_note || null)) {
        const title = status === 'approved'
          ? `Đề xuất của bạn đã được duyệt${points > 0 ? ` · +${points} điểm ⭐` : ' 🎉'}`
          : status === 'rejected' ? 'Đề xuất của bạn không được duyệt'
          : row.status === 'reviewing' ? 'Đề xuất của bạn đang được xem xét' : 'Đề xuất của bạn đang được xem xét lại';
        await notify(s, [{ employee_id: row.employee_id, type: 'proposal', title,
          message: `${PROPOSAL_CATS[row.category]}: ${row.content.slice(0, 100)}${row.content.length > 100 ? '…' : ''}${note ? ` — Phản hồi: ${note}` : ''}`,
          link_view: 'proposals', is_read: false }]);
      }
      return res.status(200).json({ ok: true });
    }

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
