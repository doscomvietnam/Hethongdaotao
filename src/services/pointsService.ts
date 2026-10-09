import { supabase } from './supabaseClient';

export interface PointsRow { employee_id: string; full_name: string; department: string | null; points: number; rank: number | null }
export interface PointsItem { employee_id: string; date: string; at: string; points: number; source: string; title: string; group_key: string }
export interface PointsData {
  month: string;
  summary: { total: number; withPoints: number; employees: number };
  sources: { key: string; label: string; points: number }[];
  leaderboard: PointsRow[];
  items: PointsItem[];
}

export interface MyPoints { total: number; month: number; today: number; monthKey: string }

/** Điểm tích lũy của chính mình (mọi nhân viên). */
export async function getMyPoints(month?: string): Promise<MyPoints> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Phiên đăng nhập đã hết');
  const r = await fetch(`/api/points?self=1&token=${encodeURIComponent(token)}${month ? `&month=${month}` : ''}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Không tải được điểm');
  return j as MyPoints;
}

/** Điểm theo tháng (YYYY-MM) của toàn công ty — CHỈ ADMIN. Hiện chỉ có điểm seeding. */
export async function getMonthlyPoints(month: string): Promise<PointsData> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Phiên đăng nhập đã hết, vui lòng đăng nhập lại');
  const r = await fetch(`/api/points?token=${encodeURIComponent(token)}&month=${month}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Không tải được điểm');
  return j as PointsData;
}
