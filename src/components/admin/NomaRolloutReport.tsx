import * as React from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Rocket } from 'lucide-react';
import { getNomaRolloutReport, type NomaRolloutReport, type NomaRolloutRow } from '../../services/nomaRolloutService';

function StatusBadge({ row }: { row: NomaRolloutRow }) {
  if (row.onTrack) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest ring-1 ring-emerald-500/30">
        <CheckCircle2 className="w-3 h-3" /> Đủ tiến độ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-widest ring-1 ring-red-500/30">
      <AlertTriangle className="w-3 h-3" /> Chưa đủ
    </span>
  );
}

export default function NomaRolloutReport() {
  const [data, setData] = React.useState<NomaRolloutReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getNomaRolloutReport();
      setData(result);
    } catch (e: any) {
      setError(e?.message || 'Không tải được báo cáo.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const rows = data?.rows || [];
  const summary = React.useMemo(() => {
    const total = rows.length;
    const onTrack = rows.filter(r => r.onTrack).length;
    const notStarted = rows.filter(r => r.completedCount === 0).length;
    return { total, onTrack, behind: total - onTrack, notStarted };
  }, [rows]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Rocket className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-sm font-black text-white uppercase tracking-wider">Tiến độ 9 khóa NOMA mới</p>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
              Kinh doanh + Marketing · yêu cầu 2 khóa/ngày từ {data?.startDate.split('-').reverse().join('/')}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-widest transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">{error}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tổng nhân viên', value: summary.total, color: 'text-white' },
          { label: `Kỳ vọng hôm nay`, value: `≥ ${data?.expectedByToday ?? 0}/9`, color: 'text-blue-400' },
          { label: 'Đủ tiến độ', value: summary.onTrack, color: 'text-emerald-400' },
          { label: 'Chưa động vào khóa nào', value: summary.notStarted, color: 'text-red-400' },
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
                {['Nhân viên', 'Phòng ban', 'Trạng thái', 'Hoàn thành', 'Chưa làm (mã sản phẩm)'].map(label => (
                  <th key={label} className="px-4 py-3 text-left text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-zinc-600 text-sm">Đang tải...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-zinc-600 text-sm">Không có dữ liệu</td></tr>
              ) : rows.map((row, i) => (
                <tr key={row.employeeId} className={`border-b border-zinc-900 ${i % 2 === 0 ? 'bg-black/20' : ''} hover:bg-zinc-900/50 transition-colors`}>
                  <td className="px-4 py-3 font-bold text-white whitespace-nowrap">{row.fullName}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.department}</td>
                  <td className="px-4 py-3"><StatusBadge row={row} /></td>
                  <td className="px-4 py-3 font-mono text-zinc-300">{row.completedCount}/{row.totalCount}</td>
                  <td className="px-4 py-3 text-zinc-500 font-mono">
                    {row.missingCourseCodes.length === 0 ? '— đã xong hết' : row.missingCourseCodes.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
