import * as React from 'react';
import { Star, ChevronLeft, ChevronRight, Gift, Trophy, RefreshCw, Search } from 'lucide-react';
import type { Employee } from '../../types';
import { getMonthlyPoints, type PointsData } from '../../services/pointsService';

/** Hệ thống điểm — CHỈ ADMIN. Điểm nhân viên theo tháng (hiện chỉ có điểm seeding); đổi quà làm sau. */
const GROUP_LABEL: Record<string, string> = { koc: 'Seeding KOC', company: 'Seeding video công ty', competitor: 'Seeding đối thủ' };
const vnMonth = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 7);
const shiftMonth = (m: string, d: number) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1 + d, 1)).toISOString().slice(0, 7);
};
const monthLabel = (m: string) => `Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}`;
const dayLabel = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`;

export default function PointsPage(_: { employee: Employee }) {
  const [month, setMonth] = React.useState(vnMonth());
  const [data, setData] = React.useState<PointsData | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [selected, setSelected] = React.useState<string | null>(null);
  const isCurrent = month === vnMonth();

  const load = React.useCallback(async () => {
    setLoading(true); setErr(null);
    try { setData(await getMonthlyPoints(month)); }
    catch (e: any) { setErr(e.message); setData(null); }
    finally { setLoading(false); }
  }, [month]);
  React.useEffect(() => { load(); }, [load]);

  const board = data?.leaderboard || [];
  const kw = q.trim().toLowerCase();
  const shown = kw ? board.filter(r => r.full_name.toLowerCase().includes(kw) || (r.department || '').toLowerCase().includes(kw)) : board;
  // Mặc định xem lịch sử của người đứng đầu tháng
  const selId = selected && board.some(r => r.employee_id === selected) ? selected : board.find(r => r.points > 0)?.employee_id || null;
  const selRow = board.find(r => r.employee_id === selId);
  const selItems = (data?.items || []).filter(i => i.employee_id === selId);
  const byDay = React.useMemo(() => {
    const m = new Map<string, typeof selItems>();
    for (const i of selItems) m.set(i.date, [...(m.get(i.date) || []), i]);
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [selItems]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col gap-4 border-l-4 border-amber-500 pl-5 sm:pl-8 py-2">
        <div className="flex items-center gap-3 sm:gap-4">
          <Star className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500" />
          <h1 className="text-[1.75rem] sm:text-5xl font-black tracking-tighter text-white uppercase leading-none">Hệ thống điểm</h1>
        </div>
        <p className="text-zinc-500 font-bold uppercase tracking-wider sm:tracking-widest text-xs sm:pl-12">
          Điểm nhân viên theo tháng · hiện tại gồm điểm seeding · chỉ admin xem
        </p>
      </header>

      {/* Chọn tháng */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setMonth(m => shiftMonth(m, -1))} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white" aria-label="Tháng trước"><ChevronLeft className="w-4 h-4" /></button>
        <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-black text-white min-w-[150px] text-center">{monthLabel(month)}</div>
        <button onClick={() => setMonth(m => shiftMonth(m, 1))} disabled={isCurrent} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30" aria-label="Tháng sau"><ChevronRight className="w-4 h-4" /></button>
        {!isCurrent && <button onClick={() => setMonth(vnMonth())} className="text-[11px] font-bold text-amber-500 px-2">Về tháng này</button>}
        <button onClick={load} className="ml-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>

      {err && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{err}</div>}

      {/* Tổng quan tháng */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/15 flex items-center justify-center text-2xl flex-none">⭐</div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tổng điểm toàn công ty</div>
            <div className="text-4xl font-black text-amber-500 leading-none tabular-nums mt-1">{data ? data.summary.total : '–'}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-[#0C0C0E] p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nhân viên có điểm</div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-4xl font-black text-white leading-none tabular-nums">{data ? data.summary.withPoints : '–'}</span>
            <span className="text-sm font-bold text-zinc-500">/ {data ? data.summary.employees : '–'} người</span>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-[#0C0C0E] p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Nguồn điểm</div>
          {(data?.sources || [{ key: 'seeding', label: 'Seeding', points: 0 }]).map(s => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-300">{s.label}</span>
              <span className="text-sm font-black text-amber-500 tabular-nums">{data ? s.points : '–'}</span>
            </div>
          ))}
          <div className="text-[11px] text-zinc-600 mt-2">Mỗi lượt seeding hợp lệ = +1 điểm. Ảnh bị thu hồi sẽ bị trừ điểm.</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bảng xếp hạng tháng — bấm 1 người để xem lịch sử */}
        <section className="rounded-2xl border border-zinc-800 bg-[#0C0C0E] overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-white">
              <Trophy className="w-4 h-4 text-amber-500" /> Xếp hạng {monthLabel(month).toLowerCase()}
            </div>
            <label className="ml-auto flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 w-full sm:w-52">
              <Search className="w-3.5 h-3.5 text-zinc-500 flex-none" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm tên / phòng ban" className="bg-transparent text-xs text-zinc-200 outline-none w-full" />
            </label>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {data && shown.length === 0 && <div className="px-5 py-10 text-center text-sm text-zinc-600">Không có nhân viên phù hợp</div>}
            {shown.map(r => {
              const active = r.employee_id === selId;
              const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : null;
              return (
                <button key={r.employee_id} onClick={() => setSelected(r.employee_id)}
                  className={`w-full text-left px-5 py-2.5 flex items-center gap-3 border-b border-zinc-800 last:border-b-0 transition-colors ${active ? 'bg-amber-500/10' : 'hover:bg-zinc-900'}`}>
                  <span className="w-8 text-center text-sm font-black text-zinc-500 tabular-nums flex-none">{medal || (r.rank ? `#${r.rank}` : '–')}</span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-bold truncate ${active ? 'text-amber-500' : r.points ? 'text-zinc-200' : 'text-zinc-500'}`}>{r.full_name}</div>
                    {r.department && <div className="text-[11px] text-zinc-600 truncate">{r.department}</div>}
                  </div>
                  <span className={`text-sm font-black tabular-nums flex-none ${r.points ? 'text-amber-500' : 'text-zinc-600'}`}>{r.points}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Lịch sử điểm của người đang chọn */}
        <section className="rounded-2xl border border-zinc-800 bg-[#0C0C0E] overflow-hidden lg:self-start">
          <div className="px-5 py-4 border-b border-zinc-800">
            <div className="text-sm font-black uppercase tracking-tight text-white">Lịch sử điểm</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              {selRow ? <>{selRow.full_name} · <span className="text-amber-500 font-black">{selRow.points} điểm</span>{selRow.rank ? ` · hạng #${selRow.rank}` : ''}</> : 'Bấm một nhân viên bên bảng xếp hạng để xem'}
            </div>
          </div>
          {data && selId && byDay.length === 0 && <div className="px-5 py-10 text-center text-sm text-zinc-600">Tháng này chưa có điểm nào</div>}
          {data && !selId && <div className="px-5 py-10 text-center text-sm text-zinc-600">Chưa ai có điểm trong tháng này</div>}
          <div className="max-h-[460px] overflow-y-auto">
            {byDay.map(([date, its]) => (
              <div key={date} className="px-5 py-3 border-b border-zinc-800 last:border-b-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-zinc-400">Ngày {dayLabel(date)}</span>
                  <span className="text-xs font-black text-emerald-500 tabular-nums">+{its.reduce((a, i) => a + i.points, 0)} điểm</span>
                </div>
                <div className="mt-1.5 space-y-1">
                  {its.map((i, k) => (
                    <div key={k} className="flex items-center justify-between gap-3 text-[12.5px]">
                      <span className="text-zinc-300 truncate">{GROUP_LABEL[i.group_key] || 'Seeding'}{i.title ? ` · ${i.title}` : ''}</span>
                      <span className="text-amber-500 font-bold flex-none tabular-nums">+{i.points}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Đổi quà — giai đoạn sau */}
      <section className="rounded-2xl border border-dashed border-zinc-700 bg-[#0C0C0E] p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center flex-none"><Gift className="w-6 h-6 text-zinc-500" /></div>
        <div>
          <div className="text-sm font-black uppercase tracking-tight text-white">Đổi quà <span className="ml-1.5 text-[10px] font-black text-amber-500 bg-amber-500/10 rounded-full px-2 py-0.5 align-middle">Sắp ra mắt</span></div>
          <div className="text-xs text-zinc-500 mt-1">Nhân viên dùng điểm tích lũy để đổi quà — tính năng đang được chuẩn bị.</div>
        </div>
      </section>
    </div>
  );
}
