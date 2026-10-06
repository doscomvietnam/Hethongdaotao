import { supabase } from './supabaseClient';

export const SEEDING_GROUPS = [
  { key: 'koc', label: 'Seeding KOC' },
  { key: 'company', label: 'Seeding video công ty' },
  { key: 'competitor', label: 'Seeding đối thủ' },
] as const;

export interface SeedingLinkView {
  id: string; title: string; url: string;
  count: number; max: number;
  mine: boolean; linkFull: boolean; canClaim: boolean;
}
export interface SeedingGroupView {
  key: string; label: string;
  people: number; maxPeople: number; groupFull: boolean;
  myLinksInGroup: number; maxLinksPerGroup: number;
  links: SeedingLinkView[];
}
export interface SeedingState { date: string; groups: SeedingGroupView[]; }

async function token(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

// ───────── Nhân viên ─────────
export async function getSeedingState(): Promise<SeedingState> {
  const t = await token();
  const r = await fetch(`/api/seeding?token=${encodeURIComponent(t)}`);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Không tải được nhiệm vụ seeding');
  return r.json();
}

async function postSeeding(body: any): Promise<SeedingState> {
  const t = await token();
  const r = await fetch('/api/seeding', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: t, ...body }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e: any = new Error(j.message || j.error || 'Lỗi'); e.code = j.error; throw e; }
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
export const adminListSeeding = (date: string) => postAdmin({ action: 'list', date });
export const adminSaveLink = (link: { id?: string; group_key: string; title: string; url: string; task_date?: string; max_people?: number }) =>
  postAdmin({ action: 'save-link', ...link });
export const adminDeleteLink = (id: string) => postAdmin({ action: 'delete-link', id });
export const adminSetLinkStatus = (id: string, status: string) => postAdmin({ action: 'set-status', id, status });
export const adminListSubmissions = (date: string, linkId?: string) => postAdmin({ action: 'submissions', date, link_id: linkId });
export const adminRevokeSubmission = (submission_id: string) => postAdmin({ action: 'revoke', submission_id });
export const adminRestoreSubmission = (submission_id: string) => postAdmin({ action: 'restore', submission_id });

// ───────── Nén ảnh trên trình duyệt trước khi upload ─────────
export async function compressImage(file: File, maxW = 1280, quality = 0.7): Promise<{ base64: string; contentType: string }> {
  const dataUrl: string = await new Promise((res, rej) => {
    const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = rej; fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
  });
  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { base64: dataUrl, contentType: file.type || 'image/jpeg' };
  ctx.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL('image/jpeg', quality);
  return { base64: out, contentType: 'image/jpeg' };
}
