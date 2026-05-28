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

// ── Mark slide-only course as viewed/completed ──────────────────────────
export async function markSlideViewed(employeeId: string, courseId: string) {
  try {
    await supabase
      .from('training_progress')
      .upsert({
        employee_id: employeeId,
        course_id: courseId,
        video_progress: 100,
        status: 'completed',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'employee_id,course_id' });
  } catch (e) {
    console.error('Error marking slide as viewed:', e);
  }
}

// ── Save quiz result ────────────────────────────────────────────────────
export async function saveQuizResult(
  employeeId: string,
  courseId: string,
  score: number,
  timeSeconds: number,
  passed: boolean,
  answers?: Record<string, number>,
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
        quiz_answers: answers ?? null,
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
        courses!fk_course(course_name, brand, category, video_url, quiz_id)
      `)
      .order('updated_at', { ascending: false });

    if (!error && data && data.length > 0) return data;

    // Fallback: manual join
    console.warn('Join query failed or empty, using manual join:', error?.message);
    const [progressRes, empRes, courseRes] = await Promise.all([
      supabase.from('training_progress').select('*').order('updated_at', { ascending: false }),
      supabase.from('employees').select('id, full_name, department, email'),
      supabase.from('courses').select('course_id, course_name, brand, category, video_url, quiz_id'),
    ]);

    const empMap = new Map((empRes.data || []).map((e: any) => [e.id, e]));
    const courseMap = new Map((courseRes.data || []).map((c: any) => [c.course_id, c]));

    return (progressRes.data || []).map((p: any) => ({
      ...p,
      employees: empMap.get(p.employee_id) || { full_name: '—', department: '—', email: '' },
      courses: courseMap.get(p.course_id) || { course_name: '—', brand: '', category: '', video_url: '', quiz_id: '' },
    }));
  } catch (e) {
    console.error('Error:', e);
    return [];
  }
}

// ── Admin: Dashboard aggregate stats ────────────────────────────────────
export async function getAdminStats(department?: string) {
  try {
    // If department filter is specified (for managers), filter by department
    if (department) {
      const [employeesRes, coursesRes, progressRes] = await Promise.all([
        supabase.from('employees').select('id').eq('employment_status', 'active').eq('department', department),
        supabase.from('courses').select('course_id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('training_progress').select(`
          *,
          employees!fk_employee(department)
        `),
      ]);

      const deptEmployeeIds = new Set((employeesRes.data || []).map((e: any) => e.id));
      const employeeCount = deptEmployeeIds.size;
      const courseCount = coursesRes.count || 0;

      // Only count progress records from this department's employees
      const deptProgress = (progressRes.data || []).filter((p: any) => p.employees?.department === department);
      const completedCount = deptProgress.filter((p: any) => p.quiz_passed === true).length;
      const failedCount = deptProgress.filter((p: any) => p.quiz_score != null && !p.quiz_passed).length;
      const totalExpected = employeeCount * courseCount;
      const completionRate = totalExpected > 0 ? Math.round((completedCount / totalExpected) * 100 * 10) / 10 : 0;

      return { employeeCount, courseCount, completionRate, failedCount };
    }

    // Admin: full company stats
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
        quiz_passed, quiz_score, quiz_completed_at, video_progress, status,
        employees!fk_employee(department),
        courses!fk_course(video_url, quiz_id)
      `);

    if (!data || data.length === 0) return [];

    const deptMap: Record<string, { total: number; completed: number; scores: number[] }> = {};

    for (const row of data as any[]) {
      const dept = row.employees?.department || 'Khác';
      const hasVideo = Boolean(row.courses?.video_url);
      const hasQuiz = Boolean(row.courses?.quiz_id);
      const isSlideOnly = !hasVideo && !hasQuiz;

      // Định nghĩa "đã hoàn thành" theo loại nội dung khóa
      let isDone = false;
      if (isSlideOnly) {
        isDone = row.status === 'completed';
      } else if (hasQuiz) {
        // Có quiz: hoàn thành khi đã nộp quiz (kể cả không đạt) — khớp logic hiện tại
        isDone = Boolean(row.quiz_completed_at);
      } else {
        // Video-only: hoàn thành khi xem hết video
        isDone = (row.video_progress || 0) >= 100;
      }

      if (!deptMap[dept]) deptMap[dept] = { total: 0, completed: 0, scores: [] };
      deptMap[dept].total++;
      if (isDone) deptMap[dept].completed++;
      if (row.quiz_score != null) deptMap[dept].scores.push(row.quiz_score);
    }

    return Object.entries(deptMap)
      .map(([name, d]) => ({
        name,
        hoanthanh: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
        hieusuat: d.scores.length > 0 ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  } catch (e) {
    console.error('Lỗi getDepartmentStats:', e);
    return [];
  }
}

// ── Monthly stats: số bản ghi đã hoàn thành mỗi tháng (12 tháng gần nhất) ─
export interface MonthlyStat {
  month: string;        // 'T05/2026'
  completed: number;    // Số (employee × course) hoàn thành tháng đó
  total: number;        // Số bản ghi training_progress được cập nhật tháng đó
  rate: number;         // % completed/total
  growthRate: number;   // % tăng trưởng vs tháng trước (tính sau)
}

export async function getMonthlyStats(months = 12, department?: string): Promise<MonthlyStat[]> {
  try {
    const { data } = await supabase
      .from('training_progress')
      .select(`
        quiz_completed_at, status, video_progress, updated_at,
        employees!fk_employee(department),
        courses!fk_course(video_url, quiz_id)
      `);
    if (!data) return [];

    const now = new Date();
    const buckets: Record<string, { total: number; completed: number }> = {};
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      buckets[key] = { total: 0, completed: 0 };
    }

    for (const row of data as any[]) {
      // Filter by department if specified (for managers)
      if (department && row.employees?.department !== department) continue;

      const ts = row.quiz_completed_at || row.updated_at;
      if (!ts) continue;
      const d = new Date(ts);
      const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      if (!(key in buckets)) continue;

      const hasVideo = Boolean(row.courses?.video_url);
      const hasQuiz = Boolean(row.courses?.quiz_id);
      const isSlideOnly = !hasVideo && !hasQuiz;
      let isDone = false;
      if (isSlideOnly) isDone = row.status === 'completed';
      else if (hasQuiz) isDone = Boolean(row.quiz_completed_at);
      else isDone = (row.video_progress || 0) >= 100;

      buckets[key].total++;
      if (isDone) buckets[key].completed++;
    }

    const result: MonthlyStat[] = Object.entries(buckets)
      .map(([month, b]) => ({
        month: `T${month}`,
        completed: b.completed,
        total: b.total,
        rate: b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0,
        growthRate: 0,
      }))
      .sort((a, b) => {
        // Sort theo time tăng dần (T01/2025 → T05/2026)
        const [ma, ya] = a.month.replace('T', '').split('/');
        const [mb, yb] = b.month.replace('T', '').split('/');
        return new Date(+ya, +ma - 1).getTime() - new Date(+yb, +mb - 1).getTime();
      });

    // Tính growth rate so với tháng trước
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1].rate;
      const cur = result[i].rate;
      result[i].growthRate = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0;
    }
    return result;
  } catch (e) {
    console.error('getMonthlyStats error:', e);
    return [];
  }
}

