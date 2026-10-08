/**
 * Serverless — Seeding (phía ADMIN). service_role, yêu cầu role admin/manager.
 *  POST /api/seeding-admin { token, action, ... }
 *    'list'                                                     → link đang chạy/đã ẩn + đã hoàn thành, số lượt hôm nay/tổng
 *    'save-link'     { id?, group_key, title (= tên sản phẩm, bắt buộc), url, max_people? } → thêm/sửa (CHẶN trùng link cũ, mặc định 10 lượt)
 *    'delete-link'   { id }
 *    'set-status'    { id, status: 'active'|'inactive' }       → ẩn/hiện link
 *    'submissions'   { date, link_id? }                         → bài nộp theo ngày + link ảnh ký tạm
 *    'progress'      { date }                                   → số link mỗi nhân viên đã seed trong ngày (mục tiêu 4)
 *    'revoke' / 'restore' { submission_id }                     → thu hồi / khôi phục (tự mở lại / đóng link theo tổng lượt)
 * Dọn dẹp: link 'completed' quá IMAGE_KEEP_DAYS ngày kể từ lượt cuối → xóa ảnh khỏi kho, giữ bản ghi.
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

const BUCKET = 'seeding-proofs';
const LINK_TOTAL_DEFAULT = 10;
const LINK_DAILY = 2;
const REQUIRED_PER_DAY = 1;   // bắt buộc mỗi ngày
const MAX_PER_DAY = 3;        // 1 bắt buộc + 2 tự nguyện
const MIN_LINKS_PER_GROUP = 28;
const IMAGE_KEEP_DAYS = 7;

const svc = () =>
  createClient(process.env.VITE_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
const vnToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

async function verifyAdmin(s: any, token: string) {
  if (!token) return null;
  const { data, error } = await s.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: emp } = await s.from('employees').select('id, role').eq('auth_user_id', data.user.id).maybeSingle();
  if (!emp || !['admin', 'manager'].includes(emp.role)) return null;
  return emp;
}

// Chuẩn hóa link để so trùng: bỏ http(s), www./m., dấu / cuối, #..., và các tham số theo dõi khi chia sẻ.
const TRACKING = /^(utm_.*|q|is_from_webapp|sender_device|sender_web_id|_r|_t|t|igshid|igsh|si|fbclid|share_.*|mibextid|rdid|ref|refer|feature|is_copy_url|web_id|lang|checksum|u_code|preview_pb|enable_checksum|user_id|tt_from|social_sharing|source)$/i;
function normalizeUrl(raw: string): string {
  const u0 = raw.trim();
  try {
    const u = new URL(/^https?:\/\//i.test(u0) ? u0 : 'https://' + u0);
    const host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
    const path = u.pathname.replace(/\/+$/, '');
    const keep = [...u.searchParams.entries()].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => a.localeCompare(b));
    const q = keep.length ? '?' + keep.map(([k, v]) => `${k}=${v}`).join('&') : '';
    return host + path + q;
  } catch {
    return u0.toLowerCase().replace(/\/+$/, '');
  }
}

/** Xóa ảnh của link đã hoàn thành quá 7 ngày (giữ dòng bài nộp để tính sao / chống trùng). */
async function cleanupOldImages(s: any) {
  const { data: done } = await s.from('seeding_links').select('id').eq('status', 'completed');
  if (!done?.length) return;
  const cutoff = Date.now() - IMAGE_KEEP_DAYS * 86400000;
  const { data: subs } = await fetchAll(() => s.from('seeding_submissions')
    .select('id, link_id, image_path, submitted_at, seeding_links!inner(status)')
    .eq('seeding_links.status', 'completed'), 'id');
  const lastAt: Record<string, number> = {};
  for (const r of subs || []) lastAt[r.link_id] = Math.max(lastAt[r.link_id] || 0, new Date(r.submitted_at).getTime());
  const old = (subs || []).filter((r: any) => r.image_path && lastAt[r.link_id] < cutoff);
  if (!old.length) return;
  await s.storage.from(BUCKET).remove(old.map((r: any) => r.image_path));
  await s.from('seeding_submissions').update({ image_path: null }).in('id', old.map((r: any) => r.id));
}

