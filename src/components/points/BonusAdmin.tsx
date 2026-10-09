import * as React from 'react';
import { Award, Loader2, Plus, Trash2 } from 'lucide-react';
import { adminListBonus, addBonus, deleteBonus, type PointBonus } from '../../services/redeemService';
import { fmtDate } from './RedeemCard';

/** Admin: cộng điểm thưởng cho nhân viên (số điểm + lý do). Nằm trong menu Hệ thống điểm, trước Yêu cầu đổi quà. */
export function BonusAdmin({ employees, month, onChanged }: {
  employees: { employee_id: string; full_name: string; department: string | null }[];
  month: string;
  onChanged?: () => void;
}) {
  const [list, setList] = React.useState<PointBonus[] | null>(null);
  const [listErr, setListErr] = React.useState<string | null>(null);
  const [empId, setEmpId] = React.useState('');
  const [points, setPoints] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);
  const [confirmDel, setConfirmDel] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try { const r = await adminListBonus(month); setList(r.bonuses); setListErr(null); }
    catch (e: any) { setListErr(e.message); }
  }, [month]);
  React.useEffect(() => { load(); }, [load]);

  const sorted = React.useMemo(
    () => [...employees].sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi')),
    [employees],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setDone(null);
    const n = Number(points);
    if (!empId) { setErr('Chọn nhân viên được thưởng'); return; }
    if (points.trim() === '' || !Number.isInteger(n) || n <= 0) { setErr('Số điểm cộng phải là số nguyên lớn hơn 0'); return; }
    if (!reason.trim()) { setErr('Nhập lý do cộng điểm'); return; }
    setSaving(true);
    try {
      await addBonus(empId, n, reason.trim());
      const name = employees.find(x => x.employee_id === empId)?.full_name || '';
      setDone(`Đã cộng ${n} điểm cho ${name}`);
      setEmpId(''); setPoints(''); setReason('');
      await load(); onChanged?.();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try { await deleteBonus(id); setConfirmDel(null); await load(); onChanged?.(); }
    catch (e: any) { setListErr(e.message); }
  };

  const total = (list || []).reduce((a, b) => a + b.points, 0);
  const field = 'bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/60';

  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#0C0C0E] overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-white">
          <Award className="w-4 h-4 text-emerald-500" /> Điểm thưởng
        </div>
        <span className="text-[11px] text-zinc-500 font-bold">Cộng điểm cho nhân viên kèm lý do — tính vào điểm tích lũy và điểm tháng</span>
      </div>

      {/* Form cộng điểm */}
      <form onSubmit={submit} className="px-5 py-4 border-b border-zinc-800 grid gap-2.5 md:grid-cols-[minmax(0,1.2fr)_110px_minmax(0,2fr)_auto]">
        <select value={empId} onChange={e => setEmpId(e.target.value)} className={field} aria-label="Nhân viên">
          <option value="">Chọn nhân viên…</option>
          {sorted.map(x => <option key={x.employee_id} value={x.employee_id}>{x.full_name}{x.department ? ` — ${x.department}` : ''}</option>)}
        </select>
        <input type="number" min={1} step={1} value={points} onChange={e => setPoints(e.target.value)} placeholder="Số điểm" className={`${field} tabular-nums`} aria-label="Số điểm cộng" />
        <input value={reason} onChange={e => setReason(e.target.value)} maxLength={500} placeholder="Lý do cộng điểm (bắt buộc)" className={field} aria-label="Lý do" />
        <button type="submit" disabled={saving}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Cộng điểm
        </button>
        {err && <p className="md:col-span-4 text-[11.5px] font-bold text-red-500">{err}</p>}
        {done && <p className="md:col-span-4 text-[11.5px] font-bold text-emerald-500">{done}</p>}
      </form>

      {/* Danh sách đã cộng trong tháng đang xem */}
      <div className="px-5 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Đã thưởng tháng {Number(month.slice(5))}/{month.slice(0, 4)}</span>
        {list && list.length > 0 && <span className="text-[11px] font-black text-emerald-500 tabular-nums">+{total} điểm · {list.length} lượt</span>}
      </div>
      {listErr && <div className="px-5 py-3 text-sm text-red-500">{listErr}</div>}
      {list && list.length === 0 && !listErr && <div className="px-5 py-6 text-center text-sm text-zinc-600">Chưa thưởng điểm nào trong tháng này</div>}
      <div className="max-h-[360px] overflow-y-auto">
        {list?.map(b => (
          <div key={b.id} className="px-5 py-2.5 border-b border-zinc-800 last:border-b-0 flex items-start gap-3">
            <span className="text-sm font-black text-emerald-500 tabular-nums w-12 flex-none">+{b.points}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-zinc-200">{b.full_name}{b.department && <span className="ml-1.5 text-[11px] font-normal text-zinc-600">{b.department}</span>}</div>
              <div className="text-[12.5px] text-zinc-400 break-words">{b.reason}</div>
              <div className="text-[10.5px] text-zinc-600 mt-0.5">{fmtDate(b.created_at)}{b.creator ? ` · bởi ${b.creator}` : ''}</div>
            </div>
            {confirmDel === b.id ? (
              <div className="flex items-center gap-1.5 flex-none">
                <button onClick={() => remove(b.id)} className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-[10.5px] font-black uppercase">Xóa</button>
                <button onClick={() => setConfirmDel(null)} className="px-2 py-1 text-[10.5px] font-black uppercase text-zinc-500">Hủy</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDel(b.id)} className="text-zinc-500 hover:text-red-500 flex-none p-1" title="Xóa lượt thưởng (cộng nhầm)" aria-label="Xóa lượt thưởng"><Trash2 className="w-3.5 h-3.5" /></button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
