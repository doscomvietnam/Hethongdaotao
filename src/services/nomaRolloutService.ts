/**
 * NOMA Rollout Report
 * Theo dõi tiến độ 9 khóa học NOMA mới cho nhân viên Kinh doanh + Marketing.
 * Yêu cầu: mỗi nhân viên phải hoàn thành 2 khóa/ngày kể từ ROLLOUT_START_DATE.
 * "Hoàn thành" = video_progress >= 100 VÀ đã nộp quiz (quiz_completed_at).
 */
import { supabase } from './supabaseClient';

export const NOMA_ROLLOUT_COURSE_IDS = [
  'C_NOMA110', 'C_NOMA120', 'C_NOMA130', 'C_NOMA230', 'C_NOMA350',
  'C_NOMA680', 'C_NOMA686', 'C_NOMA880', 'C_NOMA998',
];

export const NOMA_ROLLOUT_DEPARTMENTS = ['Kinh doanh', 'Marketing'];
export const NOMA_ROLLOUT_START_DATE = '2026-07-22';
export const NOMA_ROLLOUT_DAILY_RATE = 2;

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function getTodayVNDateStr(): string {
  const vnNow = new Date(Date.now() + VN_OFFSET_MS);
  return vnNow.toISOString().slice(0, 10);
}

function isoToVNDateStr(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + VN_OFFSET_MS).toISOString().slice(0, 10);
}

// ── Theo dõi theo ngày: mỗi ngày phải hoàn thành >= NOMA_ROLLOUT_DAILY_RATE khóa ──

export interface NomaDailyEmployee {
  id: string;
  fullName: string;
  department: string;
}

export interface NomaDailyReport {
  employees: NomaDailyEmployee[];
  /** Map "employeeId__YYYY-MM-DD" -> số khóa NOMA hoàn thành trong ngày đó (toàn thời gian, không chỉ trong tháng đang xem) */
  countsByDay: Map<string, number>;
  /** Map employeeId -> tổng số khóa đã hoàn thành (toàn thời gian, tối đa 9) */
  totalCompleted: Map<string, number>;
  today: string;
}

/** Lấy số khóa NOMA hoàn thành theo từng ngày (toàn thời gian) cho nhân viên Kinh doanh + Marketing */
export async function getNomaDailyProgress(): Promise<NomaDailyReport> {
  const today = getTodayVNDateStr();

  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, full_name, department')
    .eq('employment_status', 'active')
    .in('department', NOMA_ROLLOUT_DEPARTMENTS)
    .order('department')
    .order('full_name');
  if (empErr) throw empErr;

  const empIds = (employees || []).map((e: any) => e.id);

  const { data: progress, error: progErr } = await supabase
    .from('training_progress')
    .select('employee_id, course_id, video_progress, quiz_completed_at')
    .in('employee_id', empIds.length ? empIds : ['__none__'])
    .in('course_id', NOMA_ROLLOUT_COURSE_IDS)
    .not('quiz_completed_at', 'is', null);
  if (progErr) throw progErr;

  const countsByDay = new Map<string, number>();
  const totalCompleted = new Map<string, number>();
  for (const p of progress || []) {
    const done = (p.video_progress || 0) >= 100 && p.quiz_completed_at;
    if (!done) continue;
    const date = isoToVNDateStr(p.quiz_completed_at);
    if (!date) continue;
    const key = `${p.employee_id}__${date}`;
    countsByDay.set(key, (countsByDay.get(key) || 0) + 1);
    totalCompleted.set(p.employee_id, (totalCompleted.get(p.employee_id) || 0) + 1);
  }

  return {
    employees: (employees || []).map((e: any) => ({ id: e.id, fullName: e.full_name || '—', department: e.department || '—' })),
    countsByDay,
    totalCompleted,
    today,
  };
}