async function syncLinkStatus(s: any, linkId: string) {
  const { data: link } = await s.from('seeding_links').select('id, status, max_people').eq('id', linkId).maybeSingle();
  if (!link || link.status === 'inactive') return;
  const { count } = await s.from('seeding_submissions')
    .select('id', { count: 'exact', head: true }).eq('link_id', linkId).eq('status', 'active');
  const next = (count || 0) >= link.max_people ? 'completed' : 'active';
  if (next !== link.status) await s.from('seeding_links').update({ status: next }).eq('id', linkId);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const s = svc();
  const me = await verifyAdmin(s, req.body?.token || '');
  if (!me) return res.status(403).json({ error: 'Chỉ admin/quản lý được dùng' });

  const action = req.body?.action;
  try {
    if (action === 'list') {
      await cleanupOldImages(s);
      const date = vnToday();
      const { data: links } = await s.from('seeding_links')
        .select('id, group_key, title, url, max_people, status, created_at')
        .order('created_at', { ascending: true });
      const ids = (links || []).map((l: any) => l.id);
      const { data: subs } = ids.length
        ? await fetchAll(() => s.from('seeding_submissions').select('link_id, group_key, employee_id, task_date, submitted_at, image_path, status'), 'id')
        : { data: [] };
      const total: Record<string, number> = {}, today: Record<string, number> = {}, lastAt: Record<string, string> = {}, imgs: Record<string, number> = {};
      const grpPeople: Record<string, Set<string>> = {};
      for (const r of subs || []) {
        if (r.status !== 'active') continue;
        total[r.link_id] = (total[r.link_id] || 0) + 1;
        if (r.image_path) imgs[r.link_id] = (imgs[r.link_id] || 0) + 1;
        if (!lastAt[r.link_id] || r.submitted_at > lastAt[r.link_id]) lastAt[r.link_id] = r.submitted_at;
        if (r.task_date === date) {
          today[r.link_id] = (today[r.link_id] || 0) + 1;
          (grpPeople[r.group_key] ||= new Set()).add(r.employee_id);
        }
      }
      const out = (links || []).map((l: any) => {
        const last = lastAt[l.id];
        const imagesDeleteAt = l.status === 'completed' && last
          ? new Date(new Date(last).getTime() + IMAGE_KEEP_DAYS * 86400000).toISOString().slice(0, 10) : null;
        return { ...l, today: today[l.id] || 0, dailyMax: LINK_DAILY, total: total[l.id] || 0, images: imgs[l.id] || 0, completedAt: l.status === 'completed' ? last : null, imagesDeleteAt };
      });
      const groupPeople = Object.fromEntries(Object.entries(grpPeople).map(([k, v]) => [k, (v as Set<string>).size]));
      return res.status(200).json({ date, links: out, groupPeople, minLinksPerGroup: MIN_LINKS_PER_GROUP });
    }

    if (action === 'save-link') {
      const { id, group_key } = req.body;
      const url = (req.body?.url || '').trim();
      if (!group_key || !url) return res.status(400).json({ error: 'Thiếu nhóm hoặc link' });
      const title = (req.body?.title || '').trim();
      if (!title) return res.status(400).json({ error: 'Thiếu tên sản phẩm' });
      const quota = parseInt(req.body?.max_people) || LINK_TOTAL_DEFAULT;

      // Chặn trùng với MỌI link đã từng đăng (kể cả đã hoàn thành / đã ẩn)
      const { data: all } = await s.from('seeding_links').select('id, title, url, status, group_key');
      const norm = normalizeUrl(url);
      const dup = (all || []).find((l: any) => l.id !== id && normalizeUrl(l.url) === norm);
      if (dup) {
        const st = dup.status === 'completed' ? 'đã hoàn thành' : dup.status === 'inactive' ? 'đang ẩn' : 'đang chạy';
        return res.status(409).json({ error: `Link này đã được đăng trước đó ("${dup.title}", ${st}) — không được đăng trùng.` });
      }

      if (id) {
        const payload: any = { group_key, title, url, max_people: quota };
        const r = await s.from('seeding_links').update(payload).eq('id', id);
        if (r.error) return res.status(500).json({ error: r.error.message });
        await syncLinkStatus(s, id); // đổi tổng lượt có thể làm link đủ/thiếu
      } else {
        const r = await s.from('seeding_links').insert({ group_key, title, url, max_people: quota, task_date: vnToday(), status: 'active' });
        if (r.error) return res.status(500).json({ error: r.error.message });
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete-link') {
      const id = req.body?.id;
      const { data: subs } = await s.from('seeding_submissions').select('image_path').eq('link_id', id);
      const paths = (subs || []).map((r: any) => r.image_path).filter(Boolean);
      if (paths.length) await s.storage.from(BUCKET).remove(paths);
      const { error } = await s.from('seeding_links').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    if (action === 'set-status') {
      const id = req.body?.id;
      const status = req.body?.status === 'inactive' ? 'inactive' : 'active';
      const { error } = await s.from('seeding_links').update({ status }).eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      if (status === 'active') await syncLinkStatus(s, id);
      return res.status(200).json({ ok: true });
    }

    if (action === 'submissions') {
      await cleanupOldImages(s);
      const date = req.body?.date || vnToday();
      let q = s.from('seeding_submissions')
        .select('id, link_id, group_key, employee_id, image_path, status, submitted_at')
        .eq('task_date', date).order('submitted_at', { ascending: false });
      if (req.body?.link_id) q = q.eq('link_id', req.body.link_id);
      const { data: subs } = await q;
      const rows = subs || [];
      const empIds = [...new Set(rows.map((r: any) => r.employee_id))];
      const { data: emps } = empIds.length
        ? await s.from('employees').select('id, full_name, department').in('id', empIds)
        : { data: [] };
      const empMap = Object.fromEntries((emps || []).map((e: any) => [e.id, e]));
      const linkIds = [...new Set(rows.map((r: any) => r.link_id))];
      const { data: lks } = linkIds.length
        ? await s.from('seeding_links').select('id, title').in('id', linkIds)
        : { data: [] };
      const linkMap = Object.fromEntries((lks || []).map((l: any) => [l.id, l.title]));
      const out = [];
      for (const r of rows) {
        let imageUrl = null;
        if (r.image_path) {
          const { data: signed } = await s.storage.from(BUCKET).createSignedUrl(r.image_path, 3600);
          imageUrl = signed?.signedUrl || null;
        }
        out.push({
          id: r.id, group_key: r.group_key, status: r.status, submitted_at: r.submitted_at,
          employee: empMap[r.employee_id]?.full_name || r.employee_id,
          department: empMap[r.employee_id]?.department || '',
          link_title: linkMap[r.link_id] || '', imageUrl, imageDeleted: !r.image_path,
        });
      }
      return res.status(200).json({ date, submissions: out });
    }

    if (action === 'progress') {
      const date = req.body?.date || vnToday();
      const { data: emps } = await s.from('employees')
        .select('id, full_name, department, employment_status').eq('employment_status', 'active');
      const { data: subs } = await fetchAll(() => s.from('seeding_submissions')
        .select('employee_id, group_key').eq('task_date', date).eq('status', 'active'), 'id');
      const cnt: Record<string, number> = {};
      const byGroup: Record<string, Record<string, number>> = {};
      for (const r of subs || []) {
        cnt[r.employee_id] = (cnt[r.employee_id] || 0) + 1;
        ((byGroup[r.employee_id] ||= {})[r.group_key] = (byGroup[r.employee_id]?.[r.group_key] || 0) + 1);
      }
      // Điểm seeding trong tháng của ngày đang xem (ảnh còn hợp lệ) — khớp menu Hệ thống điểm
      const { data: allPts } = await fetchAll(() => s.from('seeding_submissions')
        .select('employee_id, stars_awarded').eq('status', 'active')
        .gte('task_date', date.slice(0, 7) + '-01').lte('task_date', date), 'id');
      const pts: Record<string, number> = {};
      for (const r of allPts || []) pts[r.employee_id] = (pts[r.employee_id] || 0) + (r.stars_awarded || 0);
      const rows = (emps || []).map((e: any) => ({
        id: e.id, name: e.full_name, department: e.department || '',
        count: cnt[e.id] || 0, byGroup: byGroup[e.id] || {}, points: pts[e.id] || 0,
      })).sort((a: any, b: any) => a.count - b.count || a.name.localeCompare(b.name));
      const done = rows.filter((r: any) => r.count >= REQUIRED_PER_DAY).length;
      return res.status(200).json({ date, requiredPerDay: REQUIRED_PER_DAY, maxPerDay: MAX_PER_DAY, done, total: rows.length, rows });
    }

    if (action === 'revoke' || action === 'restore') {
      const status = action === 'revoke' ? 'revoked' : 'active';
      const { data: row } = await s.from('seeding_submissions').select('link_id').eq('id', req.body?.submission_id).maybeSingle();
      const { error } = await s.from('seeding_submissions')
        .update({ status, reviewed_by: me.id, reviewed_at: new Date().toISOString() })
        .eq('id', req.body?.submission_id);
      if (error) return res.status(500).json({ error: error.message });
      if (row?.link_id) await syncLinkStatus(s, row.link_id);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
}
