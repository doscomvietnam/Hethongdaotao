import * as React from 'react';
import { Lightbulb, ChevronLeft, ChevronRight, Loader2, Send, RefreshCw, Search, Star, Check, X, Eye, Paperclip, FileText } from 'lucide-react';
import type { Employee } from '../../types';
import {
  PROPOSAL_CATEGORIES, CATEGORY_LABEL, PROPOSAL_STATUS_LABEL,
  createProposal, getMyProposals, withdrawProposal, adminListProposals, reviewProposal, uploadProposalFile,
  MAX_ATTACH, MAX_ATTACH_MB, ATTACH_ACCEPT,
  type Proposal, type AdminProposal, type ProposalCategory, type ProposalStatus, type ProposalAttachment,
} from '../../services/proposalService';
import { notifyPendingCountsChanged } from '../../services/redeemService';
import { fmtDate } from '../points/RedeemCard';

/** Đề xuất cải tiến: nhân viên gửi ý tưởng theo 4 mục; admin chuyển Xem xét / Duyệt (+ điểm thưởng) / Không duyệt. */
const vnMonth = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 7);
const shiftMonth = (m: string, d: number) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1 + d, 1)).toISOString().slice(0, 7);
};
const monthLabel = (m: string) => `Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}`;

const STATUS_CHIP: Record<ProposalStatus, string> = {
  reviewing: 'bg-amber-500/10 text-amber-500',
  approved: 'bg-emerald-500/10 text-emerald-500',
  rejected: 'bg-red-500/10 text-red-400',
};
const CAT_CHIP: Record<ProposalCategory, string> = {
  work: 'bg-sky-500/10 text-sky-400',
  hr: 'bg-violet-500/10 text-violet-400',
  operation: 'bg-orange-500/10 text-orange-400',
  culture: 'bg-pink-500/10 text-pink-400',
};

function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const isCurrent = month >= vnMonth();
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(shiftMonth(month, -1))} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800" aria-label="Tháng trước"><ChevronLeft className="w-4 h-4" /></button>
      <span className="min-w-[112px] text-center text-[12px] font-black uppercase tracking-widest text-zinc-300 tabular-nums">{monthLabel(month)}</span>
      <button onClick={() => onChange(shiftMonth(month, 1))} disabled={isCurrent} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Tháng sau"><ChevronRight className="w-4 h-4" /></button>
    </div>
  );
}

const fmtSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Phương án triển khai + file đính kèm (dùng chung cho nhân viên và admin) */
function PlanBlock({ plan, attachments }: { plan: string | null; attachments: ProposalAttachment[] }) {
  if (!plan && !attachments?.length) return null;
  return (
    <div className="mt-2 rounded-xl border border-zinc-800 px-3 py-2.5 space-y-2">
      <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Phương án triển khai</p>
      {plan && <p className="text-[13px] text-zinc-300 whitespace-pre-wrap break-words">{plan}</p>}
      {attachments?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map(a => (
            <a key={a.path} href={a.url || undefined} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 max-w-full rounded-lg bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1.5 text-[11.5px] font-bold text-sky-500">
              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{a.name}</span>
              <span className="text-zinc-500 font-normal flex-shrink-0">{fmtSize(a.size)}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProposalsPage({ employee }: { employee: Employee }) {
  const isAdmin = employee.role === 'admin';
  const [tab, setTab] = React.useState<'review' | 'mine'>(isAdmin ? 'review' : 'mine');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col gap-4 border-l-4 border-yellow-500 pl-5 sm:pl-8 py-2">
        <div className="flex items-center gap-3 sm:gap-4">
          <Lightbulb className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-500" />
          <h1 className="text-[1.75rem] sm:text-5xl font-black tracking-tighter text-white uppercase leading-none">Đề xuất cải tiến</h1>
        </div>
        <p className="text-zinc-500 font-bold uppercase tracking-wider sm:tracking-widest text-xs sm:pl-12">
          Gửi ý tưởng làm công ty tốt hơn · đề xuất được duyệt sẽ được cộng điểm thưởng
        </p>
      </header>

      {isAdmin && (
        <div className="flex gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 w-fit">
          {([['review', 'Duyệt đề xuất'], ['mine', 'Gửi đề xuất']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors ${tab === id ? 'bg-yellow-500 text-zinc-950' : 'text-zinc-500 hover:text-zinc-200'}`}>{label}</button>
          ))}
        </div>
      )}

      {tab === 'review' && isAdmin ? <AdminReview /> : <EmployeeSide />}
    </div>
  );
}

// ============================================================
// NHÂN VIÊN: gửi đề xuất + xem đề xuất của mình theo tháng
// ============================================================
function EmployeeSide() {
  const [month, setMonth] = React.useState(vnMonth());
  const [rows, setRows] = React.useState<Proposal[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try { const r = await getMyProposals(month); setRows(r.proposals); setErr(null); }
    catch (e: any) { setErr(e.message); setRows([]); }
  }, [month]);
  React.useEffect(() => { setRows(null); load(); }, [load]);

  const withdraw = async (id: string) => {
    if (!confirm('Rút lại đề xuất này?')) return;
    try { await withdrawProposal(id); load(); } catch (e: any) { setErr(e.message); }
  };

  const earned = (rows || []).reduce((t, r) => t + (r.status === 'approved' ? r.points : 0), 0);

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
      <ProposalForm onSent={() => { setMonth(vnMonth()); load(); }} />

      <section className="rounded-2xl border border-zinc-800 bg-[#0C0C0E] overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3 flex-wrap">
          <p className="text-sm font-black uppercase tracking-tight text-white">Đề xuất của tôi</p>
          <div className="ml-auto"><MonthPicker month={month} onChange={setMonth} /></div>
        </div>
        {rows && rows.length > 0 && (
          <div className="px-5 py-2.5 border-b border-zinc-800 flex gap-4 text-[11px] font-bold text-zinc-500">
            <span>{rows.length} đề xuất</span>
            <span className="text-emerald-500">{rows.filter(r => r.status === 'approved').length} được duyệt</span>
            {earned > 0 && <span className="text-amber-500 inline-flex items-center gap-1"><Star className="w-3 h-3" />+{earned} điểm</span>}
          </div>
        )}
        {err && <p className="px-5 py-3 text-sm text-red-400">{err}</p>}
        {!rows && <div className="px-5 py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>}
        {rows && rows.length === 0 && !err && <p className="px-5 py-10 text-center text-sm text-zinc-600">Chưa có đề xuất nào trong {monthLabel(month).toLowerCase()}</p>}
        <div>
          {rows?.map(r => (
            <div key={r.id} className="px-5 py-3.5 border-b border-zinc-800 last:border-b-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${CAT_CHIP[r.category]}`}>{CATEGORY_LABEL[r.category]}</span>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${STATUS_CHIP[r.status]}`}>{PROPOSAL_STATUS_LABEL[r.status]}</span>
                {r.status === 'approved' && r.points > 0 && <span className="text-[11px] font-black text-amber-500 tabular-nums">+{r.points} điểm</span>}
                <span className="ml-auto text-[10.5px] text-zinc-500">{fmtDate(r.created_at)}</span>
              </div>
              <p className="text-sm text-zinc-300 mt-2 whitespace-pre-wrap break-words">{r.content}</p>
              <PlanBlock plan={r.plan} attachments={r.attachments} />
              {r.admin_note && (
                <p className={`mt-2 text-[11.5px] rounded-lg px-2.5 py-1.5 ${r.status === 'rejected' ? 'text-red-500 bg-red-500/10' : 'text-zinc-300 bg-yellow-500/10'}`}>Phản hồi: {r.admin_note}</p>
              )}
              {r.status === 'reviewing' && (
                <button onClick={() => withdraw(r.id)} className="mt-1.5 text-[10.5px] font-bold text-zinc-500 hover:text-red-400">Rút lại</button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProposalForm({ onSent }: { onSent: () => void }) {
  const [category, setCategory] = React.useState<ProposalCategory | null>(null);
  const [content, setContent] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) { setErr('Chọn mục đề xuất'); return; }
    if (content.trim().length < 10) { setErr('Ý tưởng đề xuất cần ít nhất 10 ký tự'); return; }
    if (!files.length) { setErr('Đính kèm file phương án triển khai'); return; }
    setSaving(true); setErr(null); setOk(false);
    try {
      const attachments: ProposalAttachment[] = [];
      for (const f of files) attachments.push(await uploadProposalFile(f));
      await createProposal(category, content.trim(), attachments);
      setContent(''); setFiles([]); setCategory(null); setOk(true); onSent();
    }
    catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = [...files];
    for (const f of Array.from(list)) {
      if (f.size > MAX_ATTACH_MB * 1024 * 1024) { setErr(`File "${f.name}" vượt quá ${MAX_ATTACH_MB} MB`); continue; }
      if (picked.length >= MAX_ATTACH) { setErr(`Đính kèm tối đa ${MAX_ATTACH} file`); break; }
      if (!picked.some(p => p.name === f.name && p.size === f.size)) picked.push(f);
    }
    setFiles(picked);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-zinc-800 bg-[#0C0C0E] p-5 lg:p-6 space-y-5">
      <div>
        <p className="text-sm font-black uppercase tracking-tight text-white">Gửi đề xuất mới</p>
        <p className="text-[11px] text-zinc-500 font-bold mt-1">Đề xuất gửi đến quản trị viên để xem xét. Được duyệt sẽ cộng điểm thưởng vào điểm tích lũy.</p>
      </div>

      <div className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Mục đề xuất <span className="text-red-400">*</span></span>
        <div className="grid grid-cols-2 gap-2">
          {PROPOSAL_CATEGORIES.map(c => (
            <button type="button" key={c.id} onClick={() => { setCategory(c.id); setErr(null); }}
              className={`text-left rounded-xl border px-3.5 py-3 transition-colors ${category === c.id ? 'border-yellow-500 bg-yellow-500/10' : 'border-zinc-800 hover:border-zinc-600'}`}>
              <p className={`text-[12.5px] font-black uppercase tracking-wide ${category === c.id ? 'text-yellow-500' : 'text-zinc-200'}`}>{c.label}</p>
              <p className="text-[10.5px] text-zinc-500 mt-0.5 leading-snug">{c.hint}</p>
            </button>
          ))}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Ý tưởng đề xuất <span className="text-red-400">*</span></span>
        <textarea value={content} onChange={e => { setContent(e.target.value); setOk(false); }} maxLength={3000} rows={7}
          placeholder="Vấn đề hiện tại là gì? Bạn đề xuất làm thế nào? Lợi ích mang lại?"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-zinc-200 outline-none focus:border-yellow-500/60 resize-y" />
        <span className="block text-right text-[10px] text-zinc-600 tabular-nums">{content.length}/3000</span>
      </label>

      <div className="space-y-1.5">
        <span className="block text-[10px] font-black uppercase tracking-widest text-zinc-400">Phương án triển khai <span className="text-red-400">*</span> <span className="text-zinc-600 normal-case tracking-normal font-bold">(đính kèm file)</span></span>
        <input ref={fileRef} type="file" multiple accept={ATTACH_ACCEPT} className="hidden" onChange={e => addFiles(e.target.files)} />
        <div className="flex flex-wrap items-center gap-1.5">
          {files.map((f, i) => (
            <span key={f.name + f.size} className="inline-flex items-center gap-1.5 max-w-full rounded-lg bg-sky-500/10 px-2.5 py-1.5 text-[11.5px] font-bold text-zinc-300">
              <FileText className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
              <span className="truncate">{f.name}</span>
              <span className="text-zinc-500 font-normal flex-shrink-0">{fmtSize(f.size)}</span>
              <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} disabled={saving}
                className="text-zinc-500 hover:text-red-400" aria-label={`Bỏ ${f.name}`}><X className="w-3.5 h-3.5" /></button>
            </span>
          ))}
          {files.length < MAX_ATTACH && (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-700 hover:border-yellow-500/60 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-400 hover:text-yellow-500">
              <Paperclip className="w-3.5 h-3.5" /> Đính kèm file
            </button>
          )}
        </div>
        <p className="text-[10px] text-zinc-600">Tối đa {MAX_ATTACH} file, mỗi file ≤ {MAX_ATTACH_MB} MB (PDF, Word, Excel, PowerPoint, ảnh, ZIP…)</p>
      </div>

      {err && <p className="text-[11.5px] font-bold text-red-400">{err}</p>}
      {ok && <p className="text-[11.5px] font-bold text-emerald-500">Đã gửi đề xuất — quản trị viên sẽ xem xét và phản hồi qua thông báo.</p>}

      <button type="submit" disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-zinc-950 text-[11px] font-black uppercase tracking-widest">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {saving && files.length ? 'Đang tải file…' : 'Gửi đề xuất'}
      </button>
    </form>
  );
}

// ============================================================
// ADMIN: danh sách đề xuất theo tháng, lọc + duyệt
// ============================================================
const STATUS_FILTERS: { id: ProposalStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Tất cả' }, { id: 'reviewing', label: 'Xem xét' },
  { id: 'approved', label: 'Duyệt' }, { id: 'rejected', label: 'Không duyệt' },
];

function AdminReview() {
  const [month, setMonth] = React.useState(vnMonth());
  const [rows, setRows] = React.useState<AdminProposal[] | null>(null);
  const [reviewingAll, setReviewingAll] = React.useState(0);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<ProposalStatus | 'all'>('all');
  const [cat, setCat] = React.useState<ProposalCategory | 'all'>('all');
  const [q, setQ] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try { const r = await adminListProposals(month, 'all'); setRows(r.proposals); setReviewingAll(r.reviewing); setErr(null); }
    catch (e: any) { setErr(e.message); setRows([]); }
    finally { setLoading(false); }
  }, [month]);
  React.useEffect(() => { setRows(null); load(); }, [load]);

  const all = rows || [];
  const kw = q.trim().toLowerCase();
  const shown = all.filter(r =>
    (status === 'all' || r.status === status) && (cat === 'all' || r.category === cat) &&
    (!kw || r.full_name.toLowerCase().includes(kw) || (r.department || '').toLowerCase().includes(kw) || r.content.toLowerCase().includes(kw)));
  const count = (s: ProposalStatus) => all.filter(r => r.status === s).length;
  const totalPoints = all.reduce((t, r) => t + (r.status === 'approved' ? r.points : 0), 0);
  const people = new Set(all.map(r => r.employee_id)).size;

  const stats = [
    { label: 'Đề xuất trong tháng', value: all.length, sub: `${people} người đề xuất`, cls: 'text-white' },
    { label: 'Xem xét', value: count('reviewing'), sub: reviewingAll > count('reviewing') ? `${reviewingAll} chờ ở mọi tháng` : 'đang chờ xử lý', cls: 'text-amber-500' },
    { label: 'Duyệt', value: count('approved'), sub: `${count('rejected')} không duyệt`, cls: 'text-emerald-500' },
    { label: 'Điểm thưởng', value: totalPoints, sub: 'đã cộng trong tháng', cls: 'text-amber-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <MonthPicker month={month} onChange={setMonth} />
        <button onClick={load} className="p-1.5 text-zinc-500 hover:text-zinc-200" aria-label="Làm mới"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="rounded-2xl border border-zinc-800 bg-[#0C0C0E] px-5 py-4">
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">{s.label}</p>
            <p className={`text-3xl font-black tabular-nums mt-1.5 leading-none ${s.cls}`}>{s.value}</p>
            <p className="text-[10.5px] text-zinc-500 font-bold mt-1.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-[#0C0C0E] overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button key={f.id} onClick={() => setStatus(f.id)}
                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-black uppercase tracking-widest ${status === f.id ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-500 hover:text-zinc-200'}`}>
                {f.label}{f.id !== 'all' && ` · ${count(f.id)}`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 lg:ml-auto flex-wrap">
            <select value={cat} onChange={e => setCat(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[12px] font-bold text-zinc-300 outline-none">
              <option value="all">Mọi mục</option>
              {PROPOSAL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm người đề xuất, nội dung…"
                className="w-56 bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-[12px] text-zinc-200 outline-none" />
            </div>
          </div>
        </div>

        {err && <p className="px-5 py-3 text-sm text-red-400">{err}</p>}
        {!rows && <div className="px-5 py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>}
        {rows && shown.length === 0 && !err && <p className="px-5 py-10 text-center text-sm text-zinc-600">Không có đề xuất nào</p>}
        <div>
          {shown.map(r => <AdminRow key={r.id} r={r} onDone={() => { load(); notifyPendingCountsChanged(); }} />)}
        </div>
      </section>
    </div>
  );
}

function AdminRow({ r, onDone }: { r: AdminProposal; onDone: () => void }) {
  // Khung xử lý luôn hiện: chọn trạng thái + điểm thưởng (chỉ khi Duyệt) + phản hồi cho nhân viên → Lưu
  const [status, setStatus] = React.useState<ProposalStatus>(r.status);
  const [points, setPoints] = React.useState(r.points ? String(r.points) : '');
  const [note, setNote] = React.useState(r.admin_note || '');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  React.useEffect(() => {
    setStatus(r.status); setPoints(r.points ? String(r.points) : ''); setNote(r.admin_note || '');
  }, [r.status, r.points, r.admin_note]);

  const pts = status === 'approved' ? (points.trim() === '' ? 0 : Number(points)) : 0;
  const dirty = status !== r.status || pts !== r.points || note.trim() !== (r.admin_note || '');

  const save = async () => {
    setErr(null); setSaved(false);
    if (!Number.isInteger(pts) || pts < 0) { setErr('Điểm thưởng phải là số nguyên ≥ 0'); return; }
    if (pts > 1000) { setErr('Mỗi đề xuất thưởng tối đa 1000 điểm'); return; }
    setBusy(true);
    try { await reviewProposal(r.id, status, pts, note.trim()); setSaved(true); onDone(); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const STATUS_BTN: { id: ProposalStatus; label: string; icon: typeof Eye; on: string }[] = [
    { id: 'reviewing', label: 'Xem xét', icon: Eye, on: 'bg-amber-500 text-white' },
    { id: 'approved', label: 'Duyệt', icon: Check, on: 'bg-emerald-500 text-white' },
    { id: 'rejected', label: 'Không duyệt', icon: X, on: 'bg-red-500 text-white' },
  ];

  return (
    <div className="px-5 py-4 border-b border-zinc-800 last:border-b-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-bold text-zinc-200">{r.full_name}</span>
        {r.department && <span className="text-[11px] text-zinc-600">{r.department}</span>}
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${CAT_CHIP[r.category]}`}>{CATEGORY_LABEL[r.category]}</span>
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${STATUS_CHIP[r.status]}`}>{PROPOSAL_STATUS_LABEL[r.status]}</span>
        {r.status === 'approved' && r.points > 0 && <span className="text-[11px] font-black text-amber-500 tabular-nums">+{r.points} điểm</span>}
      </div>
      <p className="text-sm text-zinc-300 mt-2 whitespace-pre-wrap break-words">{r.content}</p>
      <PlanBlock plan={r.plan} attachments={r.attachments} />
      <p className="text-[10.5px] text-zinc-500 mt-1.5">
        Gửi {fmtDate(r.created_at)}
        {r.reviewed_at && <> · {PROPOSAL_STATUS_LABEL[r.status]} {fmtDate(r.reviewed_at)}{r.reviewer ? ` bởi ${r.reviewer}` : ''}</>}
      </p>

      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest w-16">Trạng thái</span>
            <div className="flex gap-1">
              {STATUS_BTN.map(b => (
                <button key={b.id} onClick={() => { setStatus(b.id); setSaved(false); }} disabled={busy}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10.5px] font-black uppercase ${status === b.id ? b.on : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}>
                  <b.icon className="w-3.5 h-3.5" />{b.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 lg:ml-4" title={status === 'approved' ? '' : 'Chọn Duyệt để cộng điểm thưởng'}>
            <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest inline-flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" />Điểm thưởng</span>
            <input type="number" min={0} max={1000} value={status === 'approved' ? points : ''} disabled={status !== 'approved' || busy}
              onChange={e => { setPoints(e.target.value); setSaved(false); }} placeholder={status === 'approved' ? '0' : 'chỉ khi Duyệt'}
              className="w-28 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 tabular-nums outline-none disabled:opacity-50 placeholder:text-[11px]" />
          </label>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <textarea value={note} onChange={e => { setNote(e.target.value); setSaved(false); }} maxLength={1000} rows={2} disabled={busy}
            placeholder="Trả lời nhân viên — VD: đang xem xét cùng phòng Vận hành, dự kiến phản hồi trong tuần…"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none resize-y" />
          <button onClick={save} disabled={busy || !dirty}
            className="self-end sm:self-stretch flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-[10.5px] font-black uppercase tracking-widest disabled:opacity-40">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Lưu & báo NV
          </button>
        </div>
        {err && <p className="text-[11.5px] font-bold text-red-400">{err}</p>}
        {saved && !dirty && <p className="text-[11.5px] font-bold text-emerald-500">Đã lưu — nhân viên đã nhận thông báo.</p>}
      </div>
    </div>
  );
}
