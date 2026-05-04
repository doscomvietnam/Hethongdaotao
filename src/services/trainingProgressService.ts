/**
 * Training Progress Service
 * Lưu và đọc tiến độ đào tạo từ Supabase (video progress, quiz results)
 * Dùng cho: admin dashboard, xuất báo cáo Excel
 */
import { supabase } from './supabaseClient';

// ── Upsert video progress ───────────────────────────────────────────────
export async function upsertVideoProgress(employeeId: string, courseId: string, progress: number) {
  try {
    await supabase
      .from('training_progress')
      .upsert({
        employee_id: employeeId,
        course_id: courseId,
        video_progress: Math.min(100, Math.max(0, progress)),
        status: progress > 0 ? 'in_progress' : 'not_started',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'employee_id,course_id' });
  } catch (e) {
    console.error('Error saving video progress:', e);
  }
}

// ── Save quiz result ────────────────────────────────────────────────────
export async function saveQuizResult(
  employeeId: string,
  courseId: string,
  score: number,
  timeSeconds: number,
  passed: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('training_progress')
      .upsert({
        employee_id: employeeId,
        course_id: courseId,
        quiz_score: score,
        quiz_time_seconds: timeSeconds,
        quiz_completed_at: new Date().toISOString(),
        quiz_passed: passed,
        status: passed ? 'completed' : 'in_progress',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'employee_id,course_id' });

    if (error) {
      console.error('Supabase save quiz error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error saving quiz result:', e);
    return false;
  }
}

// ── Get video progress from Supabase ────────────────────────────────────
export async function getSupabaseVideoProgress(employeeId: string, courseId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('training_progress')
      .select('video_progress')
      .eq('employee_id', employeeId)
      .eq('course_id', courseId)
      .single();
    return data?.video_progress || 0;
  } catch {
    return 0;
  }
}

// ── Admin: Get all progress with employee + course details ──────────────
export async function getAllTrainingProgress(): Promise<any[]> {
  try {
    // Try join query first
    const { data, error } = await supabase
      .from('training_progress')
      .select(`
        *,
        employees!fk_employee(full_name, department, email),
        courses!fk_course(course_name, brand, category)
      `)
      .order('updated_at', { ascending: false });

    if (!error && data && data.length > 0) return data;

    // Fallback: manual join
    console.warn('Join query failed or empty, using manual join:', error?.message);
    const [progressRes, empRes, courseRes] = await Promise.all([
      supabase.from('training_progress').select('*').order('updated_at', { ascending: false }),
      supabase.from('employees').select('id, full_name, department, email'),
      supabase.from('courses').select('course_id, course_name, brand, category'),
    ]);

    const empMap = new Map((empRes.data || []).map((e: any) => [e.id, e]));
    const courseMap = new Map((courseRes.data || []).map((c: any) => [c.course_id, c]));

    return (progressRes.data || []).map((p: any) => ({
      ...p,
      employees: empMap.get(p.employee_id) || { full_name: '—', department: '—', email: '' },
      courses: courseMap.get(p.course_id) || { course_name: '—', brand: '', category: '' },
    }));
  } catch (e) {
    console.error('Error:', e);
    return [];
  }
}

