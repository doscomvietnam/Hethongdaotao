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

export interface NomaRolloutRow {
  employeeId: string;
  fullName: string;
  department: string;
  completedCount: number;
  totalCount: number;
  expectedByToday: number;
  onTrack: boolean;
  missingCourseCodes: string[];
}

export interface NomaRolloutReport {
  rows: NomaRolloutRow[];
  daysElapsed: number;
  expectedByToday: number;
  startDate: string;
}

function getTodayVNDateStr(): string {
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const vnNow = new Date(Date.now() + VN_OFFSET_MS);
  return vnNow.toISOString().slice(0, 10);
}

function courseCode(courseId: string): string {
  return courseId.replace('C_NOMA', '');
}

export async function getNomaRolloutReport(): Promise<NomaRolloutReport> {
  const today = getTodayVNDateStr();
  const daysElapsed = Math.max(
    1,
    Math.floor((new Date(today).getTime() - new Date(NOMA_ROLLOUT_START_DATE).getTime()) / 86400000) + 1,
  );
  const expectedByToday = Math.min(NOMA_ROLLOUT_COURSE_IDS.length, daysElapsed * NOMA_ROLLOUT_DAILY_RATE);

  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, full_name, department')
    .eq('employment_status', 'active')
    .in('department', NOMA_ROLLOUT_DEPARTMENTS);
  if (empErr) throw empErr;

  const empIds = (employees || []).map((e: any) => e.id);

  const { data: progress, error: progErr } = await supabase
    .from('training_progress')
    .select('employee_id, course_id, video_progress, quiz_completed_at')
    .in('employee_id', empIds.length ? empIds : ['__none__'])
    .in('course_id', NOMA_ROLLOUT_COURSE_IDS);
  if (progErr) throw progErr;

  const progMap = new Map<string, any>();
  for (const p of progress || []) progMap.set(`${p.employee_id}__${p.course_id}`, p);

  const rows: NomaRolloutRow[] = (employees || []).map((e: any) => {
    const missingCourseCodes: string[] = [];
    let completedCount = 0;
    for (const cid of NOMA_ROLLOUT_COURSE_IDS) {
      const p = progMap.get(`${e.id}__${cid}`);
      const done = Boolean(p && (p.video_progress || 0) >= 100 && p.quiz_completed_at);
      if (done) completedCount++;
      else missingCourseCodes.push(courseCode(cid));
    }
    return {
      employeeId: e.id,
      fullName: e.full_name || '—',
      department: e.department || '—',
      completedCount,
      totalCount: NOMA_ROLLOUT_COURSE_IDS.length,
      expectedByToday,
      onTrack: completedCount >= expectedByToday,
      missingCourseCodes,
    };
  }).sort((a, b) => a.completedCount - b.completedCount || a.fullName.localeCompare(b.fullName, 'vi'));

  return { rows, daysElapsed, expectedByToday, startDate: NOMA_ROLLOUT_START_DATE };
}
