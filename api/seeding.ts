/**
 * Serverless — Seeding (phía NHÂN VIÊN). Chỉ qua service_role (RLS chặn client).
 *  GET  /api/seeding?token=<jwt>            → nhóm + link đang chạy + số đếm + tiến độ của tôi
 *  POST /api/seeding  { token, action, ... }
 *     action='submit'  { link_id, image_base64, content_type }  → nộp/đổi ảnh (kiểm tra giới hạn)
 *     action='release' { link_id }                              → bỏ lượt hôm nay (xóa ảnh + bỏ giữ chỗ)
 *     action='claim'   { link_id }                              → bấm "Mở link" = giữ chỗ trên link (bảng seeding_claims)
 *
 * Luật (chốt 06/10/2026):
 *  - Link chạy nhiều ngày; mỗi link tổng LINK_TOTAL lượt (seeding_links.max_people), tối đa LINK_DAILY lượt/ngày.
 *    Đủ tổng lượt → link 'completed' (ẩn khỏi nhân viên); ảnh giữ thêm 7 ngày rồi tự xóa (xem seeding-admin).
 *  - Mỗi nhóm tối đa GROUP_MAX người/ngày. Mỗi người tối đa MAX_PER_GROUP link/nhóm/ngày; nếu ≥2 nhóm đã đầy
 *    với người đó thì được MAX_PER_GROUP_EXCEPTION link trong nhóm còn lại.
 *  - Mỗi ngày: REQUIRED_PER_DAY lượt bắt buộc + OPTIONAL_PER_DAY lượt tự nguyện → tối đa MAX_PER_DAY lượt.
 *  - Mỗi lượt seeding = POINTS_PER_SEED điểm (lưu ở stars_awarded); ảnh bị thu hồi thì không tính điểm.
 *  - Mỗi người seed 1 link tối đa 1 lần (unique link_id + employee_id).
 *  - Giữ chỗ (14/10/2026): bấm "Mở link" giữ 1 chỗ, hết hạn sau CLAIM_TTL_MIN phút nếu chưa nộp. Chỗ trống của link
 *    = min(LINK_DAILY − đã nộp hôm nay, tổng lượt còn lại) − người khác đang giữ → người thứ 3 bị báo đủ ngay khi bấm.
 *    Chưa có bảng seeding_claims (chưa chạy SQL) → bỏ qua giữ chỗ, chạy như cũ.
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
const GROUP_MAX = 28;
const LINK_DAILY = 2;
const MAX_PER_GROUP = 2;
const REQUIRED_PER_DAY = 1;   // bắt buộc mỗi ngày
const OPTIONAL_PER_DAY = 2;   // tự nguyện thêm
const MAX_PER_DAY = REQUIRED_PER_DAY + OPTIONAL_PER_DAY;
const MAX_PER_GROUP_EXCEPTION = MAX_PER_DAY;
const POINTS_PER_SEED = 1;
const CLAIM_TTL_MIN = 10;     // giữ chỗ hết hạn sau 10 phút nếu không nộp ảnh
const GROUPS = [
  { key: 'koc', label: 'Seeding KOC' },
  { key: 'company', label: 'Seeding video công ty' },
  { key: 'competitor', label: 'Seeding đối thủ' },
] as const;

const svc = () =>
  createClient(process.env.VITE_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
const vnToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const claimCutoff = () => new Date(Date.now() - CLAIM_TTL_MIN * 60_000).toISOString();

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

/** Số liệu chung: link đang chạy + lượt hôm nay + tổng lượt. */
async function loadCounts(s: any) {
  const date = vnToday();
  // 3 truy vấn chạy SONG SONG (trước chạy nối tiếp → chậm khi hàm ở xa DB)
  const [{ data: links }, { data: linkSubs }, { data: todaySubs }, claimsQ] = await Promise.all([
    s.from('seeding_links')
      .select('id, group_key, title, url, max_people, status, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
    // Bài nộp của các link đang chạy (mọi ngày) → tổng lượt + "tôi đã seed link này chưa"
    fetchAll(() => s.from('seeding_submissions')
      .select('link_id, employee_id, task_date, seeding_links!inner(status)')
      .eq('status', 'active').eq('seeding_links.status', 'active'), 'id'),
    // Bài nộp HÔM NAY (mọi link) → số người/nhóm/ngày + số link của mỗi người hôm nay
    fetchAll(() => s.from('seeding_submissions')
      .select('link_id, group_key, employee_id').eq('task_date', date).eq('status', 'active'), 'id'),
    // Giữ chỗ còn hiệu lực hôm nay (chưa có bảng → lỗi → coi như không có)
    s.from('seeding_claims').select('link_id, employee_id, claimed_at')
      .eq('task_date', date).gte('claimed_at', claimCutoff()).order('claimed_at', { ascending: true }),
  ]);
  const claimsSupported = !claimsQ.error;
  const claims = claimsSupported ? (claimsQ.data || []) : [];

  return { date, links: links || [], linkSubs: linkSubs || [], todaySubs: todaySubs || [], claims, claimsSupported };
}

/** Giữ chỗ còn hiệu lực, bỏ những người đã nộp link đó hôm nay (đã thành lượt nộp). */
function liveClaims(claims: any[], todaySubs: any[]) {
  const submitted = new Set(todaySubs.map((r: any) => `${r.link_id}|${r.employee_id}`));
  return claims.filter((c: any) => !submitted.has(`${c.link_id}|${c.employee_id}`));
}

/** Giới hạn của 1 nhân viên theo nhóm (gồm ngoại lệ 2/3 nhóm đầy). */
function limitsFor(meId: string, todaySubs: any[]) {
  const people: Record<string, Set<string>> = {};
  const mine: Record<string, number> = {};
  for (const r of todaySubs) {
    (people[r.group_key] ||= new Set()).add(r.employee_id);
    if (r.employee_id === meId) mine[r.group_key] = (mine[r.group_key] || 0) + 1;
  }
  const fullForMe = (g: string) => (people[g]?.size || 0) >= GROUP_MAX && !people[g]?.has(meId);
  const unavailable = GROUPS.filter((g) => fullForMe(g.key)).length;
  const perGroupMax = unavailable >= 2 ? MAX_PER_GROUP_EXCEPTION : MAX_PER_GROUP;
  return { people, mine, fullForMe, perGroupMax };
}

async function buildState(s: any, meId: string, pre?: Awaited<ReturnType<typeof loadCounts>> | null) {
  const { date, links, linkSubs, todaySubs, claims, claimsSupported } = pre || await loadCounts(s);
  const live = liveClaims(claims, todaySubs);
  const heldByOthers: Record<string, number> = {};
  const myClaim: Record<string, string> = {};
  for (const c of live) {
    if (c.employee_id === meId) myClaim[c.link_id] = c.claimed_at;
    else heldByOthers[c.link_id] = (heldByOthers[c.link_id] || 0) + 1;
  }
  const total: Record<string, number> = {};
  const today: Record<string, number> = {};
  const mineAny = new Set<string>();
  const mineToday = new Set<string>();
  for (const r of linkSubs) {
    total[r.link_id] = (total[r.link_id] || 0) + 1;
    if (r.task_date === date) today[r.link_id] = (today[r.link_id] || 0) + 1;
    if (r.employee_id === meId) {
      mineAny.add(r.link_id);
      if (r.task_date === date) mineToday.add(r.link_id);
    }
  }
  const { people, mine, fullForMe, perGroupMax } = limitsFor(meId, todaySubs);
  const myTodayTotal = todaySubs.filter((r: any) => r.employee_id === meId).length;
  const dayFull = myTodayTotal >= MAX_PER_DAY;
  // Chỗ đang giữ (chưa nộp) của tôi cũng chiếm suất trong ngày / trong nhóm
  const linkGroup: Record<string, string> = Object.fromEntries(links.map((l: any) => [l.id, l.group_key]));
  const myOpenClaims = Object.keys(myClaim);
  const myClaimsInGroup = (g: string) => myOpenClaims.filter((id) => linkGroup[id] === g).length;
  // Điểm seeding của tôi trong THÁNG này (chỉ tính ảnh còn hợp lệ) — khớp menu Hệ thống điểm
  const { data: myPts } = await fetchAll(() => s.from('seeding_submissions')
    .select('stars_awarded, task_date').eq('employee_id', meId).eq('status', 'active')
    .gte('task_date', date.slice(0, 7) + '-01'), 'id');
  const points = (myPts || []).reduce((a: number, r: any) => a + (r.stars_awarded || 0), 0);
  const pointsToday = (myPts || []).filter((r: any) => r.task_date === date).reduce((a: number, r: any) => a + (r.stars_awarded || 0), 0);

  const groups = GROUPS.map((g) => {
    const groupFull = fullForMe(g.key);
    const myInGroup = mine[g.key] || 0;
    const gLinks = links.filter((l: any) => l.group_key === g.key).map((l: any) => {
      const t = today[l.id] || 0;
      const tot = total[l.id] || 0;
      const isMine = mineAny.has(l.id);
      const isMineToday = mineToday.has(l.id);
      const held = heldByOthers[l.id] || 0;
      const claimedAt = myClaim[l.id] || null;
      const free = Math.min(LINK_DAILY - t, l.max_people - tot) - held;   // chỗ còn cho người mới
      const linkFull = !isMine && !claimedAt && free <= 0;
      const canClaim = !isMine && !dayFull && !groupFull && (claimedAt
        ? t < LINK_DAILY && tot < l.max_people
        : free > 0 && myTodayTotal + myOpenClaims.length < MAX_PER_DAY && myInGroup + myClaimsInGroup(g.key) < perGroupMax);
      return {
        id: l.id, title: l.title, url: l.url,
        today: t, dailyMax: LINK_DAILY, total: tot, totalMax: l.max_people,
        mine: isMine, mineToday: isMineToday, linkFull, canClaim,
        held,
        // Chưa có bảng giữ chỗ → không trả claimedAt để giao diện chạy như cũ (dựa vào lần mở trên máy)
        ...(claimsSupported ? { claimedAt } : {}),
      };
    });
    return {
      key: g.key, label: g.label,
      people: people[g.key]?.size || 0, maxPeople: GROUP_MAX, groupFull,
      myLinksInGroup: myInGroup, maxLinksPerGroup: perGroupMax,
      links: gLinks,
    };
  });
  return {
    date, groups, myTodayTotal, dayFull,
    openClaims: myOpenClaims.length,          // số link tôi đang giữ chỗ (đã mở, chưa nộp)
    requiredPerDay: REQUIRED_PER_DAY, optionalPerDay: OPTIONAL_PER_DAY, maxPerDay: MAX_PER_DAY,
    points, pointsToday, pointsPerSeed: POINTS_PER_SEED,
  };
}

/** Cập nhật trạng thái link theo tổng lượt: đủ → completed, thiếu (do thu hồi/bỏ) → active. */
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const s = svc();
  const token = (req.method === 'GET' ? (req.query.token as string) : req.body?.token) || '';
  // GET: xác thực + tải số liệu chạy song song (số liệu không phụ thuộc người dùng)
  const [me, preCounts] = await Promise.all([
    verifyUser(s, token),
    req.method === 'GET' && token ? loadCounts(s) : Promise.resolve(null),
  ]);
  if (!me) return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên không hợp lệ' });

  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(await buildState(s, me.id, preCounts));
    }

    if (req.method === 'POST') {
      const action = req.body?.action;
      const date = vnToday();

      if (action === 'release') {
        const linkId = req.body?.link_id;
        const { data: row } = await s.from('seeding_submissions')
          .select('id, image_path, task_date').eq('link_id', linkId).eq('employee_id', me.id).maybeSingle();
        if (row && row.task_date !== date) return res.status(400).json({ error: 'Chỉ bỏ được lượt nộp trong hôm nay' });
        await s.from('seeding_claims').delete().eq('link_id', linkId).eq('employee_id', me.id).eq('task_date', date);
        if (row) {
          if (row.image_path) await s.storage.from(BUCKET).remove([row.image_path]);
          await s.from('seeding_submissions').delete().eq('id', row.id);
          await syncLinkStatus(s, linkId);
        }
        return res.status(200).json(await buildState(s, me.id));
      }

      if (action === 'claim') {
        const linkId = req.body?.link_id;
        const { data: link } = await s.from('seeding_links')
          .select('id, group_key, max_people, status').eq('id', linkId).maybeSingle();
        if (!link || link.status !== 'active')
          return res.status(409).json({ error: 'LINK_CLOSED', message: 'Link này đã đủ lượt hoặc đã đóng, chọn link khác nhé.' });
        const counts = await loadCounts(s);
        const { linkSubs, todaySubs, claims } = counts;
        if (linkSubs.some((r: any) => r.link_id === linkId && r.employee_id === me.id))
          return res.status(200).json(await buildState(s, me.id, counts));        // đã nộp → chỉ mở lại link
        const live = liveClaims(claims, todaySubs);
        if (live.some((c: any) => c.link_id === linkId && c.employee_id === me.id))
          return res.status(200).json(await buildState(s, me.id, counts));        // đang giữ chỗ rồi

        const subsOfLink = linkSubs.filter((r: any) => r.link_id === linkId);
        const linkToday = subsOfLink.filter((r: any) => r.task_date === date).length;
        const others = live.filter((c: any) => c.link_id === linkId && c.employee_id !== me.id).length;
        const capacity = Math.min(LINK_DAILY - linkToday, link.max_people - subsOfLink.length);
        const { mine, fullForMe, perGroupMax } = limitsFor(me.id, todaySubs);
        const myToday = todaySubs.filter((r: any) => r.employee_id === me.id).length;
        const groupOf: Record<string, string> = Object.fromEntries(counts.links.map((l: any) => [l.id, l.group_key]));
        const myClaims = live.filter((c: any) => c.employee_id === me.id);
        const myClaimsInGroup = myClaims.filter((c: any) => groupOf[c.link_id] === link.group_key).length;
        if (myToday >= MAX_PER_DAY) return res.status(409).json({ error: 'DAY_FULL', message: `Hôm nay bạn đã seed đủ ${MAX_PER_DAY} lượt.` });
        if (myToday + myClaims.length >= MAX_PER_DAY)
          return res.status(409).json({ error: 'DAY_FULL', message: `Bạn đang mở ${myClaims.length} link chưa nộp ảnh — nộp ảnh (hoặc bỏ giữ chỗ) trước khi mở link khác nhé.` });
        if (fullForMe(link.group_key)) return res.status(409).json({ error: 'GROUP_FULL', message: `Nhóm này đã đủ ${GROUP_MAX} người hôm nay, chuyển nhóm khác nhé.` });
        if ((mine[link.group_key] || 0) + myClaimsInGroup >= perGroupMax)
          return res.status(409).json({ error: 'MAX_LINKS', message: `Bạn đã seed / đang mở tối đa ${perGroupMax} link trong nhóm này hôm nay.` });
        if (capacity - others <= 0)
          return res.status(409).json({ error: 'LINK_FULL', message: `Link này đã đủ ${LINK_DAILY} người đang seed hôm nay — chọn link khác nhé.` });

        // Ghi giữ chỗ (ghi đè chỗ cũ đã hết hạn của chính mình)
        const up = await s.from('seeding_claims').upsert(
          { link_id: linkId, employee_id: me.id, task_date: date, claimed_at: new Date().toISOString() },
          { onConflict: 'link_id,employee_id,task_date' });
        if (up.error) return res.status(200).json(await buildState(s, me.id, counts));   // chưa có bảng → chạy như cũ

        // Bù trừ khi nhiều người bấm cùng lúc: ai ngoài số chỗ (theo thứ tự bấm) thì rút lại
        const { data: after } = await s.from('seeding_claims').select('employee_id, claimed_at')
          .eq('link_id', linkId).eq('task_date', date).gte('claimed_at', claimCutoff()).order('claimed_at', { ascending: true });
        const doneToday = new Set(todaySubs.filter((r: any) => r.link_id === linkId).map((r: any) => r.employee_id));
        const queue = (after || []).filter((c: any) => !doneToday.has(c.employee_id));
        if (queue.findIndex((c: any) => c.employee_id === me.id) >= capacity) {
          await s.from('seeding_claims').delete().eq('link_id', linkId).eq('employee_id', me.id).eq('task_date', date);
          return res.status(409).json({ error: 'LINK_FULL', message: `Link này vừa đủ ${LINK_DAILY} người đang seed — chọn link khác nhé.` });
        }
        return res.status(200).json(await buildState(s, me.id));
      }

      if (action === 'submit') {
        const linkId = req.body?.link_id;
        const b64 = req.body?.image_base64 || '';
        const ct = req.body?.content_type || 'image/jpeg';
        if (!linkId || !b64) return res.status(400).json({ error: 'Thiếu link hoặc ảnh' });

        const { data: link } = await s.from('seeding_links')
          .select('id, group_key, max_people, status').eq('id', linkId).maybeSingle();
        if (!link || link.status !== 'active')
          return res.status(400).json({ error: 'LINK_CLOSED', message: 'Link này đã đủ lượt hoặc đã đóng, chọn link khác nhé.' });

        const { data: existing } = await s.from('seeding_submissions')
          .select('id, image_path, task_date').eq('link_id', linkId).eq('employee_id', me.id).maybeSingle();
        if (existing && existing.task_date !== date)
          return res.status(409).json({ error: 'ALREADY', message: 'Bạn đã seed link này vào ngày trước rồi, chọn link khác nhé.' });

        if (!existing) {
          const { linkSubs, todaySubs, claims } = await loadCounts(s);
          const live = liveClaims(claims, todaySubs);
          const iHold = live.some((c: any) => c.link_id === linkId && c.employee_id === me.id);
          const othersHold = live.filter((c: any) => c.link_id === linkId && c.employee_id !== me.id).length;
          const subsOfLink = linkSubs.filter((r: any) => r.link_id === linkId);
          const linkToday = subsOfLink.filter((r: any) => r.task_date === date).length;
          const { mine, fullForMe, perGroupMax } = limitsFor(me.id, todaySubs);
          const myToday = todaySubs.filter((r: any) => r.employee_id === me.id).length;
          if (myToday >= MAX_PER_DAY) return res.status(409).json({ error: 'DAY_FULL', message: `Hôm nay bạn đã seed đủ ${MAX_PER_DAY} lượt (1 bắt buộc + ${OPTIONAL_PER_DAY} tự nguyện).` });
          if (subsOfLink.length >= link.max_people) return res.status(409).json({ error: 'LINK_DONE', message: 'Link này vừa đủ lượt, chọn link khác nhé.' });
          if (linkToday >= LINK_DAILY) return res.status(409).json({ error: 'LINK_FULL', message: `Link này đã đủ ${LINK_DAILY} lượt hôm nay, chọn link khác nhé.` });
          // Không giữ chỗ (hết hạn / bản web cũ) mà chỗ trống đã bị người khác giữ hết → không cho chen
          if (!iHold && Math.min(LINK_DAILY - linkToday, link.max_people - subsOfLink.length) - othersHold <= 0)
            return res.status(409).json({ error: 'LINK_FULL', message: `Link này đã có ${LINK_DAILY} người đang seed — chọn link khác nhé.` });
          if (fullForMe(link.group_key)) return res.status(409).json({ error: 'GROUP_FULL', message: `Nhóm này đã đủ ${GROUP_MAX} người hôm nay, chuyển nhóm khác nhé.` });
          if ((mine[link.group_key] || 0) >= perGroupMax) return res.status(409).json({ error: 'MAX_LINKS', message: `Bạn đã seed tối đa ${perGroupMax} link trong nhóm này hôm nay.` });
        }

        // Upload ảnh
        const buf = Buffer.from(b64.replace(/^data:[^;]+;base64,/, ''), 'base64');
        const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
        const path = `${date}/${link.group_key}/${me.id}/${linkId}.${ext}`;
        const up = await s.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true });
        if (up.error) return res.status(500).json({ error: 'Lỗi tải ảnh: ' + up.error.message });

        if (existing) {
          if (existing.image_path && existing.image_path !== path) await s.storage.from(BUCKET).remove([existing.image_path]);
          await s.from('seeding_submissions').update({ image_path: path, submitted_at: new Date().toISOString() }).eq('id', existing.id);
          return res.status(200).json(await buildState(s, me.id));
        }

        const ins = await s.from('seeding_submissions').insert({
          link_id: linkId, group_key: link.group_key, employee_id: me.id,
          task_date: date, image_path: path, status: 'active', stars_awarded: POINTS_PER_SEED,
        });
        if (ins.error) {
          await s.storage.from(BUCKET).remove([path]);
          if (ins.error.code === '23505') return res.status(409).json({ error: 'ALREADY', message: 'Bạn đã nộp link này rồi.' });
          return res.status(500).json({ error: ins.error.message });
        }

        // Bù trừ khi 2 người cùng nộp chỗ cuối: vượt giới hạn → rút lại
        const { data: after } = await s.from('seeding_submissions')
          .select('id, task_date').eq('link_id', linkId).eq('status', 'active');
        const afterTotal = (after || []).length;
        const afterToday = (after || []).filter((r: any) => r.task_date === date).length;
        if (afterTotal > link.max_people || afterToday > LINK_DAILY) {
          await s.from('seeding_submissions').delete().eq('link_id', linkId).eq('employee_id', me.id);
          await s.storage.from(BUCKET).remove([path]);
          return res.status(409).json({ error: 'LINK_FULL', message: 'Link này vừa đủ lượt, chọn link khác nhé.' });
        }
        await s.from('seeding_claims').delete().eq('link_id', linkId).eq('employee_id', me.id);   // đã nộp → bỏ giữ chỗ
        await syncLinkStatus(s, linkId); // đủ tổng lượt → completed (ẩn khỏi nhân viên)
        return res.status(200).json(await buildState(s, me.id));
      }

      return res.status(400).json({ error: 'Hành động không hợp lệ' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
}
