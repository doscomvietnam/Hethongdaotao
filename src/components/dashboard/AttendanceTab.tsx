import * as React from 'react';
import { ChevronLeft, ChevronRight, Sun, Building2, ClipboardList, Calendar, Download, BarChart2, Rocket } from 'lucide-react';
import {
  getAttendanceEmployees,
  getHolidays,
  getAbsences,
  getQuizSubmissionsForMonth,
  getYearlySummary,
  toggleHoliday,
  toggleAbsence,
  type AttendanceEmployee,
  type EmployeeYearlySummary,
} from '../../services/attendanceService';
import {
  getNomaDailyProgress,
  NOMA_ROLLOUT_START_DATE,
  NOMA_ROLLOUT_DAILY_RATE,
  NOMA_ROLLOUT_COURSE_IDS,
  NOMA_ROLLOUT_DEPARTMENTS,
  type NomaDailyReport,
  type NomaDailyEmployee,
} from '../../services/nomaRolloutService';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getVNMonth(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 7);
}

function getVNYesterday(): string {
  const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
  nowVN.setUTCDate(nowVN.getUTCDate() - 1);
  return nowVN.toISOString().slice(0, 10);
}

function getVNToday(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function getDaysInMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function getDayOfWeek(yearMonth: string, day: number): number {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m - 1, day).getDay(); // 0=Sun … 6=Sat
}

function isSunday(yearMonth: string, day: number): boolean {
  return getDayOfWeek(yearMonth, day) === 0;
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

const DOW_LABEL = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// ── Cell logic for quiz results ───────────────────────────────────────────────

type CellType = 'sun' | 'hol' | 'abs' | 'done' | 'miss' | 'pending' | 'before_join';

function getCellType(
  yearMonth: string,
  day: number,
  emp: { id: string; startDate?: string | null },
  holidays: Set<string>,
  absences: Map<string, Set<string>>,
  submissions: Map<string, Set<string>>,
  yesterday: string,
): CellType {
  const date = dateStr(yearMonth, day);
  if (emp.startDate && date < emp.startDate) return 'before_join';
  if (isSunday(yearMonth, day)) return 'sun';
  if (holidays.has(date)) return 'hol';
  if (absences.get(emp.id)?.has(date)) return 'abs';
  if (date > yesterday) return 'pending';
  if (submissions.get(emp.id)?.has(date)) return 'done';
  return 'miss';
}

function calcEmployeeStats(
  emp: { id: string; startDate?: string | null },
  yearMonth: string,
  dayNumbers: number[],
  holidays: Set<string>,
  absences: Map<string, Set<string>>,
  submissions: Map<string, Set<string>>,
  yesterday: string,
): { required: number; done: number; missed: number; absent: number } {
  let required = 0, done = 0, missed = 0, absent = 0;
  for (const d of dayNumbers) {
    const t = getCellType(yearMonth, d, emp, holidays, absences, submissions, yesterday);
    if (t === 'sun' || t === 'hol' || t === 'pending' || t === 'before_join') continue;
    if (t === 'abs') { absent++; continue; }
    required++;
    if (t === 'done') done++;
    else missed++;
  }
  return { required, done, missed, absent };
}

// ── Excel export ─────────────────────────────────────────────────────────────

async function exportSalaryReport(
  yearMonth: string,
  employees: AttendanceEmployee[],
  dayNumbers: number[],
  holidays: Set<string>,
  absences: Map<string, Set<string>>,
  submissions: Map<string, Set<string>>,
  yesterday: string,
): Promise<void> {
  const XLSX = await import('xlsx');
  const [y, m] = yearMonth.split('-');
  const wb = XLSX.utils.book_new();
  const generatedAt = new Date().toLocaleString('vi-VN');

  // ─── Sheet 1: Tổng hợp ───────────────────────────────────────────────────
  const S1_HEADERS = ['STT', 'Họ và tên', 'Phòng ban', 'Ngày phải làm', 'Ngày làm bài', 'Ngày không làm bài'];
  const summaryRows = employees.map((emp, i) => {
    const { required, done, missed } = calcEmployeeStats(emp, yearMonth, dayNumbers, holidays, absences, submissions, yesterday);
    return [i + 1, emp.fullName, emp.department, required, done, missed];
  });
  const ws1 = XLSX.utils.aoa_to_sheet([
    [`BÁO CÁO ĐIỂM DANH LÀM BÀI — Tháng ${m}/${y}`],
    [`Xuất lúc: ${generatedAt}`, '', '', '', '', ''],
    [],
    S1_HEADERS,
    ...summaryRows,
  ]);
  ws1['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 12 }];
  ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: S1_HEADERS.length - 1 } }];
  for (let c = 0; c < S1_HEADERS.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 3, c });
    if (ws1[addr]) ws1[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1D4ED8' } },
      alignment: { horizontal: 'center' },
    };
  }
  for (let r = 4; r < 4 + summaryRows.length; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: 5 });
    if (ws1[addr]?.v > 0) ws1[addr].s = { font: { bold: true, color: { rgb: 'DC2626' } } };
  }
  XLSX.utils.book_append_sheet(wb, ws1, 'Tổng hợp');

  // ─── Sheet 2: Chi tiết ngày ───────────────────────────────────────────────
  const cellLabel = (t: CellType) =>
    ({ sun: 'CN', hol: 'Lễ', abs: 'Nghỉ', done: '✓', miss: 'X', pending: '·', before_join: '-' })[t];

  const S2_HEADERS = [
    'Họ và tên', 'Phòng ban',
    ...dayNumbers.map(d => `${d} (${DOW_LABEL[getDayOfWeek(yearMonth, d)]})`),
    'Tổng không làm bài',
  ];
  const detailRows = employees.map(emp => {
    const cells = dayNumbers.map(d =>
      cellLabel(getCellType(yearMonth, d, emp, holidays, absences, submissions, yesterday))
    );
    const { missed } = calcEmployeeStats(emp, yearMonth, dayNumbers, holidays, absences, submissions, yesterday);
    return [emp.fullName, emp.department, ...cells, missed];
  });
  const ws2 = XLSX.utils.aoa_to_sheet([
    [`CHI TIẾT LÀM BÀI — Tháng ${m}/${y}`],
    [],
    S2_HEADERS,
    ...detailRows,
  ]);
  ws2['!cols'] = [{ wch: 28 }, { wch: 18 }, ...dayNumbers.map(() => ({ wch: 6 })), { wch: 10 }];
  ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: S2_HEADERS.length - 1 } }];
  for (let c = 0; c < S2_HEADERS.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 2, c });
    if (ws2[addr]) ws2[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '374151' } },
      alignment: { horizontal: 'center' },
    };
  }
  XLSX.utils.book_append_sheet(wb, ws2, 'Chi tiết');

  XLSX.writeFile(wb, `diem-danh-lam-bai_${yearMonth}.xlsx`);
}