// ── Admin: Dashboard aggregate stats ────────────────────────────────────
export async function getAdminStats() {
  try {
    const [employeesRes, coursesRes, progressRes] = await Promise.all([
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('employment_status', 'active'),
      supabase.from('courses').select('course_id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('training_progress').select('*'),
    ]);

    const employeeCount = employeesRes.count || 0;
    const courseCount = coursesRes.count || 0;
    const allProgress = progressRes.data || [];

    const completedCount = allProgress.filter((p: any) => p.quiz_passed === true).length;
    const failedCount = allProgress.filter((p: any) => p.quiz_score != null && !p.quiz_passed).length;
    // Completion rate = passed / (total employees × total courses)
    const totalExpected = employeeCount * courseCount;
    const completionRate = totalExpected > 0 ? Math.round((completedCount / totalExpected) * 100 * 10) / 10 : 0;

    return { employeeCount, courseCount, completionRate, failedCount };
  } catch (e) {
    console.error('Admin stats error:', e);
    return { employeeCount: 0, courseCount: 0, completionRate: 0, failedCount: 0 };
  }
}

// ── Admin: Department stats for charts ──────────────────────────────────
export async function getDepartmentStats(): Promise<{ name: string; hoanthanh: number; hieusuat: number }[]> {
  try {
    const { data } = await supabase
      .from('training_progress')
      .select(`
        quiz_passed, quiz_score, video_progress,
        employees!fk_employee(department)
      `);

    if (!data || data.length === 0) return [];

    const deptMap: Record<string, { total: number; passed: number; avgScore: number; scores: number[] }> = {};

    for (const row of data) {
      const dept = (row as any).employees?.department || 'Khác';
      if (!deptMap[dept]) deptMap[dept] = { total: 0, passed: 0, avgScore: 0, scores: [] };
      deptMap[dept].total++;
      if (row.quiz_passed) deptMap[dept].passed++;
      if (row.quiz_score != null) deptMap[dept].scores.push(row.quiz_score);
    }

    return Object.entries(deptMap).map(([name, d]) => ({
      name,
      hoanthanh: d.total > 0 ? Math.round((d.passed / d.total) * 100) : 0,
      hieusuat: d.scores.length > 0 ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0,
    }));
  } catch {
    return [];
  }
}

// ── Export: Download as Excel (.xlsx) ───────────────────────────────────
export async function exportTrainingReportExcel() {
  const XLSX = await import('xlsx');

  // Fetch data with manual join fallback
  let rows: any[] = [];

  const { data, error } = await supabase
    .from('training_progress')
    .select(`
      video_progress, quiz_score, quiz_time_seconds, quiz_passed, quiz_completed_at, status,
      employees!fk_employee(full_name, department),
      courses!fk_course(course_name)
    `)
    .order('updated_at', { ascending: false });

  if (!error && data) {
    rows = data;
  } else {
    const [progressRes, empRes, courseRes] = await Promise.all([
      supabase.from('training_progress').select('*').order('updated_at', { ascending: false }),
      supabase.from('employees').select('id, full_name, department'),
      supabase.from('courses').select('course_id, course_name'),
    ]);

    const empMap = new Map((empRes.data || []).map((e: any) => [e.id, e]));
    const courseMap = new Map((courseRes.data || []).map((c: any) => [c.course_id, c]));

    rows = (progressRes.data || []).map((p: any) => ({
      ...p,
      employees: empMap.get(p.employee_id) || { full_name: '—', department: '—' },
      courses: courseMap.get(p.course_id) || { course_name: '—' },
    }));
  }

  // Build worksheet data
  const wsData = rows.map((r: any, i: number) => ({
    'STT': i + 1,
    'Họ tên nhân viên': r.employees?.full_name || '—',
    'Phòng ban': r.employees?.department || '—',
    'Tên khóa học': r.courses?.course_name || '—',
    'Thời gian làm bài': r.quiz_time_seconds != null ? `${Math.floor(r.quiz_time_seconds / 60)}p ${r.quiz_time_seconds % 60}s` : '—',
    'Điểm số': r.quiz_score != null ? r.quiz_score : '—',
    'Xếp loại': r.quiz_score != null ? (r.quiz_passed ? 'Đạt' : 'Không đạt') : 'Chưa làm',
    'Tiến độ video (%)': r.video_progress || 0,
    'Trạng thái': r.quiz_completed_at ? 'Hoàn thành' : 'Chưa làm',
  }));

  const ws = XLSX.utils.json_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 5 },  // STT
    { wch: 25 }, // Họ tên
    { wch: 15 }, // Phòng ban
    { wch: 30 }, // Khóa học
    { wch: 18 }, // Thời gian
    { wch: 10 }, // Điểm
    { wch: 15 }, // Xếp loại
    { wch: 18 }, // Tiến độ video
    { wch: 15 }, // Trạng thái
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo đào tạo');

  const filename = `bao-cao-dao-tao_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// Keep old CSV functions for backward compatibility
export async function exportTrainingReportCSV(): Promise<string> { return ''; }
export function downloadCSV(_csvContent: string, _filename: string) {}