// ── Overall completion rate ─────────────────────────────────────────────
export async function getOverallCompletionRate(department?: string): Promise<{ rate: number; growthRate: number }> {
  try {
    const monthly = await getMonthlyStats(2, department);
    if (monthly.length < 2) return { rate: monthly[0]?.rate || 0, growthRate: 0 };
    return { rate: monthly[monthly.length - 1].rate, growthRate: monthly[monthly.length - 1].growthRate };
  } catch {
    return { rate: 0, growthRate: 0 };
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

  buildAndDownloadExcel(XLSX, rows, 'bao-cao-dao-tao');
}

// ── Export filtered data: xuất Excel theo kết quả tìm kiếm/lọc ─────────
export type ReportFilterGrade = 'all' | 'pass' | 'fail' | 'pending';
export interface ExportContext {
  filterGrade: ReportFilterGrade;
  searchQuery: string;
}

const FILTER_LABEL: Record<ReportFilterGrade, string> = {
  all: 'Tất cả',
  pass: 'Đạt',
  fail: 'Không đạt',
  pending: 'Chưa làm',
};

const FILTER_SLUG: Record<ReportFilterGrade, string> = {
  all: 'tat-ca',
  pass: 'dat',
  fail: 'khong-dat',
  pending: 'chua-lam',
};

export async function exportFilteredReportExcel(filteredRows: any[], ctx?: ExportContext) {
  const XLSX = await import('xlsx');
  const filterGrade = ctx?.filterGrade ?? 'all';
  const searchQuery = (ctx?.searchQuery ?? '').trim();
  const prefix = `bao-cao-${FILTER_SLUG[filterGrade]}`;
  buildAndDownloadExcel(XLSX, filteredRows, prefix, { filterGrade, searchQuery });
}

function formatDateTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  const date = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${hours}:${minutes}:${seconds} ${date}/${month}/${year}`;
}

function formatDateOnly(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${date}/${month}/${year}`;
}

