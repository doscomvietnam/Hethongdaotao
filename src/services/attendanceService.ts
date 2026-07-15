import { supabase } from './supabaseClient';

const VN_OFFSET_MS = 7 * 3600 * 1000;

function isoToVNDateLocal(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** Lấy tất cả ngày nhân viên đã nộp bài (quiz khóa học + bài kiểm tra hằng ngày) trong 1 tháng */
export async function getQuizSubmissionsForMonth(
  yearMonth: string,
): Promise<Map<string, Set<string>>> {
  const [trainingRes, dailyRes] = await Promise.all([
    supabase
      .from('training_progress')
      .select('employee_id, quiz_completed_at')
      .not('quiz_score', 'is', null)
      .not('quiz_completed_at', 'is', null),
    supabase
      .from('daily_tests')
      .select('employee_id, test_date')
      .gte('test_date', `${yearMonth}-01`)
      .lte('test_date', `${yearMonth}-31`)
      .eq('status', 'submitted'),
  ]);

  const map = new Map<string, Set<string>>();
  const add = (empId: string, date: string) => {
    if (!map.has(empId)) map.set(empId, new Set());
    map.get(empId)!.add(date);
  };

  for (const r of (trainingRes.data || []) as any[]) {
    const vnDate = isoToVNDateLocal(r.quiz_completed_at);
    if (vnDate?.startsWith(yearMonth)) add(r.employee_id, vnDate);
  }
  for (const r of (dailyRes.data || []) as any[]) {
    if ((r.test_date as string)?.startsWith(yearMonth)) add(r.employee_id, r.test_date);
  }

  return map;
}

export interface AttendanceEmployee {
  id: string;
  fullName: string;
  department: string;
}

// Lấy nhân viên active, trừ người có skip_daily_quiz = true (chủ tịch, v.v.)
export async function getAttendanceEmployees(): Promise<AttendanceEmployee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, full_name, department, skip_daily_quiz')
    .eq('employment_status', 'active')
    .order('department')
    .order('full_name');
  if (error) throw error;
  return (data || [])
    .filter((e: any) => !e.skip_daily_quiz && (e.department || '').toLowerCase().trim() !== 'chủ tịch')
    .map((e: any) => ({
      id: e.id,
      fullName: e.full_name || '—',
      department: e.department || '—',
    }));
}

// Lấy ngày lễ trong tháng (YYYY-MM)
export async function getHolidays(yearMonth: string): Promise<Set<string>> {
  const from = `${yearMonth}-01`;
  const to   = `${yearMonth}-31`;
  const { data, error } = await supabase
    .from('company_holidays')
    .select('date')
    .gte('date', from)
    .lte('date', to);
  if (error) throw error;
  return new Set((data || []).map((r: any) => r.date as string));
}

// Toggle ngày lễ (thêm nếu chưa có, xóa nếu đã có)
export async function toggleHoliday(date: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('company_holidays')
    .select('id')
    .eq('date', date)
    .maybeSingle();

  if (existing) {
    await supabase.from('company_holidays').delete().eq('date', date);
    return false; // đã xóa
  } else {
    await supabase.from('company_holidays').insert({ date });
    return true; // đã thêm
  }
}

// Lấy nghỉ cá nhân trong tháng → Map<employee_id, Set<date>>
export async function getAbsences(yearMonth: string): Promise<Map<string, Set<string>>> {
  const from = `${yearMonth}-01`;
  const to   = `${yearMonth}-31`;
  const { data, error } = await supabase
    .from('employee_absences')
    .select('employee_id, date')
    .gte('date', from)
    .lte('date', to);
  if (error) throw error;
  const map = new Map<string, Set<string>>();
  for (const r of data || []) {
    if (!map.has(r.employee_id)) map.set(r.employee_id, new Set());
    map.get(r.employee_id)!.add(r.date as string);
  }
  return map;
}

