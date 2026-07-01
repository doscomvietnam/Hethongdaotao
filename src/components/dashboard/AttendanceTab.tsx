import * as React from 'react';
import { ChevronLeft, ChevronRight, Sun, Building2 } from 'lucide-react';
import {
  getAttendanceEmployees,
  getHolidays,
  getAbsences,
  toggleHoliday,
  toggleAbsence,
  type AttendanceEmployee,
} from '../../services/attendanceService';

function getVNMonth(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 7);
}

function getDaysInMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function isSunday(yearMonth: string, day: number): boolean {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m - 1, day).getDay() === 0;
}

function dateStr(yearMonth: string, day: number): string {
  return `${yearMonth}-${String(day).padStart(2, '0')}`;
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

export function AttendanceTab() {
  const [month, setMonth] = React.useState(getVNMonth);
  const [employees, setEmployees] = React.useState<AttendanceEmployee[]>([]);
  const [holidays, setHolidays] = React.useState<Set<string>>(new Set());
  const [absences, setAbsences] = React.useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState<string | null>(null); // key đang save
  const [deptFilter, setDeptFilter] = React.useState('Tất cả');

  const days = getDaysInMonth(month);
  const dayNumbers = Array.from({ length: days }, (_, i) => i + 1);

  const departments = React.useMemo(() => {
    const depts = [...new Set(employees.map(e => e.department))].sort((a, b) => a.localeCompare(b, 'vi'));
    return ['Tất cả', ...depts];
  }, [employees]);

  const filtered = React.useMemo(() =>
    deptFilter === 'Tất cả' ? employees : employees.filter(e => e.department === deptFilter),
    [employees, deptFilter]
  );

  const loadData = React.useCallback(async (ym: string) => {
    setLoading(true);
    try {
      const [emps, hols, abs] = await Promise.all([
        getAttendanceEmployees(),
        getHolidays(ym),
        getAbsences(ym),
      ]);
      setEmployees(emps);
      setHolidays(hols);
      setAbsences(abs);
    } catch (e) {
      console.error('Attendance load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadData(month); }, [month, loadData]);

  const handleToggleHoliday = async (day: number) => {
    const key = `holiday-${day}`;
    if (saving === key) return;
    setSaving(key);
    try {
      const date = dateStr(month, day);
      const added = await toggleHoliday(date);
      setHolidays(prev => {
        const next = new Set(prev);
        added ? next.add(date) : next.delete(date);
        return next;
      });
    } finally {
      setSaving(null);
    }
  };

  const handleToggleAbsence = async (empId: string, day: number) => {
    const key = `${empId}-${day}`;
    if (saving === key) return;
    setSaving(key);
    try {
      const date = dateStr(month, day);
      const added = await toggleAbsence(empId, date);
      setAbsences(prev => {
        const next = new Map(prev);
        if (!next.has(empId)) next.set(empId, new Set());
        const set = new Set(next.get(empId)!);
        added ? set.add(date) : set.delete(date);
        next.set(empId, set);
        return next;
      });
    } finally {
      setSaving(null);
    }
  };

  const [mY, mM] = month.split('-');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Điểm Danh Nhân Viên</h2>
          <p className="text-[11px] text-zinc-500 font-bold mt-0.5">
            Click ô ngày để đánh dấu nghỉ · Click hàng lễ để đánh dấu toàn công ty nghỉ
          </p>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth(prevMonth(month))} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-black text-sm min-w-[120px] text-center">
            Tháng {mM}/{mY}
          </span>
          <button onClick={() => setMonth(nextMonth(month))} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Department filter */}
      <div className="flex gap-2 flex-wrap">
        {departments.map(d => (
          <button key={d} onClick={() => setDeptFilter(d)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all border ${
              deptFilter === d
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
            }`}>
            {d}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-[10px] font-bold text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-zinc-800 inline-block"/><Sun className="w-3 h-3 text-zinc-600"/>Chủ nhật</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-500/30 inline-block"/>Ngày lễ</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/30 inline-block"/>Nghỉ</span>
      </div>

      {loading ? (
        <div className="text-center py-16 text-zinc-600 font-bold text-sm">Đang tải...</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 attendance-scroll">
          <table className="min-w-max text-xs border-collapse">
            <thead>
              {/* Holiday row — click để toggle ngày lễ */}
              <tr className="border-b border-zinc-800">
                <th className="sticky left-0 z-10 bg-zinc-950 px-4 py-2 text-left min-w-[180px] border-r border-zinc-800">
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <Building2 className="w-3 h-3"/>
                    <span className="text-[10px] font-black uppercase tracking-widest">Nhân viên</span>
                  </div>
                </th>
                {dayNumbers.map(d => {
                  const sunday = isSunday(month, d);
                  const date = dateStr(month, d);
                  const isHol = holidays.has(date);
                  return (
                    <th key={d}
                      onClick={() => !sunday && handleToggleHoliday(d)}
                      className={`w-8 min-w-[32px] py-1.5 text-center font-black border-r border-zinc-900 last:border-r-0 select-none transition-colors ${
                        sunday
                          ? 'bg-zinc-900 text-zinc-700 cursor-default'
                          : isHol
                            ? 'bg-orange-500/25 text-orange-300 cursor-pointer hover:bg-orange-500/35'
                            : 'bg-zinc-950 text-zinc-500 cursor-pointer hover:bg-orange-500/10 hover:text-orange-400'
                      }`}>
                      <div>{d}</div>
                      {sunday && <Sun className="w-2.5 h-2.5 mx-auto text-zinc-700 mt-0.5"/>}
                      {isHol && <span className="text-[8px] text-orange-400 block leading-none">Lễ</span>}
                    </th>
                  );
                })}
                <th className="px-3 py-2 text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest min-w-[80px]">
                  Tổng nghỉ
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, idx) => {
                const empAbsences = absences.get(emp.id) ?? new Set<string>();
                const totalAbsent = empAbsences.size;
                return (
                  <tr key={emp.id} className={`border-b border-zinc-900 last:border-b-0 ${idx % 2 === 0 ? 'bg-zinc-950' : 'bg-[#0C0C0E]'} hover:bg-zinc-900/40 transition-colors`}>
                    {/* Tên */}
                    <td className={`sticky left-0 z-10 px-4 py-2 border-r border-zinc-800 ${idx % 2 === 0 ? 'bg-zinc-950' : 'bg-[#0C0C0E]'}`}>
                      <div className="font-bold text-zinc-200 truncate max-w-[160px]">{emp.fullName}</div>
                      <div className="text-[9px] text-zinc-600 font-bold truncate">{emp.department}</div>
                    </td>

                    {/* Ngày */}
                    {dayNumbers.map(d => {
                      const sunday = isSunday(month, d);
                      const date = dateStr(month, d);
                      const isHol = holidays.has(date);
                      const isAbsent = empAbsences.has(date);
                      const key = `${emp.id}-${d}`;
                      const isSaving = saving === key;

                      return (
                        <td key={d}
                          onClick={() => !sunday && !isHol && handleToggleAbsence(emp.id, d)}
                          className={`border-r border-zinc-900 last:border-r-0 text-center transition-colors select-none ${
                            sunday
                              ? 'bg-zinc-900/60 cursor-default'
                              : isHol
                                ? 'bg-orange-500/10 cursor-default'
                                : isAbsent
                                  ? 'bg-red-500/25 cursor-pointer hover:bg-red-500/35'
                                  : 'cursor-pointer hover:bg-red-500/10'
                          }`}>
                          {isSaving ? (
                            <span className="text-zinc-600">·</span>
                          ) : isAbsent ? (
                            <span className="text-red-400 font-black text-[10px]">N</span>
                          ) : isHol ? (
                            <span className="text-orange-400/50 text-[10px]">—</span>
                          ) : sunday ? (
                            <span className="text-zinc-800 text-[10px]">·</span>
                          ) : null}
                        </td>
                      );
                    })}

                    {/* Tổng nghỉ */}
                    <td className="px-3 py-2 text-center">
                      {totalAbsent > 0 ? (
                        <span className="text-red-400 font-black text-[11px]">{totalAbsent} ngày</span>
                      ) : (
                        <span className="text-zinc-700 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
