/**
 * Serverless — Seeding hàng ngày (phía NHÂN VIÊN). Chỉ qua service_role (RLS chặn client).
 *  GET  /api/seeding?token=<jwt>            → trạng thái nhóm/link hôm nay + số đếm + claim của tôi
 *  POST /api/seeding  { token, action, ... }
 *     action='submit'  { link_id, image_base64, content_type }  → nộp/đổi ảnh (chống tràn chỗ)
 *     action='release' { link_id }                              → bỏ chỗ (xóa ảnh đã nộp của mình)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'seeding-proofs';
const GROUP_MAX = 15;                 // tối đa 15 người/nhóm/ngày
const MAX_LINKS_PER_GROUP = 2;        // mỗi người tối đa 2 link/nhóm
const GROUPS = [
  { key: 'koc', label: 'Seeding KOC' },
  { key: 'company', label: 'Seeding video công ty' },
  { key: 'competitor', label: 'Seeding đối thủ' },
] as const;

const svc = () =>
  createClient(process.env.VITE_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
const vnToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

async function verifyUser(s: any, token: string) {
  if (!token) return null;
  const { data, error } = await s.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: emp } = await s
    .from('employees')
    .select('id, full_name, role, department')
    .eq('auth_user_id', data.user.id)
    .maybeSingle();
  return emp || null;
}

// Gom số đếm + cờ trạng thái cho 1 nhân viên
async function buildState(s: any, meId: string) {
  const date = vnToday();
  const { data: links } = await s
    .from('seeding_links')
    .select('id, group_key, title, url, max_people')
    .eq('task_date', date)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  const { data: subs } = await s
    .from('seeding_submissions')
    .select('link_id, group_key, employee_id, image_path')
    .eq('task_date', date)
    .eq('status', 'active');

  const allSubs = subs || [];
  const linkCount: Record<string, number> = {};
  const groupPeople: Record<string, Set<string>> = {};
  const myLinksInGroup: Record<string, number> = {};
  const myLinks = new Set<string>();
  for (const r of allSubs) {
    linkCount[r.link_id] = (linkCount[r.link_id] || 0) + 1;
    (groupPeople[r.group_key] ||= new Set()).add(r.employee_id);
    if (r.employee_id === meId) {
      myLinks.add(r.link_id);
      myLinksInGroup[r.group_key] = (myLinksInGroup[r.group_key] || 0) + 1;
    }
  }

  const groups = GROUPS.map((g) => {
    const gLinks = (links || []).filter((l: any) => l.group_key === g.key);
    const people = groupPeople[g.key]?.size || 0;
    const myCount = myLinksInGroup[g.key] || 0;
    const inGroup = (groupPeople[g.key]?.has(meId)) || false;
    const groupFull = people >= GROUP_MAX && !inGroup;
    return {
      key: g.key,
      label: g.label,
      people,
      maxPeople: GROUP_MAX,
      groupFull,
      myLinksInGroup: myCount,
      maxLinksPerGroup: MAX_LINKS_PER_GROUP,
      links: gLinks.map((l: any) => {
        const cnt = linkCount[l.id] || 0;
        const mine = myLinks.has(l.id);
        const linkFull = cnt >= l.max_people && !mine;
        const canClaim = mine || (!linkFull && !groupFull && myCount < MAX_LINKS_PER_GROUP);
        return { id: l.id, title: l.title, url: l.url, count: cnt, max: l.max_people, mine, linkFull, canClaim };
      }),
    };
  });
  return { date, groups };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const s = svc();
  const token = (req.method === 'GET' ? (req.query.token as string) : req.body?.token) || '';
  const me = await verifyUser(s, token);
  if (!me) return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên không hợp lệ' });

  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(await buildState(s, me.id));
    }

    if (req.method === 'POST') {
      const action = req.body?.action;
      const date = vnToday();

      if (action === 'release') {
        const linkId = req.body?.link_id;
        const { data: row } = await s.from('seeding_submissions')
          .select('id, image_path').eq('link_id', linkId).eq('employee_id', me.id).maybeSingle();
        if (row) {
          if (row.image_path) await s.storage.from(BUCKET).remove([row.image_path]);
          await s.from('seeding_submissions').delete().eq('id', row.id);
        }
        return res.status(200).json(await buildState(s, me.id));
      }

      if (action === 'submit') {
        const linkId = req.body?.link_id;
        const b64 = req.body?.image_base64 || '';
        const ct = req.body?.content_type || 'image/jpeg';
        if (!linkId || !b64) return res.status(400).json({ error: 'Thiếu link hoặc ảnh' });

        const { data: link } = await s.from('seeding_links')
          .select('id, group_key, max_people, status, task_date').eq('id', linkId).maybeSingle();
        if (!link || link.status !== 'active' || link.task_date !== date)
          return res.status(400).json({ error: 'Link không còn hiệu lực hôm nay' });

        // Đã nộp link này chưa? (đổi ảnh thì bỏ qua kiểm tra trần chỗ)
        const { data: existing } = await s.from('seeding_submissions')
          .select('id, image_path').eq('link_id', linkId).eq('employee_id', me.id).maybeSingle();

        if (!existing) {
          // Kiểm tra trần chỗ TRƯỚC khi nhận
          const { data: subs } = await s.from('seeding_submissions')
            .select('link_id, group_key, employee_id').eq('task_date', date).eq('status', 'active');
          const all = subs || [];
          const linkCnt = all.filter((r: any) => r.link_id === linkId).length;
          const grpPeople = new Set(all.filter((r: any) => r.group_key === link.group_key).map((r: any) => r.employee_id));
          const myLinksInGrp = new Set(all.filter((r: any) => r.group_key === link.group_key && r.employee_id === me.id).map((r: any) => r.link_id)).size;
          if (linkCnt >= link.max_people) return res.status(409).json({ error: 'LINK_FULL', message: 'Link này vừa đủ người, chọn link khác nhé.' });
          if (!grpPeople.has(me.id) && grpPeople.size >= GROUP_MAX) return res.status(409).json({ error: 'GROUP_FULL', message: 'Nhóm này vừa đủ 15 người, chuyển nhóm khác nhé.' });
          if (myLinksInGrp >= MAX_LINKS_PER_GROUP) return res.status(409).json({ error: 'MAX_LINKS', message: `Bạn đã seed tối đa ${MAX_LINKS_PER_GROUP} link trong nhóm này.` });
        }

        // Upload ảnh
        const buf = Buffer.from(b64.replace(/^data:[^;]+;base64,/, ''), 'base64');
        const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
        const path = `${date}/${link.group_key}/${me.id}/${linkId}.${ext}`;
        const up = await s.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true });
        if (up.error) return res.status(500).json({ error: 'Lỗi tải ảnh: ' + up.error.message });

        // Ghi / cập nhật submission
        if (existing) {
          await s.from('seeding_submissions').update({ image_path: path, submitted_at: new Date().toISOString() }).eq('id', existing.id);
        } else {
          const ins = await s.from('seeding_submissions').insert({
            link_id: linkId, group_key: link.group_key, employee_id: me.id,
            task_date: date, image_path: path, status: 'active',
          });
          // Bù trừ: nếu vừa bị tràn do 2 người cùng nộp → rút lại
          if (!ins.error) {
            const { count } = await s.from('seeding_submissions')
              .select('id', { count: 'exact', head: true }).eq('link_id', linkId).eq('status', 'active');
            if ((count || 0) > link.max_people) {
              await s.from('seeding_submissions').delete().eq('link_id', linkId).eq('employee_id', me.id);
              await s.storage.from(BUCKET).remove([path]);
              return res.status(409).json({ error: 'LINK_FULL', message: 'Link này vừa đủ người, chọn link khác nhé.' });
            }
          } else if (ins.error.code === '23505') {
            // unique race: đã có row → coi như đổi ảnh, update
            await s.from('seeding_submissions').update({ image_path: path }).eq('link_id', linkId).eq('employee_id', me.id);
          } else {
            return res.status(500).json({ error: ins.error.message });
          }
        }
        return res.status(200).json(await buildState(s, me.id));
      }

      return res.status(400).json({ error: 'Hành động không hợp lệ' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
}
