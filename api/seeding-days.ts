/**
 * Serverless — "Ngày nào bắt buộc seeding" + "ai đã seeding ngày nào" (dùng cho Điểm danh / Vắng làm bài).
 *  POST /api/seeding-days { token, from, to, requiredFrom, employee_ids? }
 *   → { requiredDays: string[], done: { [employeeId]: string[] } }
 *
 * Luật hoàn thành ngày (từ requiredFrom): đã làm bài kiểm tra VÀ có ≥1 lượt seeding hợp lệ trong ngày.
 * Ngày KHÔNG có link seeding nào đang chạy → không bắt buộc seeding (không nằm trong requiredDays).
 * Link "đang chạy" ngày d: tạo trước/trong ngày d, chưa ẩn, và (còn active hoặc hoàn thành vào ngày ≥ d).
 * Quyền: admin/manager xem tất cả; nhân viên chỉ nhận dữ liệu của chính mình.
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
const toVNDate = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const isDate = (v: any) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const s = svc();
  const { token, from, to, requiredFrom } = req.body || {};
  if (!isDate(from) || !isDate(to) || !isDate(requiredFrom)) return res.status(400).json({ error: 'Thiếu/sai from, to, requiredFrom (YYYY-MM-DD)' });

  const { data: u, error: ue } = await s.auth.getUser(token || '');
  if (ue || !u?.user) return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên không hợp lệ' });
  const { data: me } = await s.from('employees').select('id, role').eq('auth_user_id', u.user.id).maybeSingle();
  if (!me) return res.status(403).json({ error: 'Không tìm thấy nhân viên' });
  const privileged = ['admin', 'manager'].includes(me.role);

  const start = from > requiredFrom ? from : requiredFrom;
  if (start > to) return res.status(200).json({ requiredDays: [], done: {} });

  try {
    const [{ data: links }, { data: subs }] = await Promise.all([
      s.from('seeding_links').select('id, status, created_at'),
      fetchAll(() => s.from('seeding_submissions').select('link_id, employee_id, task_date, submitted_at').eq('status', 'active'), 'id'),
    ]);

    // Ngày hoàn thành (lượt cuối) của link đã đủ lượt
    const lastDay: Record<string, string> = {};
    for (const r of subs || []) {
      const d = r.task_date as string;
      if (!lastDay[r.link_id] || d > lastDay[r.link_id]) lastDay[r.link_id] = d;
    }

    // Ngày bắt buộc seeding = ngày có ≥1 link đang chạy
    const requiredDays: string[] = [];
    for (let d = new Date(start + 'T00:00:00Z'); ; d.setUTCDate(d.getUTCDate() + 1)) {
      const day = d.toISOString().slice(0, 10);
      if (day > to) break;
      const has = (links || []).some((l: any) => {
        if (l.status === 'inactive') return false;
        if (toVNDate(l.created_at) > day) return false;
        if (l.status === 'completed') return (lastDay[l.id] || '') >= day;
        return true;
      });
      if (has) requiredDays.push(day);
    }

    // Ai đã seeding ngày nào (trong khoảng)
    const want = privileged
      ? (Array.isArray(req.body?.employee_ids) ? new Set<string>(req.body.employee_ids) : null)
      : new Set<string>([me.id]);
    const done: Record<string, string[]> = {};
    for (const r of subs || []) {
      const d = r.task_date as string;
      if (d < start || d > to) continue;
      if (want && !want.has(r.employee_id)) continue;
      (done[r.employee_id] ||= []).includes(d) || done[r.employee_id].push(d);
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ requiredDays, done });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
}