// ── Config View: Quản lý ngày nghỉ (giữ nguyên nội dung cũ) ─────────────────

function ConfigView({
  month, dayNumbers, employees, holidays, absences, saving, onToggleHoliday, onToggleAbsence, deptFilter,
}: {
  month: string;
  dayNumbers: number[];
  employees: AttendanceEmployee[];
  holidays: Set<string>;
  absences: Map<string, Set<string>>;
  saving: string | null;
  onToggleHoliday: (day: number) => void;
  onToggleAbsence: (empId: string, day: number) => void;
  deptFilter: string;
}) {
  const filtered = deptFilter === 'Tất cả' ? employees : employees.filter(e => e.department === deptFilter);

  return (
    <>
      <div className="flex gap-4 text-[10px] font-bold text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-zinc-800 inline-block" /><Sun className="w-3 h-3 text-zinc-600" />Chủ nhật</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-500/30 inline-block" />Ngày lễ</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/30 inline-block" />Nghỉ cá nhân</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800 attendance-scroll">
        <table className="min-w-max text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="sticky left-0 z-10 bg-zinc-950 px-4 py-2 text-left min-w-[180px] border-r border-zinc-800">
                <div className="flex items-center gap-1.5 text-zinc-600">
                  <Building2 className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Nhân viên</span>
                </div>
              </th>
              {dayNumbers.map(d => {
                const sunday = isSunday(month, d);
                const date = dateStr(month, d);
                const isHol = holidays.has(date);
                return (
                  <th key={d}
                    onClick={() => !sunday && onToggleHoliday(d)}
                    className={`w-8 min-w-[32px] py-1.5 text-center font-black border-r border-zinc-900 last:border-r-0 select-none transition-colors ${
                      sunday
                        ? 'bg-zinc-900 text-zinc-700 cursor-default'
                        : isHol
                          ? 'bg-orange-500/25 text-orange-300 cursor-pointer hover:bg-orange-500/35'
                          : 'bg-zinc-950 text-zinc-500 cursor-pointer hover:bg-orange-500/10 hover:text-orange-400'
                    }`}>
                    <div>{d}</div>
                    {sunday && <Sun className="w-2.5 h-2.5 mx-auto text-zinc-700 mt-0.5" />}
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
              return (
                <tr key={emp.id} className={`border-b border-zinc-900 last:border-b-0 ${idx % 2 === 0 ? 'bg-zinc-950' : 'bg-[#0C0C0E]'} hover:bg-zinc-900/40 transition-colors`}>
                  <td className={`sticky left-0 z-10 px-4 py-2 border-r border-zinc-800 ${idx % 2 === 0 ? 'bg-zinc-950' : 'bg-[#0C0C0E]'}`}>
                    <div className="font-bold text-zinc-200 truncate max-w-[160px]">{emp.fullName}</div>
                    <div className="text-[9px] text-zinc-600 font-bold truncate">{emp.department}</div>
                  </td>
                  {dayNumbers.map(d => {
                    const sunday = isSunday(month, d);
                    const date = dateStr(month, d);
                    const isHol = holidays.has(date);
                    const isAbsent = empAbsences.has(date);
                    const key = `${emp.id}-${d}`;
                    const isSaving = saving === key;
                    return (
                      <td key={d}
                        onClick={() => !sunday && !isHol && onToggleAbsence(emp.id, d)}
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
                  <td className="px-3 py-2 text-center">
                    {empAbsences.size > 0 ? (
                      <span className="text-red-400 font-black text-[11px]">{empAbsences.size} ngày</span>
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
    </>
  );
}

// ── Results View: Kết quả làm bài ────────────────────────────────────────────

function ResultsView({
  month, dayNumbers, employees, holidays, absences, submissions, deptFilter, yesterday,
}: {
  month: string;
  dayNumbers: number[];
  employees: AttendanceEmployee[];
  holidays: Set<string>;
  absences: Map<string, Set<string>>;
  submissions: Map<string, Set<string>>;
  deptFilter: string;
  yesterday: string;
}) {
  const [exporting, setExporting] = React.useState(false);
  const todayStr = getVNToday();

  const filtered = deptFilter === 'Tất cả' ? employees : employees.filter(e => e.department === deptFilter);

  const CELL_CLS: Record<CellType, string> = {
    sun: 'bg-zinc-900/60',
    hol: 'bg-orange-500/10',
    abs: 'bg-violet-500/15',
    done: 'bg-emerald-500/10',
    miss: 'bg-red-500/20',
    pending: '',
    before_join: '',
  };

  const renderCell = (t: CellType) => {
    switch (t) {
      case 'sun':         return <span className="text-zinc-800 text-[9px]">·</span>;
      case 'hol':         return <span className="text-orange-400 font-black text-[9px]">L</span>;
      case 'abs':         return <span className="text-violet-400 font-black text-[9px]">N</span>;
      case 'done':        return <span className="text-emerald-400 font-black text-[11px]">✓</span>;
      case 'miss':        return <span className="text-red-400 font-black text-[10px]">X</span>;
      case 'pending':     return <span className="text-zinc-700 text-[9px]">·</span>;
      case 'before_join': return <span className="text-zinc-600 text-[9px]">-</span>;
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSalaryReport(month, employees, dayNumbers, holidays, absences, submissions, yesterday);
    } catch (e) {
      console.error('Export error:', e);
      alert('Lỗi xuất Excel');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      {/* Legend + Export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-3 flex-wrap text-[10px] font-bold text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/15 inline-block border border-emerald-500/20" />
            <span className="text-emerald-400">✓</span> Đã làm bài
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500/20 inline-block border border-red-500/20" />
            <span className="text-red-400">X</span> Không làm bài
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-violet-500/15 inline-block border border-violet-500/20" />
            <span className="text-violet-400">N</span> Nghỉ làm (không tính)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-500/10 inline-block border border-orange-500/20" />
            <span className="text-orange-400">L</span> Ngày lễ
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-zinc-900 inline-block" />CN / Chưa tính
          </span>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-black uppercase tracking-wide hover:bg-blue-500/25 transition-all disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-800 attendance-scroll">
        <table className="min-w-max text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="sticky left-0 z-10 bg-zinc-950 px-4 py-2 text-left min-w-[200px] border-r border-zinc-800">
                <div className="flex items-center gap-1.5 text-zinc-600">
                  <Building2 className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Nhân viên</span>
                </div>
              </th>
              {dayNumbers.map(d => {
                const dow = getDayOfWeek(month, d);
                const sunday = dow === 0;
                const date = dateStr(month, d);
                const isToday = date === todayStr;
                return (
                  <th key={d}
                    className={`w-8 min-w-[30px] py-1 text-center border-r border-zinc-900 last:border-r-0 ${
                      isToday
                        ? 'bg-blue-500/15 ring-1 ring-inset ring-blue-500/30'
                        : sunday
                          ? 'bg-zinc-900'
                          : 'bg-zinc-950'
                    }`}>
                    <div className={`font-black text-[10px] ${isToday ? 'text-blue-300' : sunday ? 'text-zinc-700' : 'text-zinc-500'}`}>
                      {d}
                    </div>
                    <div className={`text-[8px] font-bold ${
                      isToday ? 'text-blue-400' : sunday ? 'text-zinc-700' : dow === 6 ? 'text-blue-700' : 'text-zinc-700'
                    }`}>
                      {DOW_LABEL[dow]}
                    </div>
                  </th>
                );
              })}
              <th className="px-3 py-2 text-center text-violet-400/80 text-[10px] font-black uppercase tracking-widest min-w-[80px] border-l border-zinc-800">
                Ngày nghỉ
              </th>
              <th className="px-3 py-2 text-center text-red-500/80 text-[10px] font-black uppercase tracking-widest min-w-[90px] border-l border-zinc-800">
                Không làm bài
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp, idx) => {
              const { required, done, missed, absent } = calcEmployeeStats(emp, month, dayNumbers, holidays, absences, submissions, yesterday);
              const bg = idx % 2 === 0 ? 'bg-zinc-950' : 'bg-[#0C0C0E]';
              return (
                <tr key={emp.id} className={`border-b border-zinc-900 last:border-b-0 ${bg} hover:bg-zinc-900/30 transition-colors`}>
                  <td className={`sticky left-0 z-10 px-4 py-2 border-r border-zinc-800 ${bg}`}>
                    <div className="font-bold text-zinc-200 truncate max-w-[180px]">{emp.fullName}</div>
                    <div className="text-[9px] text-zinc-600 font-bold truncate">{emp.department}</div>
                  </td>
                  {dayNumbers.map(d => {
                    const t = getCellType(month, d, emp, holidays, absences, submissions, yesterday);
                    const date = dateStr(month, d);
                    const isToday = date === todayStr;
                    return (
                      <td key={d}
                        className={`border-r border-zinc-900 last:border-r-0 text-center ${CELL_CLS[t]} ${isToday ? 'ring-1 ring-inset ring-blue-500/20' : ''}`}>
                        {renderCell(t)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center border-l border-zinc-800">
                    {absent > 0
                      ? <span className="text-violet-400 font-black text-[12px]">{absent}</span>
                      : <span className="text-zinc-700 text-[10px]">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center border-l border-zinc-800">
                    {missed > 0 ? (
                      <div>
                        <span className="text-red-400 font-black text-[12px]">{missed}</span>
                        <span className="text-[9px] text-zinc-600 font-bold ml-1">/{required}</span>
                      </div>
                    ) : required > 0 ? (
                      <span className="text-emerald-500 font-black text-[11px]">✓</span>
                    ) : (
                      <span className="text-zinc-700 text-[10px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Summary footer row */}
            {filtered.length > 0 && (
              <tr className="border-t border-zinc-700 bg-zinc-900/50">
                <td className="sticky left-0 z-10 bg-zinc-900 px-4 py-2 border-r border-zinc-800">
                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Không làm bài / ngày</div>
                </td>
                {dayNumbers.map(d => {
                  const date = dateStr(month, d);
                  if (isSunday(month, d) || holidays.has(date) || date > yesterday) {
                    return <td key={d} className="border-r border-zinc-900 last:border-r-0 text-center bg-zinc-900/30" />;
                  }
                  const missCount = filtered.filter(emp => {
                    const t = getCellType(month, d, emp, holidays, absences, submissions, yesterday);
                    return t === 'miss';
                  }).length;
                  return (
                    <td key={d} className="border-r border-zinc-900 last:border-r-0 text-center">
                      {missCount > 0 ? (
                        <span className="text-red-400 font-black text-[10px]">{missCount}</span>
                      ) : (
                        <span className="text-emerald-600 text-[9px]">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center border-l border-zinc-800">
                  <span className="text-red-400 font-black text-[11px]">
                    {filtered.reduce((sum, emp) => {
                      const { missed } = calcEmployeeStats(emp, month, dayNumbers, holidays, absences, submissions, yesterday);
                      return sum + missed;
                    }, 0)}
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Summary View: Tổng hợp vắng theo tháng ──────────────────────────────────

function SummaryView({ deptFilter }: { deptFilter: string }) {
  const currentYear = new Date(Date.now() + 7 * 3600 * 1000).getFullYear();
  const [year, setYear] = React.useState(currentYear);
  const [data, setData] = React.useState<{ months: string[]; rows: EmployeeYearlySummary[] } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);

  const SYSTEM_START = { year: 2026, month: 7 };

  React.useEffect(() => {
    setLoading(true);
    const startMonth = year === SYSTEM_START.year ? SYSTEM_START.month : 1;
    getYearlySummary(year, startMonth)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  const filtered = React.useMemo(() => {
    if (!data) return [];
    return deptFilter === 'Tất cả'
      ? data.rows
      : data.rows.filter(r => r.employee.department === deptFilter);
  }, [data, deptFilter]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, EmployeeYearlySummary[]>();
    for (const r of filtered) {
      const d = r.employee.department;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(r);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'vi'));
  }, [filtered]);

  const months = data?.months ?? [];

  // Ô tháng: hiển thị "đã làm / phải làm", tô màu theo số ngày vắng
  const monthCell = (ms: { done: number; missed: number; required: number }) => {
    if (ms.required === 0) return <span className="text-zinc-700 text-[9px]">—</span>;
    const color = ms.missed === 0
      ? 'text-emerald-400'
      : ms.missed <= 2 ? 'text-amber-400' : 'text-red-400';
    return (
      <div className="flex flex-col items-center leading-tight">
        <span className={`font-black text-[11px] ${color}`}>{ms.done}/{ms.required}</span>
        {ms.missed > 0 && (
          <span className={`text-[8px] font-bold ${color} opacity-80`}>-{ms.missed}</span>
        )}
      </div>
    );
  };

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const monthLabels = months.map(ym => `T${parseInt(ym.slice(5, 7))}`);
      const HEADERS = ['Nhân viên', 'Phòng ban', ...monthLabels.flatMap(m => [`${m} Làm`, `${m} Không làm`]), 'Tổng làm', 'Tổng không làm bài', 'Phải làm'];
      const rows = filtered.map(r => [
        r.employee.fullName,
        r.employee.department,
        ...r.months.flatMap(m => [m.done, m.missed]),
        r.totalDone,
        r.totalMissed,
        r.totalRequired,
      ]);
      const ws = XLSX.utils.aoa_to_sheet([
        [`TỔNG HỢP ĐIỂM DANH — Năm ${year}`],
        [`Xuất lúc: ${new Date().toLocaleString('vi-VN')}`],
        [],
        HEADERS,
        ...rows,
      ]);
      ws['!cols'] = [{ wch: 28 }, { wch: 18 }, ...months.flatMap(() => [{ wch: 8 }, { wch: 8 }]), { wch: 10 }, { wch: 10 }, { wch: 10 }];
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } }];
      XLSX.utils.book_append_sheet(wb, ws, `Tổng hợp ${year}`);
      XLSX.writeFile(wb, `tong-hop-diem-danh_${year}.xlsx`);
    } catch (e) {
      console.error('Export error:', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(y => y - 1)}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-all">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-white font-black text-sm min-w-[70px] text-center">Năm {year}</span>
          <button onClick={() => setYear(y => y + 1)}
            disabled={year >= currentYear}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold">
          <span className="text-zinc-400">Ô tháng: <span className="text-white">đã làm / phải làm</span></span>
          <span className="flex items-center gap-1 text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 inline-block" />Đủ ngày</span>
          <span className="flex items-center gap-1 text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30 inline-block" />Không làm 1–2</span>
          <span className="flex items-center gap-1 text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/30 inline-block" />Không làm 3+</span>
        </div>
        <button onClick={handleExport} disabled={exporting || !data}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-black uppercase tracking-wide hover:bg-blue-500/25 transition-all disabled:opacity-40">
          <Download className="w-3.5 h-3.5" />
          {exporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-zinc-600 font-bold text-sm">Đang tải...</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 attendance-scroll">
          <table className="min-w-max text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950">
                <th className="sticky left-0 z-10 bg-zinc-950 px-4 py-3 text-left min-w-[200px] border-r border-zinc-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Nhân viên</span>
                </th>
                {months.map(ym => (
                  <th key={ym} className="w-[72px] min-w-[72px] py-2.5 text-center border-r border-zinc-800 last:border-r-0">
                    <div className="font-black text-zinc-300 text-[12px]">T{parseInt(ym.slice(5, 7))}</div>
                    <div className="text-[8px] text-zinc-600 font-bold mt-0.5">làm / phải</div>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center min-w-[72px] border-l-2 border-zinc-700 bg-emerald-950/20">
                  <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wide">Đã làm</div>
                  <div className="text-[8px] text-zinc-600 font-bold mt-0.5">ngày</div>
                </th>
                <th className="px-3 py-2.5 text-center min-w-[72px] border-l border-zinc-800 bg-red-950/20">
                  <div className="text-[10px] font-black text-red-400 uppercase tracking-wide">Không làm bài</div>
                  <div className="text-[8px] text-zinc-600 font-bold mt-0.5">ngày</div>
                </th>
                <th className="px-3 py-2.5 text-center min-w-[72px] border-l border-zinc-800 bg-violet-950/20">
                  <div className="text-[10px] font-black text-violet-400 uppercase tracking-wide">Ngày nghỉ</div>
                  <div className="text-[8px] text-zinc-600 font-bold mt-0.5">ngày</div>
                </th>
                <th className="px-3 py-2.5 text-center min-w-[72px] border-l border-zinc-800">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-wide">Phải làm</div>
                  <div className="text-[8px] text-zinc-600 font-bold mt-0.5">ngày</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(([dept, deptRows]) => (
                <React.Fragment key={dept}>
                  {/* Department header */}
                  <tr className="bg-zinc-900/70 border-b border-zinc-800">
                    <td colSpan={months.length + 5} className="sticky left-0 px-4 py-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{dept}</span>
                    </td>
                  </tr>
                  {deptRows.map((row, idx) => (
                    <tr key={row.employee.id}
                      className={`border-b border-zinc-900 ${idx % 2 === 0 ? 'bg-zinc-950' : 'bg-[#0C0C0E]'} hover:bg-zinc-900/40 transition-colors`}>
                      <td className={`sticky left-0 z-10 px-4 py-2.5 border-r border-zinc-800 ${idx % 2 === 0 ? 'bg-zinc-950' : 'bg-[#0C0C0E]'}`}>
                        <div className="font-bold text-zinc-200 truncate max-w-[180px]">{row.employee.fullName}</div>
                      </td>
                      {row.months.map(ms => (
                        <td key={ms.yearMonth} className={`border-r border-zinc-900 last:border-r-0 text-center py-2 px-1 ${
                          ms.required === 0 ? '' : ms.missed === 0 ? 'bg-emerald-950/10' : ms.missed <= 2 ? 'bg-amber-950/10' : 'bg-red-950/15'
                        }`}>
                          {monthCell(ms)}
                        </td>
                      ))}
                      {/* Đã làm */}
                      <td className="px-3 py-2.5 text-center border-l-2 border-zinc-700 bg-emerald-950/10">
                        <span className="font-black text-emerald-400 text-[12px]">{row.totalDone}</span>
                      </td>
                      {/* Không làm bài */}
                      <td className="px-3 py-2.5 text-center border-l border-zinc-800 bg-red-950/10">
                        {row.totalMissed > 0 ? (
                          <span className={`font-black text-[12px] ${row.totalMissed >= 5 ? 'text-red-400' : row.totalMissed >= 3 ? 'text-amber-400' : 'text-zinc-300'}`}>
                            {row.totalMissed}
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-black text-[12px]">0</span>
                        )}
                      </td>
                      {/* Ngày nghỉ */}
                      <td className="px-3 py-2.5 text-center border-l border-zinc-800 bg-violet-950/10">
                        {row.totalAbsent > 0
                          ? <span className="text-violet-400 font-black text-[12px]">{row.totalAbsent}</span>
                          : <span className="text-zinc-700 text-[10px]">—</span>}
                      </td>
                      {/* Phải làm */}
                      <td className="px-3 py-2.5 text-center border-l border-zinc-800">
                        <span className="text-zinc-500 text-[11px] font-bold">{row.totalRequired}</span>
                      </td>
                    </tr>
                  ))}
                  {/* Department subtotal */}
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <td className="sticky left-0 bg-zinc-900/50 px-4 py-2 border-r border-zinc-800">
                      <span className="text-[9px] font-black text-zinc-400 uppercase">Tổng {dept}</span>
                    </td>
                    {months.map((ym, mIdx) => {
                      const totalDone = deptRows.reduce((s, r) => s + (r.months[mIdx]?.done ?? 0), 0);
                      const totalReq = deptRows.reduce((s, r) => s + (r.months[mIdx]?.required ?? 0), 0);
                      const totalMiss = deptRows.reduce((s, r) => s + (r.months[mIdx]?.missed ?? 0), 0);
                      return (
                        <td key={ym} className="border-r border-zinc-900 text-center py-2 px-1">
                          {totalReq === 0 ? (
                            <span className="text-zinc-700 text-[9px]">—</span>
                          ) : (
                            <div className="flex flex-col items-center leading-tight">
                              <span className={`font-black text-[10px] ${totalMiss === 0 ? 'text-emerald-400' : totalMiss <= 3 ? 'text-amber-400' : 'text-red-400'}`}>
                                {totalDone}/{totalReq}
                              </span>
                              {totalMiss > 0 && <span className="text-red-400/70 text-[8px] font-bold">-{totalMiss}</span>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center border-l-2 border-zinc-700 bg-emerald-950/10">
                      <span className="text-emerald-400 font-black text-[11px]">
                        {deptRows.reduce((s, r) => s + r.totalDone, 0)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center border-l border-zinc-800 bg-red-950/10">
                      <span className="text-red-400 font-black text-[11px]">
                        {deptRows.reduce((s, r) => s + r.totalMissed, 0)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center border-l border-zinc-800 bg-violet-950/10">
                      <span className="text-violet-400 font-black text-[11px]">
                        {deptRows.reduce((s, r) => s + r.totalAbsent, 0)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center border-l border-zinc-800">
                      <span className="text-zinc-500 text-[10px] font-bold">
                        {deptRows.reduce((s, r) => s + r.totalRequired, 0)}
                      </span>
                    </td>
                  </tr>
                </React.Fragment>
              ))}

              {/* Grand total */}
              {filtered.length > 0 && (
                <tr className="border-t-2 border-zinc-600 bg-zinc-900/70">
                  <td className="sticky left-0 bg-zinc-900/70 px-4 py-2.5 border-r border-zinc-700">
                    <span className="text-[10px] font-black text-white uppercase tracking-wide">Toàn công ty</span>
                  </td>
                  {months.map((ym, mIdx) => {
                    const totalDone = filtered.reduce((s, r) => s + (r.months[mIdx]?.done ?? 0), 0);
                    const totalReq = filtered.reduce((s, r) => s + (r.months[mIdx]?.required ?? 0), 0);
                    const totalMiss = filtered.reduce((s, r) => s + (r.months[mIdx]?.missed ?? 0), 0);
                    return (
                      <td key={ym} className="border-r border-zinc-800 text-center py-2 px-1">
                        {totalReq === 0 ? (
                          <span className="text-zinc-700 text-[9px]">—</span>
                        ) : (
                          <div className="flex flex-col items-center leading-tight">
                            <span className={`font-black text-[11px] ${totalMiss === 0 ? 'text-emerald-400' : totalMiss <= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                              {totalDone}/{totalReq}
                            </span>
                            {totalMiss > 0 && <span className="text-red-400 text-[8px] font-bold">-{totalMiss}</span>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center border-l-2 border-zinc-600 bg-emerald-950/20">
                    <span className="text-emerald-400 font-black text-[13px]">
                      {filtered.reduce((s, r) => s + r.totalDone, 0)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center border-l border-zinc-700 bg-red-950/20">
                    <span className="text-red-400 font-black text-[13px]">
                      {filtered.reduce((s, r) => s + r.totalMissed, 0)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center border-l border-zinc-700 bg-violet-950/20">
                    <span className="text-violet-400 font-black text-[13px]">
                      {filtered.reduce((s, r) => s + r.totalAbsent, 0)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center border-l border-zinc-700">
                    <span className="text-zinc-400 font-bold text-[11px]">
                      {filtered.reduce((s, r) => s + r.totalRequired, 0)}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── NOMA daily progress (Kinh doanh + Marketing) ──────────────────────────────

const NOMA_DEPT_OPTIONS = ['Tất cả', ...NOMA_ROLLOUT_DEPARTMENTS];

type NomaCellType = 'before_start' | 'pending' | 'finished' | 'done' | 'partial' | 'miss' | 'leave';

/** remainingBeforeDay = số khóa còn thiếu TÍNH ĐẾN TRƯỚC ngày này (chưa cộng count của chính ngày này) */
function getNomaCellType(date: string, today: string, count: number, remainingBeforeDay: number, isOnLeave: boolean): NomaCellType {
  if (date < NOMA_ROLLOUT_START_DATE) return 'before_start';
  if (date > today) return 'pending';
  if (remainingBeforeDay <= 0) return 'finished'; // đã hoàn thành hết 9 khóa trước ngày này — không còn gì phải làm
  if (isOnLeave) return 'leave'; // nghỉ phép ngày này — không tính là bỏ lỡ chỉ tiêu
  const requiredToday = Math.min(NOMA_ROLLOUT_DAILY_RATE, remainingBeforeDay);
  if (count >= requiredToday) return 'done';
  if (count > 0) return 'partial';
  return 'miss';
}

/** Tính trạng thái từng ngày trong tháng cho 1 nhân viên — dùng chung cho bảng hiển thị và xuất Excel */
function computeNomaDayCells(
  month: string,
  dayNumbers: number[],
  employeeId: string,
  today: string,
  countsByDay: Map<string, number>,
  absenceDays: Set<string> = new Set(),
): { date: string; count: number; type: NomaCellType }[] {
  const firstDayOfMonth = `${month}-01`;
  let cumulativeSoFar = 0;
  for (const [key, c] of countsByDay) {
    if (!key.startsWith(`${employeeId}__`)) continue;
    if (key.split('__')[1] < firstDayOfMonth) cumulativeSoFar += c;
  }
  return dayNumbers.map(d => {
    const date = dateStr(month, d);
    const count = countsByDay.get(`${employeeId}__${date}`) || 0;
    const remainingBeforeDay = NOMA_ROLLOUT_COURSE_IDS.length - cumulativeSoFar;
    const isOnLeave = absenceDays.has(`${employeeId}__${date}`);
    const type = getNomaCellType(date, today, count, remainingBeforeDay, isOnLeave);
    cumulativeSoFar += count;
    return { date, count, type };
  });
}

const NOMA_CELL_LABEL: Record<NomaCellType, (count: number) => string> = {
  before_start: () => '',
  pending: () => '',
  finished: () => '✓',
  done: () => '✓',
  partial: (count) => String(count),
  miss: () => '0',
  leave: () => 'Nghỉ',
};

async function exportNomaDailyExcel(
  month: string,
  dayNumbers: number[],
  employees: NomaDailyEmployee[],
  report: NomaDailyReport,
): Promise<void> {
  const XLSX = await import('xlsx');
  const [y, m] = month.split('-');
  const generatedAt = new Date().toLocaleString('vi-VN');

  const HEADERS = [
    'Họ và tên', 'Phòng ban',
    ...dayNumbers.map(d => `${d} (${DOW_LABEL[getDayOfWeek(month, d)]})`),
    'Tổng đã hoàn thành',
  ];

  const rows = employees.map(emp => {
    const cells = computeNomaDayCells(month, dayNumbers, emp.id, report.today, report.countsByDay, report.absenceDays);
    const total = report.totalCompleted.get(emp.id) || 0;
    return [
      emp.fullName, emp.department,
      ...cells.map(c => NOMA_CELL_LABEL[c.type](c.count)),
      `${total}/${NOMA_ROLLOUT_COURSE_IDS.length}`,
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([
    [`TIẾN ĐỘ 9 KHÓA NOMA MỚI — Kinh doanh + Marketing — Tháng ${m}/${y}`],
    [`Xuất lúc: ${generatedAt} · Chỉ tiêu ${NOMA_ROLLOUT_DAILY_RATE} khóa/ngày kể từ ${NOMA_ROLLOUT_START_DATE.split('-').reverse().join('/')}`],
    [],
    HEADERS,
    ...rows,
  ]);
  ws['!cols'] = [{ wch: 28 }, { wch: 14 }, ...dayNumbers.map(() => ({ wch: 6 })), { wch: 16 }];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } }];
  for (let c = 0; c < HEADERS.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 3, c });
    if (ws[addr]) ws[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: 'D97706' } },
      alignment: { horizontal: 'center' },
    };
  }
  for (let r = 4; r < 4 + rows.length; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: HEADERS.length - 1 });
    const total = employees[r - 4] ? (report.totalCompleted.get(employees[r - 4].id) || 0) : 0;
    if (ws[addr] && total >= NOMA_ROLLOUT_COURSE_IDS.length) {
      ws[addr].s = { font: { bold: true, color: { rgb: '059669' } } };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `NOMA ${m}-${y}`.slice(0, 31));
  XLSX.writeFile(wb, `tien-do-noma_${month}.xlsx`);
}

function NomaDailyView({ month, dayNumbers, deptFilter }: { month: string; dayNumbers: number[]; deptFilter: string }) {
  const [report, setReport] = React.useState<NomaDailyReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);
  const [nomaDept, setNomaDept] = React.useState('Tất cả');

  React.useEffect(() => {
    setLoading(true);
    getNomaDailyProgress().then(setReport).finally(() => setLoading(false));
  }, []);

  const employees = report?.employees || [];
  const filtered = nomaDept === 'Tất cả' ? employees : employees.filter(e => e.department === nomaDept);
  const today = report?.today || getVNToday();

  const handleExport = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportNomaDailyExcel(month, dayNumbers, filtered, report);
    } catch (e) {
      console.error('Export NOMA error:', e);
      alert('Lỗi xuất Excel');
    } finally {
      setExporting(false);
    }
  };

  const NOMA_CELL_CLS: Record<NomaCellType, string> = {
    before_start: '',
    pending: '',
    finished: 'bg-zinc-900/40',
    done: 'bg-emerald-500/10',
    partial: 'bg-amber-500/15',
    miss: 'bg-red-500/20',
    leave: 'bg-blue-500/10',
  };

  const renderNomaCell = (t: NomaCellType, count: number) => {
    switch (t) {
      case 'before_start': return <span className="text-zinc-800 text-[9px]">·</span>;
      case 'pending':      return <span className="text-zinc-700 text-[9px]">·</span>;
      case 'finished':     return <span className="text-zinc-600 font-black text-[10px]">✓</span>;
      case 'done':         return <span className="text-emerald-400 font-black text-[11px]">✓</span>;
      case 'partial':      return <span className="text-amber-400 font-black text-[10px]">{count}</span>;
      case 'miss':         return <span className="text-red-400 font-black text-[10px]">0</span>;
      case 'leave':        return <span className="text-blue-400 font-black text-[9px]">P</span>;
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-zinc-600 font-bold text-sm">Đang tải...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-3 flex-wrap text-[10px] font-bold text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/15 inline-block border border-emerald-500/20" />
            <span className="text-emerald-400">≥{NOMA_ROLLOUT_DAILY_RATE}</span> Đủ chỉ tiêu ngày
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500/15 inline-block border border-amber-500/20" />
            <span className="text-amber-400">1</span> Chưa đủ
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500/20 inline-block border border-red-500/20" />
            <span className="text-red-400">0</span> Không làm khóa nào
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-zinc-900/40 inline-block border border-zinc-800" />
            <span className="text-zinc-500">✓</span> Đã hoàn thành hết 9 khóa
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-500/10 inline-block border border-blue-500/20" />
            <span className="text-blue-400">P</span> Nghỉ phép — không tính chỉ tiêu
          </span>
        </div>
        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
          Chỉ tiêu: {NOMA_ROLLOUT_DAILY_RATE} khóa/ngày · {NOMA_ROLLOUT_COURSE_IDS.length} khóa NOMA · Kinh doanh + Marketing
        </span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Department filter — chỉ Kinh doanh + Marketing, không phải toàn bộ phòng ban công ty */}
        <div className="flex gap-2 flex-wrap">
          {NOMA_DEPT_OPTIONS.map(d => (
            <button key={d} onClick={() => setNomaDept(d)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all border ${
                nomaDept === d
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500'
              }`}>
              {d}
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-wide hover:bg-amber-500/25 transition-all disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800 attendance-scroll">
        <table className="min-w-max text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="sticky left-0 z-10 bg-zinc-950 px-4 py-2 text-left min-w-[200px] border-r border-zinc-800">
                <div className="flex items-center gap-1.5 text-zinc-600">
                  <Building2 className="w-3 h-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Nhân viên</span>
                </div>
              </th>
              {dayNumbers.map(d => {
                const dow = getDayOfWeek(month, d);
                const date = dateStr(month, d);
                const isToday = date === today;
                return (
                  <th key={d}
                    className={`w-8 min-w-[30px] py-1 text-center border-r border-zinc-900 last:border-r-0 ${
                      isToday ? 'bg-blue-500/15 ring-1 ring-inset ring-blue-500/30' : 'bg-zinc-950'
                    }`}>
                    <div className={`font-black text-[10px] ${isToday ? 'text-blue-300' : 'text-zinc-500'}`}>{d}</div>
                    <div className={`text-[8px] font-bold ${isToday ? 'text-blue-400' : 'text-zinc-700'}`}>{DOW_LABEL[dow]}</div>
                  </th>
                );
              })}
              <th className="px-3 py-2 text-center text-emerald-400/80 text-[10px] font-black uppercase tracking-widest min-w-[100px] border-l border-zinc-800">
                Tổng đã hoàn thành
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={dayNumbers.length + 2} className="px-4 py-12 text-center text-zinc-600 text-sm">Không có nhân viên</td></tr>
            ) : filtered.map((emp, idx) => {
              const bg = idx % 2 === 0 ? 'bg-zinc-950' : 'bg-[#0C0C0E]';
              const total = report?.totalCompleted.get(emp.id) || 0;
              const cells = computeNomaDayCells(month, dayNumbers, emp.id, today, report?.countsByDay || new Map(), report?.absenceDays);
              return (
                <tr key={emp.id} className={`border-b border-zinc-900 last:border-b-0 ${bg} hover:bg-zinc-900/30 transition-colors`}>
                  <td className={`sticky left-0 z-10 px-4 py-2 border-r border-zinc-800 ${bg}`}>
                    <div className="font-bold text-zinc-200 truncate max-w-[180px]">{emp.fullName}</div>
                    <div className="text-[9px] text-zinc-600 font-bold truncate">{emp.department}</div>
                  </td>
                  {cells.map((cell, i) => {
                    const d = dayNumbers[i];
                    const isToday = cell.date === today;
                    return (
                      <td key={d}
                        className={`border-r border-zinc-900 last:border-r-0 text-center ${NOMA_CELL_CLS[cell.type]} ${isToday ? 'ring-1 ring-inset ring-blue-500/20' : ''}`}>
                        {renderNomaCell(cell.type, cell.count)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center border-l border-zinc-800">
                    <span className={`font-black text-[11px] ${total >= NOMA_ROLLOUT_COURSE_IDS.length ? 'text-zinc-400' : 'text-emerald-400'}`}>{total}</span>
                    <span className="text-[9px] text-zinc-600 font-bold">/{NOMA_ROLLOUT_COURSE_IDS.length}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Main AttendanceTab ────────────────────────────────────────────────────────

export function AttendanceTab() {
  const [month, setMonth] = React.useState(getVNMonth);
  const [view, setView] = React.useState<'results' | 'summary' | 'config' | 'noma'>('results');
  const [employees, setEmployees] = React.useState<AttendanceEmployee[]>([]);
  const [holidays, setHolidays] = React.useState<Set<string>>(new Set());
  const [absences, setAbsences] = React.useState<Map<string, Set<string>>>(new Map());
  const [submissions, setSubmissions] = React.useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [deptFilter, setDeptFilter] = React.useState('Tất cả');

  const cutoffDate = getVNToday(); // tính đến hôm nay (bao gồm cả ngày hiện tại)
  const days = getDaysInMonth(month);
  const dayNumbers = Array.from({ length: days }, (_, i) => i + 1);

  const departments = React.useMemo(() => {
    const depts = [...new Set(employees.map(e => e.department))].sort((a, b) => a.localeCompare(b, 'vi'));
    return ['Tất cả', ...depts];
  }, [employees]);

  const loadData = React.useCallback(async (ym: string) => {
    setLoading(true);
    try {
      const [emps, hols, abs, subs] = await Promise.all([
        getAttendanceEmployees(),
        getHolidays(ym),
        getAbsences(ym),
        getQuizSubmissionsForMonth(ym),
      ]);
      setEmployees(emps);
      setHolidays(hols);
      setAbsences(abs);
      setSubmissions(subs);
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Điểm Danh Nhân Viên</h2>
          <p className="text-[11px] text-zinc-500 font-bold mt-0.5">
            {view === 'results'
              ? 'Kết quả làm bài quiz theo ngày'
              : view === 'summary'
                ? 'Tổng hợp ngày vắng theo từng nhân viên và theo tháng'
                : view === 'noma'
                  ? 'Kinh doanh + Marketing: theo dõi 2 khóa NOMA/ngày'
                  : 'Click ô ngày để đánh dấu nghỉ · Click hàng lễ để đánh dấu toàn công ty nghỉ'}
          </p>
        </div>

        {/* Month navigation — chỉ hiện khi không ở tab tổng hợp */}
        {view !== 'summary' && (
          <div className="flex items-center gap-2">
            <button onClick={() => setMonth(prevMonth(month))}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white font-black text-sm min-w-[120px] text-center">
              Tháng {mM}/{mY}
            </span>
            <button onClick={() => setMonth(nextMonth(month))}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* View toggle + Department filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 p-1 bg-zinc-800 rounded-xl border border-zinc-700">
          <button
            onClick={() => setView('results')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all ${
              view === 'results' ? 'bg-blue-500 text-white shadow' : 'text-zinc-300 hover:text-white hover:bg-zinc-700'
            }`}>
            <ClipboardList className="w-3.5 h-3.5" />
            Kết quả theo ngày
          </button>
          <button
            onClick={() => setView('summary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all ${
              view === 'summary' ? 'bg-violet-500 text-white shadow' : 'text-zinc-300 hover:text-white hover:bg-zinc-700'
            }`}>
            <BarChart2 className="w-3.5 h-3.5" />
            Tổng hợp theo tháng
          </button>
          <button
            onClick={() => setView('config')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all ${
              view === 'config' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-300 hover:text-white hover:bg-zinc-700'
            }`}>
            <Calendar className="w-3.5 h-3.5" />
            Quản lý ngày nghỉ
          </button>
          <button
            onClick={() => setView('noma')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all ${
              view === 'noma' ? 'bg-amber-500 text-white shadow' : 'text-zinc-300 hover:text-white hover:bg-zinc-700'
            }`}>
            <Rocket className="w-3.5 h-3.5" />
            Tiến độ NOMA
          </button>
        </div>

        {/* Department filter */}
        <div className="flex gap-2 flex-wrap">
          {departments.map(d => (
            <button key={d} onClick={() => setDeptFilter(d)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all border ${
                deptFilter === d
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500'
              }`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Tổng hợp theo tháng — load state riêng, không phụ thuộc month data */}
      {view === 'summary' && <SummaryView deptFilter={deptFilter} />}

      {/* Tab: Tiến độ NOMA — load state riêng, không phụ thuộc attendance data */}
      {view === 'noma' && <NomaDailyView month={month} dayNumbers={dayNumbers} deptFilter={deptFilter} />}

      {/* Tab: Kết quả theo ngày + Quản lý ngày nghỉ — cần month data */}
      {view !== 'summary' && view !== 'noma' && (
        loading ? (
          <div className="text-center py-16 text-zinc-600 font-bold text-sm">Đang tải...</div>
        ) : (
          <>
            {view === 'results' && (
              <ResultsView
                month={month}
                dayNumbers={dayNumbers}
                employees={employees}
                holidays={holidays}
                absences={absences}
                submissions={submissions}
                deptFilter={deptFilter}
                yesterday={cutoffDate}
              />
            )}
            {view === 'config' && (
              <ConfigView
                month={month}
                dayNumbers={dayNumbers}
                employees={employees}
                holidays={holidays}
                absences={absences}
                saving={saving}
                onToggleHoliday={handleToggleHoliday}
                onToggleAbsence={handleToggleAbsence}
                deptFilter={deptFilter}
              />
            )}
          </>
        )
      )}
    </div>
  );
}
