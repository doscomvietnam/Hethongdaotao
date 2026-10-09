import * as React from 'react';
import { Gift, ExternalLink, Loader2, Check, X, RefreshCw } from 'lucide-react';
import {
  adminListRedeem, approveRedeem, rejectRedeem, REDEEM_STATUS_LABEL,
  type AdminRedeemRequest, type RedeemStatus,
} from '../../services/redeemService';
import { STATUS_CHIP, fmtDate } from './RedeemCard';

/** Admin: duyệt (nhập điểm trừ) / từ chối (bắt buộc lý do) yêu cầu đổi quà. Nằm trong menu Hệ thống điểm. */
const FILTERS: { id: RedeemStatus | 'all'; label: string }[] = [
  { id: 'pending', label: 'Chờ duyệt' }, { id: 'approved', label: 'Đã duyệt' },
  { id: 'rejected', label: 'Từ chối' }, { id: 'all', label: 'Tất cả' },
];

export function RedeemAdmin({ onChanged }: { onChanged?: () => void }) {
  const [filter, setFilter] = React.useState<RedeemStatus | 'all'>('pending');
  const [rows, setRows] = React.useState<AdminRedeemRequest[] | null>(null);
  const [pending, setPending] = React.useState(0);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try { const r = await adminListRedeem(filter); setRows(r.requests); setPending(r.pending); setErr(null); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [filter]);
  React.useEffect(() => { load(); }, [load]);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#0C0C0E] overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-white">
          <Gift className="w-4 h-4 text-rose-400" /> Yêu cầu đổi quà
          {pending > 0 && <span className="text-[10px] font-black bg-rose-500 text-white rounded-full px-2 py-0.5">{pending} chờ duyệt</span>}
        </div>
        <div className="ml-auto flex items-center gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-[10.5px] font-black uppercase tracking-widest ${filter === f.id ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-500 hover:text-zinc-200'}`}>{f.label}</button>
          ))}
          <button onClick={load} className="p-1.5 text-zinc-500 hover:text-zinc-200" aria-label="Làm mới"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {err && <div className="px-5 py-3 text-sm text-red-400">{err}</div>}
      {rows && rows.length === 0 && !err && <div className="px-5 py-10 text-center text-sm text-zinc-600">Không có yêu cầu nào</div>}
      <div>
        {rows?.map(r => <Row key={r.id} r={r} onDone={() => { load(); onChanged?.(); }} />)}
      </div>
    </section>
  );
}

function Row({ r, onDone }: { r: AdminRedeemRequest; onDone: () => void }) {
  const [mode, setMode] = React.useState<'approve' | 'reject' | null>(null);
  const [points, setPoints] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (mode === 'approve') {
      const n = Number(points);
      if (points.trim() === '' || !Number.isInteger(n) || n < 0) { setErr('Nhập số điểm trừ (số nguyên ≥ 0)'); return; }
      if (n > r.balance.available) { setErr(`Nhân viên chỉ còn ${r.balance.available} điểm`); return; }
    } else if (!reason.trim()) { setErr('Nhập lý do từ chối'); return; }
    setBusy(true);
    try {
      if (mode === 'approve') await approveRedeem(r.id, Number(points));
      else await rejectRedeem(r.id, reason.trim());
      onDone();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="px-5 py-3.5 border-b border-zinc-800 last:border-b-0">
      <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-zinc-200">{r.full_name}</span>
            {r.department && <span className="text-[11px] text-zinc-600">{r.department}</span>}
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${STATUS_CHIP[r.status]}`}>{REDEEM_STATUS_LABEL[r.status]}</span>
          </div>
          <p className="text-sm text-zinc-300 mt-1 break-words">🎁 {r.gift_name}</p>
          <p className="text-[10.5px] text-zinc-500 mt-0.5">
            Gửi {fmtDate(r.created_at)}
            {r.gift_link && <> · <a href={r.gift_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-sky-400 hover:underline">link quà <ExternalLink className="w-3 h-3" /></a></>}
            {r.reviewed_at && <> · {r.status === 'approved' ? 'Duyệt' : 'Xử lý'} {fmtDate(r.reviewed_at)}{r.reviewer ? ` bởi ${r.reviewer}` : ''}</>}
          </p>
          {r.status === 'approved' && <p className="text-[11.5px] font-bold text-amber-500 mt-1">Đã trừ {r.points_spent} điểm</p>}
          {r.status === 'rejected' && r.reject_reason && <p className="text-[11.5px] text-red-500 mt-1">Lý do: {r.reject_reason}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Điểm hiện có</p>
          <p className="text-lg font-black text-amber-500 tabular-nums leading-tight">{r.balance.available}</p>
          {r.status === 'pending' && !mode && (
            <div className="flex gap-1.5 mt-1.5 justify-end">
              <button onClick={() => { setMode('approve'); setErr(null); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10.5px] font-black uppercase"><Check className="w-3.5 h-3.5" />Duyệt</button>
              <button onClick={() => { setMode('reject'); setErr(null); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 text-[10.5px] font-black uppercase"><X className="w-3.5 h-3.5" />Từ chối</button>
            </div>
          )}
        </div>
      </div>

      {mode && (
        <div className={`mt-3 rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center gap-2 ${mode === 'approve' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          {mode === 'approve' ? (
            <label className="flex items-center gap-2 text-[12px] font-bold text-zinc-300 flex-1">
              Số điểm trừ
              <input type="number" min={0} max={r.balance.available} value={points} onChange={e => setPoints(e.target.value)} autoFocus
                className="w-24 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 tabular-nums outline-none" />
              <span className="text-[11px] text-zinc-500">/ {r.balance.available} điểm</span>
            </label>
          ) : (
            <input value={reason} onChange={e => setReason(e.target.value)} maxLength={500} autoFocus placeholder="Lý do từ chối (bắt buộc)"
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none" />
          )}
          <div className="flex gap-1.5 justify-end">
            <button onClick={() => { setMode(null); setErr(null); }} disabled={busy} className="px-3 py-1.5 rounded-lg text-[10.5px] font-black uppercase text-zinc-400 hover:text-white">Hủy</button>
            <button onClick={submit} disabled={busy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[10.5px] font-black uppercase disabled:opacity-60 ${mode === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{mode === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
            </button>
          </div>
        </div>
      )}
      {err && <p className="mt-1.5 text-[11.5px] font-bold text-red-400">{err}</p>}
    </div>
  );
}