// Toggle nghỉ cá nhân
export async function toggleAbsence(employeeId: string, date: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('employee_absences')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('date', date)
    .maybeSingle();

  if (existing) {
    await supabase.from('employee_absences').delete().eq('employee_id', employeeId).eq('date', date);
    return false;
  } else {
    await supabase.from('employee_absences').insert({ employee_id: employeeId, date });
    return true;
  }
}

// ── Tổng hợp theo năm ───────────────────────────────────────────────────────

export interface MonthStat {
  yearMonth: string;
  required: number;
  done: number;
  missed: number;
  absent: number;
}

export interface EmployeeYearlySummary {
  employee: AttendanceEmployee;
  months: MonthStat[];
  totalRequired: number;
  totalDone: number;
  totalMissed: number;
  totalAbsent: number;
}

/** Bulk-load toàn bộ dữ liệu 1 năm, tính ngày vắng theo tháng cho mỗi nhân viên */
export async function getYearlySummary(year: number, startMonth: number = 1): Promise<{
  months: string[];
  rows: EmployeeYearlySummary[];
}> {
  const todayVN = new Date(Date.now() + VN_OFFSET_MS).toISOString().slice(0, 10);
  const currentYM = todayVN.slice(0, 7);
  const maxMonth = currentYM.startsWith(`${year}`) ? parseInt(currentYM.slice(5, 7)) : 12;

  const months: string[] = [];
  for (let m = startMonth; m <= maxMonth; m++) {
    months.push(`${year}-${String(m).padStart(2, '0')}`);
  }

  const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`;
  const endDate   = `${year}-12-31`;

  const [empsRes, holsRes, absRes, trainingRes, dailyRes] = await Promise.all([
    supabase
      .from('employees')
      .select('id, full_name, department, skip_daily_quiz')
      .eq('employment_status', 'active')
      .order('department')
      .order('full_name'),
    supabase.from('company_holidays').select('date').gte('date', startDate).lte('date', endDate),
    supabase.from('employee_absences').select('employee_id, date').gte('date', startDate).lte('date', endDate),
    supabase
      .from('training_progress')
      .select('employee_id, quiz_completed_at')
      .not('quiz_score', 'is', null)
      .not('quiz_completed_at', 'is', null),
    supabase
      .from('daily_tests')
      .select('employee_id, test_date')
      .gte('test_date', startDate)
      .lte('test_date', todayVN)
      .eq('status', 'submitted'),
  ]);

  const employees = (empsRes.data || []).filter(
    (e: any) => !e.skip_daily_quiz && (e.department || '').toLowerCase().trim() !== 'chủ tịch',
  );

  const holidaySet = new Set<string>((holsRes.data || []).map((r: any) => r.date as string));

  const absMap = new Map<string, Set<string>>();
  for (const r of absRes.data || []) {
    if (!absMap.has(r.employee_id)) absMap.set(r.employee_id, new Set());
    absMap.get(r.employee_id)!.add(r.date as string);
  }

  const subMap = new Map<string, Set<string>>();
  const addSub = (empId: string, date: string) => {
    if (!subMap.has(empId)) subMap.set(empId, new Set());
    subMap.get(empId)!.add(date);
  };
  for (const r of (trainingRes.data || []) as any[]) {
    const vnDate = isoToVNDateLocal(r.quiz_completed_at);
    if (vnDate && vnDate >= startDate && vnDate <= todayVN) addSub(r.employee_id, vnDate);
  }
  for (const r of (dailyRes.data || []) as any[]) {
    addSub(r.employee_id, r.test_date as string);
  }

  const rows: EmployeeYearlySummary[] = employees.map((emp: any) => {
    let totalRequired = 0, totalDone = 0, totalMissed = 0, totalAbsent = 0;
    const monthStats: MonthStat[] = months.map(ym => {
      const [y, m] = ym.split('-').map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      let required = 0, done = 0, missed = 0, absent = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const date = `${ym}-${String(d).padStart(2, '0')}`;
        if (date > todayVN) continue;
        if (new Date(y, m - 1, d).getDay() === 0) continue; // Chủ nhật
        if (holidaySet.has(date)) continue;
        if (absMap.get(emp.id)?.has(date)) { absent++; continue; }
        required++;
        if (subMap.get(emp.id)?.has(date)) done++;
        else missed++;
      }
      totalRequired += required;
      totalDone     += done;
      totalMissed   += missed;
      totalAbsent   += absent;
      return { yearMonth: ym, required, done, missed, absent };
    });
    return {
      employee: { id: emp.id, fullName: emp.full_name || '—', department: emp.department || '—' },
      months: monthStats,
      totalRequired,
      totalDone,
      totalMissed,
      totalAbsent,
    };
  });

  return { months, rows };
}

export interface MonthlyQuizStat {
  done: number;
  missed: number;
  required: number;
  absent: number;
}

/** Bulk-load thống kê kiểm tra hằng ngày cho nhiều nhân viên trong 1 tháng */
export async function getEmployeesMonthlyQuizStats(
  employees: Array<{ id: string; start_date?: string | null }>,
  yearMonth: string,
): Promise<Map<string, MonthlyQuizStat>> {
  const employeeIds = employees.map(e => e.id);
  if (employeeIds.length === 0) return new Map();

  // Map empId → ngày vào làm (YYYY-MM-DD), chỉ tính ngày từ đó trở đi
  const startDateMap = new Map<string, string>();
  for (const e of employees) {
    if (e.start_date) startDateMap.set(e.id, e.start_date.slice(0, 10));
  }

  const todayVN = new Date(Date.now() + VN_OFFSET_MS).toISOString().slice(0, 10);
  const currentYM = todayVN.slice(0, 7);
  const [y, m] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const from = `${yearMonth}-01`;
  const ceiling = yearMonth === currentYM ? todayVN : `${yearMonth}-${String(daysInMonth).padStart(2, '0')}`;

  const [holsRes, absRes, trainingRes, dailyRes] = await Promise.all([
    supabase.from('company_holidays').select('date').gte('date', from).lte('date', ceiling),
    supabase.from('employee_absences').select('employee_id, date').in('employee_id', employeeIds).gte('date', from).lte('date', ceiling),
    supabase.from('training_progress').select('employee_id, quiz_completed_at').not('quiz_score', 'is', null).not('quiz_completed_at', 'is', null).in('employee_id', employeeIds),
    supabase.from('daily_tests').select('employee_id, test_date').gte('test_date', from).lte('test_date', ceiling).eq('status', 'submitted').in('employee_id', employeeIds),
  ]);

  const holidaySet = new Set<string>((holsRes.data || []).map((r: any) => r.date as string));

  const absMap = new Map<string, Set<string>>();
  for (const r of absRes.data || []) {
    if (!absMap.has(r.employee_id)) absMap.set(r.employee_id, new Set());
    absMap.get(r.employee_id)!.add(r.date as string);
  }

  const subMap = new Map<string, Set<string>>();
  for (const r of (trainingRes.data || []) as any[]) {
    const vnDate = isoToVNDateLocal(r.quiz_completed_at);
    if (vnDate && vnDate >= from && vnDate <= ceiling) {
      if (!subMap.has(r.employee_id)) subMap.set(r.employee_id, new Set());
      subMap.get(r.employee_id)!.add(vnDate);
    }
  }
  for (const r of (dailyRes.data || []) as any[]) {
    if (!subMap.has(r.employee_id)) subMap.set(r.employee_id, new Set());
    subMap.get(r.employee_id)!.add(r.test_date as string);
  }

  const result = new Map<string, MonthlyQuizStat>();
  for (const emp of employees) {
    const empId = emp.id;
    const empStartDate = startDateMap.get(empId); // YYYY-MM-DD hoặc undefined
    const empAbs = absMap.get(empId) || new Set<string>();
    const empSub = subMap.get(empId) || new Set<string>();
    let done = 0, missed = 0, required = 0, absent = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${yearMonth}-${String(d).padStart(2, '0')}`;
      if (date > ceiling) break;
      if (empStartDate && date < empStartDate) continue; // bỏ qua ngày trước khi vào làm
      if (new Date(y, m - 1, d).getDay() === 0) continue;
      if (holidaySet.has(date)) continue;
      if (empAbs.has(date)) { absent++; continue; }
      required++;
      if (empSub.has(date)) done++; else missed++;
    }
    result.set(empId, { done, missed, required, absent });
  }
  return result;
}

