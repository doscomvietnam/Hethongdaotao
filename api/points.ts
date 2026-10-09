/**
 * Serverless — HỆ THỐNG ĐIỂM (tính theo tháng).
 *  GET /api/points?token=<jwt>&self=1[&month=YYYY-MM] → MỌI nhân viên: điểm của CHÍNH MÌNH { total, month, today, monthKey }
 *  CHỈ ADMIN.  GET /api/points?token=<jwt>&month=YYYY-MM   (bỏ month → tháng hiện tại, giờ VN)
 *   → { month, summary: { total, withPoints, employees }, sources, leaderboard: [...], items: [...mọi lượt, kèm employee_id] }
 *
 * Hiện chỉ có 1 nguồn điểm: seeding (Σ stars_awarded của ảnh còn hợp lệ, theo task_date).
 * Sau này thêm nguồn điểm khác / đổi quà thì cộng vào `sources` và trừ điểm đã đổi ở đây.
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

const svc = () =>
  createClient(process.env.VITE_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
const vnToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Chỉ hỗ trợ GET' });
  const s = svc();
  const token = (req.query.token as string) || '';
  const { data: u, error: ue } = await s.auth.getUser(token);
  if (ue || !u?.user) return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên không hợp lệ' });
  const { data: me } = await s.from('employees').select('id, role').eq('auth_user_id', u.user.id).maybeSingle();
  if (!me) return res.status(403).json({ error: 'Không tìm thấy nhân viên' });

  // Điểm tích lũy của chính mình (thẻ trên Tổng quan cá nhân)
  if (req.query.self === '1' || req.query.self === 'true') {
    const today = vnToday();
    const monthKey = /^\d{4}-\d{2}$/.test((req.query.month as string) || '') ? (req.query.month as string) : today.slice(0, 7);
    const { data: rows, error } = await fetchAll(() => s.from('seeding_submissions')
      .select('stars_awarded, task_date').eq('employee_id', me.id).eq('status', 'active'), 'id');
    if (error) return res.status(500).json({ error: error.message });
    // Điểm thưởng admin cộng (tính theo award_date) — chưa có bảng thì bỏ qua
    const { data: bonusRows } = await fetchAll(() => s.from('point_bonuses')
      .select('points, award_date').eq('employee_id', me.id), 'id');
    for (const b of bonusRows || []) rows.push({ stars_awarded: b.points, task_date: b.award_date });
    const sum = (f: (r: any) => boolean) => rows.filter(f).reduce((a: number, r: any) => a + (r.stars_awarded || 0), 0);
    // Điểm đã dùng đổi quà (yêu cầu đã duyệt) — lỗi/chưa có bảng thì coi như 0
    const { data: spentRows } = await fetchAll(() => s.from('point_redemptions')
      .select('points_spent').eq('employee_id', me.id).eq('status', 'approved'), 'id');
    const spent = (spentRows || []).reduce((a: number, r: any) => a + (r.points_spent || 0), 0);
    const earned = sum(() => true);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      total: earned - spent,                                    // điểm tích lũy còn lại (đã trừ đổi quà)
      earned, spent,                                            // tổng kiếm được / đã đổi quà
      month: sum(r => (r.task_date || '').startsWith(monthKey)), // tháng được chọn (mặc định tháng này)
      today: sum(r => r.task_date === today),
      monthKey,
    });
  }

  if (me.role !== 'admin') return res.status(403).json({ error: 'Chỉ admin được xem Hệ thống điểm' });

  const month = /^\d{4}-\d{2}$/.test((req.query.month as string) || '') ? (req.query.month as string) : vnToday().slice(0, 7);
  const { from, to } = monthBounds(month);

  try {
    const [{ data: subs }, { data: emps }, { data: bonuses }] = await Promise.all([
      fetchAll(() => s.from('seeding_submissions')
        .select('id, employee_id, link_id, task_date, submitted_at, stars_awarded')
        .eq('status', 'active').gte('task_date', from).lte('task_date', to), 'id'),
      s.from('employees').select('id, full_name, department').eq('employment_status', 'active'),
      fetchAll(() => s.from('point_bonuses')
        .select('id, employee_id, points, reason, award_date, created_at')
        .gte('award_date', from).lte('award_date', to), 'id'),   // chưa có bảng → rỗng
    ]);

    // Bảng xếp hạng tháng
    const pts: Record<string, number> = {};
    for (const r of subs) pts[r.employee_id] = (pts[r.employee_id] || 0) + (r.stars_awarded || 0);
    for (const b of bonuses || []) pts[b.employee_id] = (pts[b.employee_id] || 0) + (b.points || 0);
    const leaderboard = (emps || [])
      .map((e: any): any => ({ employee_id: e.id, full_name: e.full_name, department: e.department, points: pts[e.id] || 0, rank: null }))
      .sort((a: any, b: any) => b.points - a.points || a.full_name.localeCompare(b.full_name, 'vi'));
    // Hạng đồng điểm: cùng điểm → cùng hạng
    let rank = 0, prev = -1;
    leaderboard.forEach((r: any, i: number) => { if (r.points !== prev) { rank = i + 1; prev = r.points; } r.rank = r.points > 0 ? rank : null; });

    // Chi tiết từng lượt (mọi nhân viên) — trang admin lọc theo người được chọn
    const linkIds = [...new Set(subs.map((r: any) => r.link_id))];
    const { data: links } = linkIds.length
      ? await s.from('seeding_links').select('id, title, group_key').in('id', linkIds)
      : { data: [] as any[] };
    const linkMap = Object.fromEntries((links || []).map((l: any) => [l.id, l]));
    const items = [
      ...subs.map((r: any) => ({
        employee_id: r.employee_id, date: r.task_date, at: r.submitted_at, points: r.stars_awarded || 0, source: 'seeding',
        title: linkMap[r.link_id]?.title || '', group_key: linkMap[r.link_id]?.group_key || '',
      })),
      ...(bonuses || []).map((b: any) => ({
        employee_id: b.employee_id, date: b.award_date, at: b.created_at, points: b.points || 0, source: 'bonus',
        title: b.reason || '', group_key: '',
      })),
    ].sort((a: any, b: any) => (b.at || '').localeCompare(a.at || ''));
    const seedTotal = subs.reduce((a: number, r: any) => a + (r.stars_awarded || 0), 0);
    const bonusTotal = (bonuses || []).reduce((a: number, b: any) => a + (b.points || 0), 0);
    const total = seedTotal + bonusTotal;

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      month,
      summary: {
        total,                                                     // tổng điểm toàn công ty trong tháng
        withPoints: leaderboard.filter((r: any) => r.points > 0).length,
        employees: leaderboard.length,                             // số nhân viên đang làm
      },
      sources: [{ key: 'seeding', label: 'Seeding', points: seedTotal }, { key: 'bonus', label: 'Điểm thưởng', points: bonusTotal }],
      leaderboard,
      items,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
}
