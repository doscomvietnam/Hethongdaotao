import * as React from 'react';
import {
  GraduationCap,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Minus,
} from 'lucide-react';
import { getOnboardingTestReport, adminResetOnboardingTest } from '../../services/onboardingTestService';
import type { OnboardingTestAdminRow } from '../../types';

interface Props {
  currentEmployeeId: string;
}

interface ResetDialog {
  open: boolean;
  testId: string;
  employeeName: string;
  reason: string;
}

const EMPTY_RESET: ResetDialog = { open: false, testId: '', employeeName: '', reason: '' };

function StatusBadge({ row }: { row: OnboardingTestAdminRow }) {
  if (row.status === 'not_applicable') return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-900 text-zinc-600 text-[9px] font-black uppercase tracking-widest">
      <Minus className="w-3 h-3" /> N/A
    </span>
  );
  if (row.status === 'not_started') return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-800 text-zinc-500 text-[9px] font-black uppercase tracking-widest">
      <Clock className="w-3 h-3" /> Chưa làm
    </span>
  );
  if (row.status === 'pending') return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[9px] font-black uppercase tracking-widest ring-1 ring-amber-500/30">
      <Clock className="w-3 h-3" /> Đang làm
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ring-1 ${
      row.passed
        ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30'
        : 'bg-red-500/10 text-red-400 ring-red-500/30'
    }`}>
      {row.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {row.passed ? 'Đạt' : 'Không đạt'}
    </span>
  );
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(secs?: number): string {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function OnboardingTestManagement({ currentEmployeeId }: Props) {
  const [rows, setRows] = React.useState<OnboardingTestAdminRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [resetDialog, setResetDialog] = React.useState<ResetDialog>(EMPTY_RESET);
  const [resetLoading, setResetLoading] = React.useState(false);
  const [resetError, setResetError] = React.useState('');
  const [sortField, setSortField] = React.useState<keyof OnboardingTestAdminRow>('department');
  const [sortAsc, setSortAsc] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const data = await getOnboardingTestReport();
    setRows(data);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const sorted = React.useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      const cmp = String(av).localeCompare(String(bv), 'vi');
      return sortAsc ? cmp : -cmp;
    });
  }, [rows, sortField, sortAsc]);

  function toggleSort(field: keyof OnboardingTestAdminRow) {
    if (sortField === field) setSortAsc(p => !p);
    else { setSortField(field); setSortAsc(true); }
  }

  const summary = React.useMemo(() => {
    const applicable = rows.filter(r => r.status !== 'not_applicable');
    return {
      total: applicable.length,
      notStarted: applicable.filter(r => r.status === 'not_started').length,
      pending: applicable.filter(r => r.status === 'pending').length,
      submitted: applicable.filter(r => r.status === 'submitted').length,
      passed: applicable.filter(r => r.passed === true).length,
    };
  }, [rows]);

  async function handleReset() {
    if (!resetDialog.reason.trim()) { setResetError('Vui lòng nhập lý do reset.'); return; }
    setResetLoading(true);
    setResetError('');
    const { success, error } = await adminResetOnboardingTest(resetDialog.testId, currentEmployeeId, resetDialog.reason);
    setResetLoading(false);
    if (success) {
      setResetDialog(EMPTY_RESET);
      load();
    } else {
      setResetError(error || 'Có lỗi xảy ra.');
    }
  }

  function SortIcon({ field }: { field: keyof OnboardingTestAdminRow }) {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  }

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-widest transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Cần làm onboarding', value: summary.total, color: 'text-white' },
          { label: 'Chưa bắt đầu', value: summary.notStarted, color: 'text-zinc-400' },
          { label: 'Đang làm', value: summary.pending, color: 'text-amber-400' },
          { label: 'Đã nộp bài', value: summary.submitted, color: 'text-blue-400' },
          { label: 'Đạt yêu cầu', value: summary.passed, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-3xl font-black font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800">
                {([
                  ['fullName', 'Nhân viên'],
                  ['department', 'Phòng ban'],
                  ['onboardingAvailableDate', 'Ngày mở'],
                  ['status', 'Trạng thái'],
                  ['scorePercent', 'Điểm'],
                  ['correctCount', 'Đúng/Tổng'],
                  ['submittedAt', 'Ngày nộp'],
                  ['timeSeconds', 'Thời gian'],
                ] as [keyof OnboardingTestAdminRow, string][]).map(([field, label]) => (
                  <th
                    key={field}
                    onClick={() => toggleSort(field)}
                    className="px-4 py-3 text-left text-[9px] text-zinc-500 font-black uppercase tracking-widest cursor-pointer hover:text-zinc-300 select-none"
                  >
                    <span className="flex items-center gap-1">{label}<SortIcon field={field} /></span>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-[9px] text-zinc-500 font-black uppercase tracking-widest">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-zinc-600 text-sm">Đang tải...</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-zinc-600 text-sm">Không có dữ liệu</td></tr>
              ) : sorted.map((row, i) => (
                <tr
                  key={row.employeeId}
                  className={`border-b border-zinc-900 ${i % 2 === 0 ? 'bg-black/20' : ''} hover:bg-zinc-900/50 transition-colors ${row.status === 'not_applicable' ? 'opacity-40' : ''}`}
                >
                  <td className="px-4 py-3 font-bold text-white whitespace-nowrap">{row.fullName}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.department}</td>
                  <td className="px-4 py-3 font-mono text-zinc-400">
                    {row.onboardingAvailableDate
                      ? formatDate(row.onboardingAvailableDate)
                      : <span className="text-zinc-700">—</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge row={row} /></td>
                  <td className="px-4 py-3 font-mono text-zinc-300">
                    {row.status === 'submitted' ? `${row.scorePercent?.toFixed(0)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-300">
                    {row.status === 'submitted' ? `${row.correctCount}/${row.totalQuestions}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                    {row.submittedAt ? formatDate(row.submittedAt) : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-400">
                    {formatTime(row.timeSeconds)}
                  </td>
                  <td className="px-4 py-3">
                    {row.testId && row.status !== 'not_started' && row.status !== 'not_applicable' && (
                      <button
                        onClick={() => setResetDialog({ open: true, testId: row.testId!, employeeName: row.fullName, reason: '' })}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest ring-1 ring-amber-500/20 transition-all"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset dialog */}
      {resetDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-md space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-black text-white text-lg">Reset onboarding test</h3>
                <p className="text-zinc-500 text-xs">{resetDialog.employeeName}</p>
              </div>
            </div>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Nhân viên sẽ được làm lại bài kiểm tra onboarding với <span className="text-amber-400 font-bold">cùng bộ câu hỏi cũ</span>. Điểm số và kết quả cũ sẽ bị xóa.
            </p>
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Lý do reset *</label>
              <textarea
                rows={3}
                value={resetDialog.reason}
                onChange={e => setResetDialog(d => ({ ...d, reason: e.target.value }))}
                placeholder="Nhập lý do reset..."
                className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none placeholder-zinc-600"
              />
              {resetError && <p className="text-red-400 text-xs">{resetError}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setResetDialog(EMPTY_RESET); setResetError(''); }}
                className="flex-1 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-black uppercase tracking-widest transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleReset}
                disabled={resetLoading}
                className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resetLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Xác nhận reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