export type DayStatus = 'done' | 'missed' | 'absent' | 'holiday' | 'sunday' | 'future';

export interface DayEntry {
  date: string;
  day: number;
  status: DayStatus;
}

export interface MonthlyQuizCalendar {
  days: DayEntry[];
  stat: MonthlyQuizStat;
}

/** Lấy chi tiết từng ngày trong tháng cho 1 nhân viên */
export async function getEmployeeMonthlyQuizCalendar(
  employeeId: string,
  yearMonth: string,
): Promise<MonthlyQuizCalendar> {
  const todayVN = new Date(Date.now() + VN_OFFSET_MS).toISOString().slice(0, 10);
  const [y, m] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const from = `${yearMonth}-01`;
  const to = `${yearMonth}-${String(daysInMonth).padStart(2, '0')}`;

  const [holsRes, absRes, trainingRes, dailyRes] = await Promise.all([
    supabase.from('company_holidays').select('date').gte('date', from).lte('date', to),
    supabase.from('employee_absences').select('date').eq('employee_id', employeeId).gte('date', from).lte('date', to),
    supabase.from('training_progress').select('quiz_completed_at').not('quiz_score', 'is', null).not('quiz_completed_at', 'is', null).eq('employee_id', employeeId),
    supabase.from('daily_tests').select('test_date').gte('test_date', from).lte('test_date', to).eq('status', 'submitted').eq('employee_id', employeeId),
  ]);

  const holidaySet = new Set<string>((holsRes.data || []).map((r: any) => r.date as string));
  const absSet = new Set<string>((absRes.data || []).map((r: any) => r.date as string));

  const subSet = new Set<string>();
  for (const r of (trainingRes.data || []) as any[]) {
    const vnDate = isoToVNDateLocal(r.quiz_completed_at);
    if (vnDate && vnDate >= from && vnDate <= to) subSet.add(vnDate);
  }
  for (const r of (dailyRes.data || []) as any[]) {
    subSet.add(r.test_date as string);
  }

  const days: DayEntry[] = [];
  let done = 0, missed = 0, required = 0, absent = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${yearMonth}-${String(d).padStart(2, '0')}`;
    const isSunday = new Date(y, m - 1, d).getDay() === 0;
    let status: DayStatus;

    if (isSunday) {
      status = 'sunday';
    } else if (date > todayVN) {
      status = 'future';
    } else if (holidaySet.has(date)) {
      status = 'holiday';
    } else if (absSet.has(date)) {
      status = 'absent';
      absent++;
    } else {
      required++;
      if (subSet.has(date)) { status = 'done'; done++; }
      else { status = 'missed'; missed++; }
    }

    days.push({ date, day: d, status });
  }

  return { days, stat: { done, missed, required, absent } };
}

// Tính số ngày phải làm = ngày làm việc - ngày lễ - ngày nghỉ cá nhân
export function calcRequiredDays(
  yearMonth: string,
  upToDay: number | null,
  holidays: Set<string>,
  empAbsences: Set<string>,
): number {
  const [y, m] = yearMonth.split('-').map(Number);
  const last = upToDay ?? new Date(y, m, 0).getDate();
  let count = 0;
  for (let d = 1; d <= last; d++) {
    const dateStr = `${yearMonth}-${String(d).padStart(2, '0')}`;
    const isSunday = new Date(y, m - 1, d).getDay() === 0;
    if (!isSunday && !holidays.has(dateStr) && !empAbsences.has(dateStr)) count++;
  }
  return count;
}
