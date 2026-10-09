import * as React from 'react';
import { Gift, X, ExternalLink, Loader2 } from 'lucide-react';
import { Card } from '../ui';
import {
  getMyRedeem, createRedeem, cancelRedeem, REDEEM_STATUS_LABEL,
  type RedeemBalance, type RedeemRequest, type RedeemStatus,
} from '../../services/redeemService';

/** Đổi quà (Tổng quan cá nhân, dưới thẻ Điểm tích lũy): gửi yêu cầu → admin duyệt / từ chối. */
export const STATUS_CHIP: Record<RedeemStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-500',
  approved: 'bg-emerald-500/10 text-emerald-500',
  rejected: 'bg-red-500/10 text-red-400',
  cancelled: 'bg-zinc-800 text-zinc-500',
};
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function RedeemCard() {
  const [balance, setBalance] = React.useState<RedeemBalance | null>(null);
  const [requests, setRequests] = React.useState<RedeemRequest[]>([]);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try { const r = await getMyRedeem(); setBalance(r.balance); setRequests(r.requests); setLoadErr(null); }
    catch (e: any) { setLoadErr(e.message); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const cancel = async (id: string) => {
    try { await cancelRedeem(id); await load(); } catch (e: any) { setLoadErr(e.message); }
  };

  return (
    <Card className="p-5 lg:p-6 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/30 flex items-center justify-center flex-shrink-0">
            <Gift className="w-6 h-6 text-rose-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest leading-none">Đổi quà</p>
            <p className="text-sm font-bold text-zinc-300 mt-2">
              Điểm hiện có: <span className="text-xl font-black text-amber-500 tabular-nums">{balance ? balance.available : '—'}</span>
              {balance && balance.spent > 0 && <span className="text-[11px] text-zinc-500 font-bold"> · đã đổi {balance.spent}</span>}
            </p>
            <p className="text-[10px] text-zinc-600 font-bold mt-1">Gửi yêu cầu quà bạn muốn — admin duyệt và trừ điểm tương ứng.</p>
          </div>
        </div>
        <button onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-black uppercase tracking-widest transition-colors">
          <Gift className="w-4 h-4" /> Đổi quà
        </button>
      </div>

      {loadErr && <p className="mt-3 text-[11px] font-bold text-red-400">{loadErr}</p>}

      {requests.length > 0 && (
        <div className="mt-5 border-t border-zinc-800 pt-4 space-y-2">
          <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Yêu cầu của bạn</p>
          {requests.map(r => (
            <div key={r.id} className="rounded-xl border border-zinc-800 px-3.5 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-200 break-words">{r.gift_name}</p>
                  <p className="text-[10.5px] text-zinc-500 mt-0.5">
                    {fmtDate(r.created_at)}
                    {r.gift_link && <> · <a href={r.gift_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-sky-400 hover:underline">link quà <ExternalLink className="w-3 h-3" /></a></>}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md whitespace-nowrap ${STATUS_CHIP[r.status]}`}>{REDEEM_STATUS_LABEL[r.status]}</span>
                  {r.status === 'approved' && r.points_spent > 0 && <span className="text-[11px] font-black text-amber-500 tabular-nums">−{r.points_spent} điểm</span>}
                  {r.status === 'pending' && <button onClick={() => cancel(r.id)} className="text-[10.5px] font-bold text-zinc-500 hover:text-red-400">Hủy yêu cầu</button>}
                </div>
              </div>
              {r.status === 'rejected' && r.reject_reason && (
                <p className="mt-1.5 text-[11.5px] text-red-500 bg-red-500/10 rounded-lg px-2.5 py-1.5">Lý do: {r.reject_reason}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {open && <RedeemForm available={balance?.available ?? 0} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />}
    </Card>
  );
}

function RedeemForm({ available, onClose, onDone }: { available: number; onClose: () => void; onDone: () => void }) {
  const [gift, setGift] = React.useState('');
  const [link, setLink] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gift.trim()) { setErr('Nhập tên quà muốn đổi'); return; }
    const l = link.trim();
    if (l && !/^https?:\/\//i.test(l)) { setErr('Link quà phải bắt đầu bằng http:// hoặc https://'); return; }
    setSaving(true); setErr(null);
    try { await createRedeem(gift.trim(), l || undefined); onDone(); }
    catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60" onClick={() => !saving && onClose()}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[#0C0C0E] border border-zinc-800 p-6 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Đổi quà</h3>
            <p className="text-[11px] text-zinc-500 font-bold mt-1">Bạn đang có <span className="text-amber-500">{available} điểm</span>. Admin sẽ duyệt và báo số điểm trừ.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="text-zinc-500 hover:text-white" aria-label="Đóng"><X className="w-5 h-5" /></button>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Quà muốn đổi <span className="text-red-400">*</span></span>
          <input value={gift} onChange={e => setGift(e.target.value)} maxLength={200} autoFocus placeholder="VD: Bình giữ nhiệt Noma 500ml"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 outline-none focus:border-rose-500/60" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Link quà <span className="text-zinc-600 normal-case tracking-normal font-bold">(không bắt buộc)</span></span>
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 outline-none focus:border-rose-500/60" />
        </label>

        {err && <p className="text-[11.5px] font-bold text-red-400">{err}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white">Hủy</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-[11px] font-black uppercase tracking-widest">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Gửi yêu cầu
          </button>
        </div>
      </form>
    </div>
  );
}
