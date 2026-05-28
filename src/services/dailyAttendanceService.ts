/**
 * Daily Attendance Service
 *
 * Quy tắc:
 * - Mỗi user phải submit ít nhất 1 quiz mỗi ngày làm việc.
 * - Ngày làm việc = Thứ 2 → Thứ 7. Chủ nhật được nghỉ.
 * - Quiz submit chỉ tính nếu rơi vào khoảng 8h30 - 18h00 (giờ VN) của ngày đó.
 * - Miễn trừ: user đã hoàn thành tất cả khóa học được giao thì không bị tính quá hạn.
 *
 * Hàm chính:
 * - getYesterdayOverdueForUser(employeeId, department) — banner cho user.
 * - getOverdueEmployeesYesterday() — widget cho admin dashboard.
 */
import { supabase } from './supabaseClient';

const VN_UTC_OFFSET_HOURS = 7;

// Trả về { dateStr: 'YYYY-MM-DD', dayOfWeek: 0=Sun..6=Sat } của hôm qua theo giờ VN.
export function getYesterdayDateStrVN(): string {
  const nowVN = new Date(Date.now() + VN_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  nowVN.setUTCDate(nowVN.getUTCDate() - 1);
  const y = nowVN.getUTCFullYear();
  const m = String(nowVN.getUTCMonth() + 1).padStart(2, '0');
  const d = String(nowVN.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Chuyển 1 timestamp ISO (UTC) sang ngày VN dạng 'YYYY-MM-DD'.
// Dùng để so sánh trực tiếp với dateStr admin chọn — tránh sai số timezone math.
function isoToVNDateStr(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  const vn = new Date(ms + VN_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  return vn.toISOString().slice(0, 10);
}

// Day-of-week (0=Sun) cho 1 dateStr VN.
function vnDayOfWeek(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00.000Z`).getUTCDay();
}

// Kiểm tra user X có hoàn thành 1 course Y theo loại nội dung (slide/video/quiz)
function isCourseCompleted(progress: any, course: any): boolean {
  const hasVideo = Boolean(course?.video_url);
  const hasQuiz = Boolean(course?.quiz_id);
  if (!hasVideo && !hasQuiz) return progress?.status === 'completed';
  if (hasQuiz) return Boolean(progress?.quiz_completed_at);
  return (progress?.video_progress || 0) >= 100;
}

// Kiểm tra user đã hoàn thành TẤT CẢ khóa được giao chưa (theo phòng ban).
async function hasUserCompletedAllCourses(employeeId: string, department: string): Promise<boolean> {
  const [coursesRes, progressRes] = await Promise.all([
    supabase.from('courses').select('course_id, department, video_url, quiz_id, status').eq('status', 'active'),
    supabase.from('training_progress').select('course_id, status, quiz_completed_at, video_progress').eq('employee_id', employeeId),
  ]);
  const allCourses = coursesRes.data || [];
  const assigned = allCourses.filter((c: any) => !c.department || c.department === department);
  if (assigned.length === 0) return true; // không có khóa nào được giao → miễn trừ

  const progressMap = new Map<string, any>();
  for (const p of (progressRes.data || []) as any[]) {
    progressMap.set(p.course_id, p);
  }

  return assigned.every((c: any) => {
    const p = progressMap.get(c.course_id);
    return p ? isCourseCompleted(p, c) : false;
  });
}

export interface OverdueStatus {
  /** true nếu user quá hạn (vắng hôm qua) */
  overdue: boolean;
  /** Ngày bị vắng (YYYY-MM-DD theo giờ VN) — chỉ có giá trị khi overdue=true */
  missedDate?: string;
}

/**
 * Kiểm tra user có quá hạn (không submit quiz hôm qua trong khung 8h30-18h) hay không.
 * Trả về overdue=false nếu hôm qua là Chủ nhật hoặc user đã hoàn thành tất cả khóa.
 */
export async function getYesterdayOverdueForUser(
  employeeId: string,
  department: string,
): Promise<OverdueStatus> {
  if (!employeeId) return { overdue: false };

  const dateStr = getYesterdayDateStrVN();
  if (vnDayOfWeek(dateStr) === 0) return { overdue: false }; // Chủ nhật → bỏ qua

  // STRICT: chỉ tính khi user thực sự submit quiz (quiz_completed_at được set khi
  // saveQuizResult chạy). Bỏ qua updated_at vì nó cũng bị bump khi chỉ xem video.
  const { data, error } = await supabase
    .from('training_progress')
    .select('course_id, quiz_score, quiz_completed_at')
    .eq('employee_id', employeeId)
    .not('quiz_score', 'is', null);
  if (error) {
    console.error('getYesterdayOverdueForUser query error:', error);
    return { overdue: false };
  }
  const submittedOnDate = (data || []).some((r: any) => isoToVNDateStr(r.quiz_completed_at) === dateStr);
  if (submittedOnDate) return { overdue: false };

  // Không submit hôm qua → kiểm tra miễn trừ
  const exempt = await hasUserCompletedAllCourses(employeeId, department);
  if (exempt) return { overdue: false };

  return { overdue: true, missedDate: dateStr };
}

export interface OverdueEmployeeRow {
  employee_id: string;
  full_name: string;
  department: string;
  email: string;
  missedDate: string;
}

/**
 * Lấy danh sách nhân viên vắng làm bài 1 ngày bất kỳ. Dùng cho admin dashboard.
 * Bỏ qua Chủ nhật. Bỏ qua user đã hoàn thành tất cả khóa.
 *
 * @param dateStr Ngày kiểm tra, định dạng YYYY-MM-DD theo giờ VN. Mặc định = hôm qua.
 */
export async function getOverdueEmployeesForDate(dateStr?: string): Promise<OverdueEmployeeRow[]> {
  const targetDate = dateStr || getYesterdayDateStrVN();
  if (vnDayOfWeek(targetDate) === 0) return []; // Chủ nhật

  // 1. Tất cả nhân viên active
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, full_name, department, email, employment_status')
    .eq('employment_status', 'active');
  if (empErr || !employees) {
    console.error('getOverdueEmployees employees error:', empErr);
    return [];
  }

  // 2. STRICT: chỉ tính submit thực sự (quiz_score != null + quiz_completed_at trong ngày VN)
  const { data: allSubmits, error: subErr } = await supabase
    .from('training_progress')
    .select('employee_id, quiz_score, quiz_completed_at')
    .not('quiz_score', 'is', null);
  if (subErr) {
    console.error('getOverdueEmployees submits error:', subErr);
    return [];
  }
  const submittedIds = new Set<string>();
  for (const r of (allSubmits || []) as any[]) {
    if (isoToVNDateStr(r.quiz_completed_at) === targetDate) submittedIds.add(r.employee_id);
  }
  console.log(`[Overdue] === Debug cho ngày ${targetDate} ===`);
  console.log(`[Overdue] Tổng nhân viên active: ${employees.length}`);
  console.log(`[Overdue] Đã submit hôm đó: ${submittedIds.size}`);

  // 3. Candidates = active employees chưa submit hôm qua
  const candidates = employees.filter((e: any) => !submittedIds.has(e.id));
  if (candidates.length === 0) return [];

  // 4. Load all courses + all progress để check miễn trừ batch
  const [coursesRes, progressRes] = await Promise.all([
    supabase.from('courses').select('course_id, department, video_url, quiz_id, status').eq('status', 'active'),
    supabase.from('training_progress').select('employee_id, course_id, status, quiz_completed_at, video_progress'),
  ]);
  const allCourses = (coursesRes.data || []) as any[];
  const allProgress = (progressRes.data || []) as any[];

  // Group progress theo employee
  const progressByEmp = new Map<string, Map<string, any>>();
  for (const p of allProgress) {
    if (!progressByEmp.has(p.employee_id)) progressByEmp.set(p.employee_id, new Map());
    progressByEmp.get(p.employee_id)!.set(p.course_id, p);
  }

  const result: OverdueEmployeeRow[] = [];
  const skipped: { name: string; reason: string }[] = [];

  for (const emp of candidates as any[]) {
    const dept = emp.department || '';
    const assigned = allCourses.filter((c) => !c.department || c.department === dept);
    if (assigned.length === 0) {
      skipped.push({ name: emp.full_name, reason: `không có khóa nào thuộc dept="${dept}"` });
      continue;
    }

    const empProgress = progressByEmp.get(emp.id) || new Map<string, any>();
    const completedAll = assigned.every((c) => {
      const p = empProgress.get(c.course_id);
      return p ? isCourseCompleted(p, c) : false;
    });
    if (completedAll) {
      skipped.push({ name: emp.full_name, reason: `đã hoàn thành tất cả ${assigned.length} khóa` });
      continue;
    }

    result.push({
      employee_id: emp.id,
      full_name: emp.full_name || '—',
      department: emp.department || '—',
      email: emp.email || '',
      missedDate: targetDate,
    });
  }

  console.log(`[Overdue] Candidates (chưa submit): ${candidates.length}`);
  console.log(`[Overdue] Bị loại do miễn trừ: ${skipped.length}`, skipped);
  console.log(`[Overdue] Còn lại vào danh sách vắng: ${result.length}`);
  console.log(`[Overdue] ====================`);

  return result.sort((a, b) => a.department.localeCompare(b.department, 'vi') || a.full_name.localeCompare(b.full_name, 'vi'));
}

export interface OverdueDayGroup {
  date: string;                       // YYYY-MM-DD
  rows: OverdueEmployeeRow[];
}

/**
 * Default start date cho export "tất cả ngày" — 2026-05-20.
 * Thay đổi ở đây nếu cần điểm bắt đầu khác.
 */
export const DEFAULT_EXPORT_START_DATE = '2026-05-20';

/**
 * Lấy danh sách vắng làm bài cho từng ngày làm việc từ `startDateStr` đến hôm qua,
 * GROUP theo ngày để xuất ra Excel mỗi ngày 1 sheet.
 *
 * Lưu ý: miễn trừ dùng trạng thái HIỆN TẠI — user đã hoàn thành tất cả khóa
 * sẽ không xuất hiện cho BẤT KỲ ngày nào.
 */
export async function getOverdueEmployeesByDay(
  startDateStr: string = DEFAULT_EXPORT_START_DATE,
): Promise<OverdueDayGroup[]> {
  const endDateStr = getYesterdayDateStrVN();
  const startDate = new Date(`${startDateStr}T00:00:00.000Z`);
  const endDate = new Date(`${endDateStr}T00:00:00.000Z`);
  if (startDate > endDate) return [];

  // Load active employees + courses + progress
  const [empRes, coursesRes, progressRes] = await Promise.all([
    supabase.from('employees').select('id, full_name, department, email, employment_status').eq('employment_status', 'active'),
    supabase.from('courses').select('course_id, department, video_url, quiz_id, status').eq('status', 'active'),
    supabase.from('training_progress').select('employee_id, course_id, status, quiz_completed_at, updated_at, video_progress'),
  ]);
  const employees = (empRes.data || []) as any[];
  if (employees.length === 0) return [];
  const allCourses = (coursesRes.data || []) as any[];
  const allProgress = (progressRes.data || []) as any[];

  // Group progress theo employee
  const progressByEmp = new Map<string, Map<string, any>>();
  for (const p of allProgress) {
    if (!progressByEmp.has(p.employee_id)) progressByEmp.set(p.employee_id, new Map());
    progressByEmp.get(p.employee_id)!.set(p.course_id, p);
  }

  // Tính set exempt: user đã hoàn thành tất cả khóa được giao
  const exemptIds = new Set<string>();
  for (const emp of employees) {
    const dept = emp.department || '';
    const assigned = allCourses.filter((c) => !c.department || c.department === dept);
    if (assigned.length === 0) { exemptIds.add(emp.id); continue; }
    const empProgress = progressByEmp.get(emp.id) || new Map<string, any>();
    const completedAll = assigned.every((c) => {
      const p = empProgress.get(c.course_id);
      return p ? isCourseCompleted(p, c) : false;
    });
    if (completedAll) exemptIds.add(emp.id);
  }

  const candidates = employees.filter((e) => !exemptIds.has(e.id));
  const groups: OverdueDayGroup[] = [];

  // Iterate từng ngày làm việc
  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0) continue; // Chủ nhật

    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const dayStr = `${y}-${m}-${dd}`;

    // STRICT: chỉ tính submit thực sự (có quiz_score + quiz_completed_at == ngày VN)
    const submittedIds = new Set<string>();
    for (const p of allProgress) {
      if (p.quiz_score == null) continue;
      if (isoToVNDateStr(p.quiz_completed_at) === dayStr) submittedIds.add(p.employee_id);
    }

    const missedRows: OverdueEmployeeRow[] = [];
    for (const emp of candidates) {
      if (submittedIds.has(emp.id)) continue;
      missedRows.push({
        employee_id: emp.id,
        full_name: emp.full_name || '—',
        department: emp.department || '—',
        email: emp.email || '',
        missedDate: dayStr,
      });
    }
    missedRows.sort((a, b) =>
      a.department.localeCompare(b.department, 'vi') || a.full_name.localeCompare(b.full_name, 'vi')
    );

    groups.push({ date: dayStr, rows: missedRows });
  }

  return groups;
}

/**
 * Xuất tất cả ngày làm việc ra 1 file Excel, mỗi ngày là 1 sheet riêng.
 * Sheet name = ngày (YYYY-MM-DD). Sheet sẽ có thông báo nếu không ai vắng.
 */
export async function exportOverdueByDayExcel(groups: OverdueDayGroup[], startDateStr: string): Promise<void> {
  if (groups.length === 0) {
    alert('Không có ngày làm việc nào trong khoảng được chọn.');
    return;
  }
  const XLSX = await import('xlsx');
  const HEADERS = ['STT', 'Họ và tên', 'Phòng ban', 'Email', 'Ngày vắng'];
  const generatedAt = new Date().toLocaleString('vi-VN');
  const endDateStr = getYesterdayDateStrVN();
  const wb = XLSX.utils.book_new();

  for (const g of groups) {
    const dataRows = g.rows.map((r, i) => [i + 1, r.full_name, r.department, r.email, r.missedDate]);
    const isEmpty = dataRows.length === 0;

    const aoa: any[][] = [
      [`VẮNG LÀM BÀI — ${g.date}`],
      [`Tổng số: ${g.rows.length}`, '', '', '', `Xuất lúc: ${generatedAt}`],
      [],
      HEADERS,
      ...(isEmpty
        ? [['', 'Không có ai vắng trong ngày này', '', '', '']]
        : dataRows),
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 5 },   // STT
      { wch: 28 },  // Họ tên
      { wch: 18 },  // Phòng ban
      { wch: 32 },  // Email
      { wch: 14 },  // Ngày vắng
    ];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } }];
    ws['!freeze'] = { xSplit: 0, ySplit: 4 };

    if (!isEmpty) {
      const headerRowIdx = 3;
      const lastDataRow = headerRowIdx + dataRows.length;
      ws['!autofilter'] = {
        ref: XLSX.utils.encode_range({
          s: { r: headerRowIdx, c: 0 },
          e: { r: lastDataRow, c: HEADERS.length - 1 },
        }),
      };
    }

    // Style title + header row
    if (ws['A1']) {
      ws['A1'].s = { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } };
    }
    for (let c = 0; c < HEADERS.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: 3, c });
      if (ws[addr]) {
        ws[addr].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: 'EF4444' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
      }
    }

    // Sheet name = ngày (max 31 chars — 10 chars là dư)
    XLSX.utils.book_append_sheet(wb, ws, g.date);
  }

  XLSX.writeFile(wb, `vang-lam-bai_tu-${startDateStr}_den-${endDateStr}.xlsx`);
}

/**
 * Xuất danh sách nhân viên vắng làm bài 1 ngày ra file Excel (.xlsx).
 * Dùng cho nút "Xuất Excel" (ngày đang chọn). Auto download.
 */
export async function exportOverdueEmployeesExcel(
  rows: OverdueEmployeeRow[],
  dateStr: string,
): Promise<void> {
  const XLSX = await import('xlsx');

  const HEADERS = ['STT', 'Họ và tên', 'Phòng ban', 'Email', 'Ngày vắng'];
  const dataRows = rows.map((r, i) => [
    i + 1,
    r.full_name,
    r.department,
    r.email,
    r.missedDate,
  ]);

  const generatedAt = new Date().toLocaleString('vi-VN');
  const aoa: any[][] = [
    ['DANH SÁCH NHÂN VIÊN VẮNG LÀM BÀI'],
    [`Ngày kiểm tra: ${dateStr}`, '', '', `Tổng số: ${rows.length}`, `Xuất lúc: ${generatedAt}`],
    [],
    HEADERS,
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 5 },   // STT
    { wch: 28 },  // Họ tên
    { wch: 18 },  // Phòng ban
    { wch: 32 },  // Email
    { wch: 14 },  // Ngày vắng
  ];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } }];
  ws['!freeze'] = { xSplit: 0, ySplit: 4 };

  const headerRowIdx = 3;
  const lastDataRow = headerRowIdx + dataRows.length;
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIdx, c: 0 },
      e: { r: lastDataRow, c: HEADERS.length - 1 },
    }),
  };

  // Style title + header row
  const titleCell = ws['A1'];
  if (titleCell) {
    titleCell.s = { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } };
  }
  for (let c = 0; c < HEADERS.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    if (ws[addr]) {
      ws[addr].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: 'EF4444' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Vắng ${dateStr}`.slice(0, 31));
  XLSX.writeFile(wb, `vang-lam-bai_${dateStr}.xlsx`);
}