// ── Shared: build worksheet and download ────────────────────────────────
function buildAndDownloadExcel(
  XLSX: any,
  rows: any[],
  filenamePrefix: string,
  ctx?: ExportContext,
) {
  const filterGrade = ctx?.filterGrade ?? 'all';
  const searchQuery = (ctx?.searchQuery ?? '').trim();
  const filterLabel = FILTER_LABEL[filterGrade];

  const HEADERS = [
    'STT',
    'Họ tên nhân viên',
    'Phòng ban',
    'Email',
    'Tên khóa học',
    'Thời gian làm bài',
    'Điểm số',
    'Xếp loại',
    'Tiến độ video (%)',
    'Ngày hoàn thành',
    'Trạng thái',
  ];

  const dataRows = rows.map((r: any, i: number) => {
    const hasVideo = Boolean(r.courses?.video_url);
    const hasQuiz = Boolean(r.courses?.quiz_id);
    const isSlideOnly = !hasVideo && !hasQuiz;
    const videoProg = r.video_progress || 0;

    let statusText: string;
    if (isSlideOnly) {
      statusText = r.status === 'completed' ? 'Đã xem' : 'Chưa xem';
    } else if (hasVideo && !hasQuiz) {
      statusText = videoProg >= 100 ? 'Hoàn thành' : (videoProg > 0 ? 'Đang học' : 'Chưa bắt đầu');
    } else {
      statusText = r.quiz_completed_at ? 'Hoàn thành' : (videoProg > 0 ? 'Đang học' : 'Chưa bắt đầu');
    }

    return [
      i + 1,
      r.employees?.full_name || '—',
      r.employees?.department || '—',
      r.employees?.email || '—',
      r.courses?.course_name || '—',
      !hasQuiz ? '—' : (r.quiz_time_seconds != null ? `${Math.floor(r.quiz_time_seconds / 60)}p ${r.quiz_time_seconds % 60}s` : '—'),
      !hasQuiz ? '—' : (r.quiz_score != null ? r.quiz_score : '—'),
      !hasQuiz ? '—' : (r.quiz_score != null ? (r.quiz_passed ? 'Đạt' : 'Không đạt') : 'Chưa làm'),
      !hasVideo ? '—' : videoProg,
      r.quiz_completed_at
        ? formatDateOnly(r.quiz_completed_at)
        : (isSlideOnly && r.status === 'completed' && r.updated_at
          ? formatDateOnly(r.updated_at)
          : '—'),
      statusText,
    ];
  });

  const generatedAt = new Date().toLocaleString('vi-VN');

  // Build sheet rows: title → meta → blank → table header → data
  const aoa: any[][] = [
    ['BÁO CÁO KẾT QUẢ HỌC TẬP'],
    [`Bộ lọc: ${filterLabel}`, '', '', `Từ khoá: ${searchQuery || '(không)'}`, '', '', `Tổng số bản ghi: ${rows.length}`, '', '', `Xuất lúc: ${generatedAt}`],
    [],
    HEADERS,
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws['!cols'] = [
    { wch: 5 },   // STT
    { wch: 28 },  // Họ tên
    { wch: 18 },  // Phòng ban
    { wch: 28 },  // Email
    { wch: 36 },  // Khóa học
    { wch: 16 },  // Thời gian
    { wch: 10 },  // Điểm
    { wch: 14 },  // Xếp loại
    { wch: 18 },  // Tiến độ video
    { wch: 20 },  // Ngày hoàn thành
    { wch: 16 },  // Trạng thái
  ];

  // Merge title row across all columns
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } },
  ];

  // Freeze header row (row index 4 = below table header)
  ws['!freeze'] = { xSplit: 0, ySplit: 4 };

  // Auto-filter on table header + data range
  const headerRowIdx = 3; // 0-based: title(0), meta(1), blank(2), header(3)
  const lastDataRow = headerRowIdx + dataRows.length;
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIdx, c: 0 },
      e: { r: lastDataRow, c: HEADERS.length - 1 },
    }),
  };

  // Style title and headers (xlsx community build supports basic styles via cellStyles option in some viewers)
  const titleCell = ws['A1'];
  if (titleCell) {
    titleCell.s = { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } };
  }
  for (let c = 0; c < HEADERS.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    if (ws[addr]) {
      ws[addr].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '10B981' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
  }

  const wb = XLSX.utils.book_new();
  const sheetName = `Báo cáo - ${filterLabel}`.slice(0, 31); // Excel sheet name max 31 chars
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const dateSlug = new Date().toISOString().slice(0, 10);
  const searchSlug = searchQuery ? `_${searchQuery.toLowerCase().replace(/[^a-z0-9]+/gi, '-').slice(0, 30)}` : '';
  const filename = `${filenamePrefix}${searchSlug}_${dateSlug}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// Keep old CSV functions for backward compatibility
export async function exportTrainingReportCSV(): Promise<string> { return ''; }
export function downloadCSV(_csvContent: string, _filename: string) {}
