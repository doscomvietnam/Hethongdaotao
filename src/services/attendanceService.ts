import { supabase } from './supabaseClient';

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
