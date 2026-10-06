/**
 * Serverless — Seeding hàng ngày (phía ADMIN). service_role, yêu cầu role admin/manager.
 *  POST /api/seeding-admin { token, action, ... }
 *    'list'          { date }                                   → link theo ngày + số đếm
 *    'save-link'     { id?, group_key, title, url, task_date, max_people }
 *    'delete-link'   { id }
 *    'set-status'    { id, status }                             → ẩn/hiện link
 *    'submissions'   { date, link_id? }                         → bài nộp + link ảnh ký tạm
 *    'revoke'        { submission_id }                          → thu hồi (revoked)
 *    'restore'       { submission_id }                          → khôi phục (active)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'seeding-proofs';
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
      const date = req.body?.date || vnToday();
      const { data: links } = await s.from('seeding_links')
        .select('id, group_key, title, url, max_people, status, task_date')
        .eq('task_date', date).order('created_at', { ascending: true });
      const { data: subs } = await s.from('seeding_submissions')
        .select('link_id, group_key, employee_id, status').eq('task_date', date);
      const active = (subs || []).filter((r: any) => r.status === 'active');
      const linkCount: Record<string, number> = {};
      const grpPeople: Record<string, Set<string>> = {};
      active.forEach((r: any) => {
        linkCount[r.link_id] = (linkCount[r.link_id] || 0) + 1;
        (grpPeople[r.group_key] ||= new Set()).add(r.employee_id);
      });
      const withCount = (links || []).map((l: any) => ({ ...l, count: linkCount[l.id] || 0 }));
      const groupPeople = Object.fromEntries(Object.entries(grpPeople).map(([k, v]) => [k, (v as Set<string>).size]));
      return res.status(200).json({ date, links: withCount, groupPeople });
    }

    if (action === 'save-link') {
      const { id, group_key, title, url, task_date, max_people } = req.body;
      if (!group_key || !title || !url) return res.status(400).json({ error: 'Thiếu nhóm/tiêu đề/link' });
      const payload: any = { group_key, title, url, max_people: max_people || 5 };
      if (task_date) payload.task_date = task_date;
      let r;
      if (id) r = await s.from('seeding_links').update(payload).eq('id', id);
      else r = await s.from('seeding_links').insert(payload);
      if (r.error) return res.status(500).json({ error: r.error.message });
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete-link') {
      const { error } = await s.from('seeding_links').delete().eq('id', req.body?.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    if (action === 'set-status') {
      const { error } = await s.from('seeding_links').update({ status: req.body?.status }).eq('id', req.body?.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    if (action === 'submissions') {
      const date = req.body?.date || vnToday();
      let q = s.from('seeding_submissions')
        .select('id, link_id, group_key, employee_id, image_path, status, submitted_at')
        .eq('task_date', date).order('submitted_at', { ascending: false });
      if (req.body?.link_id) q = q.eq('link_id', req.body.link_id);
      const { data: subs } = await q;
      const rows = subs || [];
      // tên nhân viên
      const empIds = [...new Set(rows.map((r: any) => r.employee_id))];
      const { data: emps } = empIds.length
        ? await s.from('employees').select('id, full_name, department').in('id', empIds)
        : { data: [] };
      const empMap = Object.fromEntries((emps || []).map((e: any) => [e.id, e]));
      // tiêu đề link
      const linkIds = [...new Set(rows.map((r: any) => r.link_id))];
      const { data: lks } = linkIds.length
        ? await s.from('seeding_links').select('id, title').in('id', linkIds)
        : { data: [] };
      const linkMap = Object.fromEntries((lks || []).map((l: any) => [l.id, l.title]));
      // link ảnh ký tạm (1 giờ)
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
          link_title: linkMap[r.link_id] || '', imageUrl,
        });
      }
      return res.status(200).json({ date, submissions: out });
    }

    if (action === 'revoke' || action === 'restore') {
      const status = action === 'revoke' ? 'revoked' : 'active';
      const { error } = await s.from('seeding_submissions')
        .update({ status, reviewed_by: me.id, reviewed_at: new Date().toISOString() })
        .eq('id', req.body?.submission_id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Hành động không hợp lệ' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
}
