import { supabase } from './supabaseClient';

/**
 * Luật hoàn thành ngày (chốt 08/10/2026): từ SEEDING_REQUIRED_FROM, một ngày chỉ "hoàn thành" khi
 * đã làm bài kiểm tra VÀ có ≥1 lượt seeding hợp lệ — trừ ngày không có link seeding nào đang chạy.
 * Chạy thử trên máy: đặt VITE_SEEDING_REQUIRED_FROM trong .env (vd 2026-10-08) để bật luật sớm hơn.
 */
export const SEEDING_REQUIRED_FROM: string =
  (import.meta.env.VITE_SEEDING_REQUIRED_FROM as string | undefined) || '2026-10-09';

export interface SeedingDays {
  /** Ngày bắt buộc seeding (đã áp dụng luật + có link đang chạy) */
  requiredDays: Set<string>;
  /** employeeId → các ngày đã seeding */
  done: Map<string, Set<string>>;
}

const EMPTY: SeedingDays = { requiredDays: new Set(), done: new Map() };

/** Lấy dữ liệu seeding theo ngày. Lỗi / ngoài phạm vi áp dụng → coi như không bắt buộc (không đánh X oan). */
export async function getSeedingDays(from: string, to: string, employeeIds?: string[]): Promise<SeedingDays> {
  if (to < SEEDING_REQUIRED_FROM) return EMPTY;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return EMPTY;
    const r = await fetch('/api/seeding-days', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, from, to, requiredFrom: SEEDING_REQUIRED_FROM, employee_ids: employeeIds }),
    });
    if (!r.ok) { console.warn('[seeding-days] lỗi', r.status); return EMPTY; }
    const j = await r.json();
    const done = new Map<string, Set<string>>();
    for (const [emp, days] of Object.entries(j.done || {})) done.set(emp, new Set(days as string[]));
    return { requiredDays: new Set<string>(j.requiredDays || []), done };
  } catch (e) {
    console.warn('[seeding-days] không tải được, tạm bỏ qua luật seeding', e);
    return EMPTY;
  }
}

/** Ngày `date` của nhân viên đã thỏa phần seeding chưa (không bắt buộc → coi như đạt). */
export function seedingOk(sd: SeedingDays, employeeId: string, date: string): boolean {
  return !sd.requiredDays.has(date) || !!sd.done.get(employeeId)?.has(date);
}

/** Bỏ khỏi `subMap` (empId → ngày đã làm bài) những ngày còn thiếu seeding bắt buộc. */
export function applySeedingRule(subMap: Map<string, Set<string>>, sd: SeedingDays): void {
  if (sd.requiredDays.size === 0) return;
  for (const [emp, days] of subMap) {
    for (const d of [...days]) if (!seedingOk(sd, emp, d)) days.delete(d);
  }
}
