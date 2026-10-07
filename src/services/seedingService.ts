import { supabase } from './supabaseClient';

export const SEEDING_GROUPS = [
  { key: 'koc', label: 'Seeding KOC' },
  { key: 'company', label: 'Seeding video công ty' },
  { key: 'competitor', label: 'Seeding đối thủ' },
] as const;

export interface SeedingLinkView {
  id: string; title: string; url: string;
  today: number; dailyMax: number;      // lượt hôm nay / tối đa mỗi ngày (2)
  total: number; totalMax: number;      // tổng lượt / tổng tối đa (10)
  mine: boolean; mineToday: boolean;    // tôi đã seed link này (bất kỳ ngày) / trong hôm nay
  linkFull: boolean; canClaim: boolean;
}
export interface SeedingGroupView {
  key: string; label: string;
  people: number; maxPeople: number; groupFull: boolean;
  myLinksInGroup: number; maxLinksPerGroup: number;
  links: SeedingLinkView[];
}
export interface SeedingState { date: string; groups: SeedingGroupView[]; myTodayTotal: number; minPerDay: number; }

async function token(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

// ───────── Nhân viên ─────────
// Bộ nhớ đệm theo tài khoản + ngày: mở tab Kiểm tra là hiện ngay dữ liệu lần trước, rồi tải mới ở nền.
const vnToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
async function cacheKey(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  return uid ? `seeding_state:${uid}` : null;
}
function saveCache(key: string | null, st: SeedingState) {
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify(st)); } catch { /* bỏ qua */ }
}
export async function getCachedSeedingState(): Promise<SeedingState | null> {
  try {
    const key = await cacheKey();
    const raw = key ? localStorage.getItem(key) : null;
    const st = raw ? (JSON.parse(raw) as SeedingState) : null;
    return st && st.date === vnToday() && Array.isArray(st.groups) ? st : null;
  } catch { return null; }
}

// Link đã bấm "Mở link" (theo tài khoản + ngày) — phải mở link ít nhất 1 lần mới được nộp ảnh.
async function openedKey(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  return uid ? `seeding_opened:${uid}:${vnToday()}` : null;
}
export async function getOpenedLinks(): Promise<string[]> {
  try {
    const key = await openedKey();
    const raw = key ? localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}
export async function markLinkOpened(linkId: string): Promise<void> {
  try {
    const key = await openedKey();
    if (!key) return;
    const list = new Set(await getOpenedLinks());
    list.add(linkId);
    localStorage.setItem(key, JSON.stringify([...list]));
  } catch { /* bỏ qua */ }
}

export async function getSeedingState(): Promise<SeedingState> {
  const t = await token();
  const r = await fetch(`/api/seeding?token=${encodeURIComponent(t)}`);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Không tải được nhiệm vụ seeding');
  const st: SeedingState = await r.json();
  saveCache(await cacheKey(), st);
  return st;
}

async function postSeeding(body: any): Promise<SeedingState> {
  const t = await token();
  const r = await fetch('/api/seeding', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: t, ...body }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e: any = new Error(j.message || j.error || 'Lỗi'); e.code = j.error; throw e; }
  saveCache(await cacheKey(), j);
  return j;
}
export const submitSeeding = (linkId: string, imageBase64: string, contentType: string) =>
  postSeeding({ action: 'submit', link_id: linkId, image_base64: imageBase64, content_type: contentType });
export const releaseSeeding = (linkId: string) => postSeeding({ action: 'release', link_id: linkId });

// ───────── Admin ─────────
async function postAdmin(body: any): Promise<any> {
  const t = await token();
  const r = await fetch('/api/seeding-admin', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: t, ...body }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Lỗi');
  return j;
}
export const adminListSeeding = () => postAdmin({ action: 'list' });
export const adminSeedingProgress = (date: string) => postAdmin({ action: 'progress', date });
export const adminSaveLink = (link: { id?: string; group_key: string; title?: string; url: string; max_people?: number }) =>
  postAdmin({ action: 'save-link', ...link });
export const adminDeleteLink = (id: string) => postAdmin({ action: 'delete-link', id });
export const adminSetLinkStatus = (id: string, status: string) => postAdmin({ action: 'set-status', id, status });
export const adminListSubmissions = (date: string, linkId?: string) => postAdmin({ action: 'submissions', date, link_id: linkId });
export const adminRevokeSubmission = (submission_id: string) => postAdmin({ action: 'revoke', submission_id });
export const adminRestoreSubmission = (submission_id: string) => postAdmin({ action: 'restore', submission_id });

// ───────── Nén ảnh trên trình duyệt trước khi upload ─────────
// Giới hạn theo CẠNH DÀI NHẤT (ảnh chụp màn hình điện thoại là ảnh dọc ~1080×2400 — giới hạn theo chiều
// ngang thì gần như không thu nhỏ). 1600px cạnh dài + JPEG 0.7 ≈ 150KB/ảnh, chữ vẫn đọc rõ.
export async function compressImage(file: File, maxSide = 1600, quality = 0.7): Promise<{ base64: string; contentType: string }> {
  const dataUrl: string = await new Promise((res, rej) => {
    const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = rej; fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
  });
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { base64: dataUrl, contentType: file.type || 'image/jpeg' };
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); // PNG nền trong suốt → không bị đen khi đổi sang JPEG
  ctx.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL('image/jpeg', quality);
  return { base64: out, contentType: 'image/jpeg' };
}
