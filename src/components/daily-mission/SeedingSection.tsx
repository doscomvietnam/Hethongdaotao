import * as React from 'react';
import { ExternalLink, Upload, Check, X, RefreshCw, Users, AlertCircle, Share2 } from 'lucide-react';
import {
  getSeedingState, submitSeeding, releaseSeeding, compressImage,
  type SeedingState, type SeedingGroupView, type SeedingLinkView,
} from '../../services/seedingService';

const GROUP_STYLE: Record<string, { ring: string; chip: string; dot: string }> = {
  koc: { ring: 'border-violet-500/30', chip: 'bg-violet-500/15 text-violet-300', dot: 'bg-violet-400' },
  company: { ring: 'border-sky-500/30', chip: 'bg-sky-500/15 text-sky-300', dot: 'bg-sky-400' },
  competitor: { ring: 'border-amber-500/30', chip: 'bg-amber-500/15 text-amber-300', dot: 'bg-amber-400' },
};

/** Khối "Seeding hôm nay" — nhúng trong trang Kiểm tra (ExamHubPage). */
export default function SeedingSection() {
  const [data, setData] = React.useState<SeedingState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const pendingRef = React.useRef<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { setData(await getSeedingState()); setErr(null); }
    catch (e: any) { if (!silent) setErr(e.message || 'Không tải được nhiệm vụ'); }
    finally { if (!silent) setLoading(false); }
  }, []);

  React.useEffect(() => {
    load();
    const t = setInterval(() => load(true), 15000); // cập nhật số đếm 15s/lần
    return () => clearInterval(t);
  }, [load]);

  React.useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 3500); return () => clearTimeout(t); } }, [msg]);

  const pick = (linkId: string) => { pendingRef.current = linkId; fileRef.current?.click(); };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; const linkId = pendingRef.current;
    e.target.value = '';
    if (!file || !linkId) return;
    if (!file.type.startsWith('image/')) { setMsg({ type: 'err', text: 'Vui lòng chọn file ảnh' }); return; }
    setBusy(linkId);
    try {
      const { base64, contentType } = await compressImage(file);
      setData(await submitSeeding(linkId, base64, contentType));
      setMsg({ type: 'ok', text: 'Đã nộp ảnh seeding ✓' });
    } catch (e: any) { setMsg({ type: 'err', text: e.message || 'Nộp ảnh thất bại' }); await load(true); }
    finally { setBusy(null); }
  };

  const release = async (linkId: string) => {
    setBusy(linkId);
    try { setData(await releaseSeeding(linkId)); setMsg({ type: 'ok', text: 'Đã bỏ chỗ' }); }
    catch (e: any) { setMsg({ type: 'err', text: e.message || 'Lỗi' }); }
    finally { setBusy(null); }
  };

  return (
    <section>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

      {/* Tiêu đề khối */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/30 flex items-center justify-center">
            <Share2 className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white uppercase leading-none">Seeding hằng ngày</h2>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] mt-2">
              Mở link → seeding → chụp màn hình → nộp ảnh · tối đa 2 link/nhóm{data ? ` · ${data.date}` : ''}
            </p>
          </div>
        </div>
        <button onClick={() => load()} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
          <RefreshCw className="w-3.5 h-3.5" /> Làm mới
        </button>
      </div>

      {/* Toast */}
      {msg && (
        <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold border ${msg.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
          {msg.type === 'ok' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {msg.text}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-zinc-500 text-sm">Đang tải…</div>
      ) : err ? (
        <div className="py-16 text-center text-rose-400 text-sm">{err}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {data!.groups.map((g) => <GroupCard key={g.key} g={g} busy={busy} onPick={pick} onRelease={release} />)}
        </div>
      )}
    </section>
  );
}

function GroupCard({ g, busy, onPick, onRelease }: {
  g: SeedingGroupView; busy: string | null; onPick: (id: string) => void; onRelease: (id: string) => void;
}) {
  const st = GROUP_STYLE[g.key] || GROUP_STYLE.koc;
  return (
    <div className={`rounded-2xl border ${st.ring} bg-zinc-900/50 overflow-hidden flex flex-col`}>
      <div className="p-4 border-b border-zinc-800/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${st.dot}`} />
            <span className="text-sm font-black text-zinc-100">{g.label}</span>
          </div>
          <span className={`flex items-center gap-1 text-[11px] font-black rounded-full px-2.5 py-1 ${g.groupFull ? 'bg-rose-500/15 text-rose-300' : st.chip}`}>
            <Users className="w-3 h-3" /> {g.people}/{g.maxPeople}
          </span>
        </div>
        <div className="text-[11px] text-zinc-500 mt-1.5">
          {g.groupFull ? 'Nhóm đã đủ người — chuyển nhóm khác' : `Bạn đã seed ${g.myLinksInGroup}/${g.maxLinksPerGroup} link trong nhóm`}
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        {g.links.length === 0 ? (
          <div className="text-center text-[12px] text-zinc-600 py-6">Chưa có link hôm nay</div>
        ) : g.links.map((l) => <LinkRow key={l.id} l={l} busy={busy === l.id} onPick={onPick} onRelease={onRelease} />)}
      </div>
    </div>
  );
}

function LinkRow({ l, busy, onPick, onRelease }: {
  l: SeedingLinkView; busy: boolean; onPick: (id: string) => void; onRelease: (id: string) => void;
}) {
  return (
    <div className={`rounded-xl border p-3 ${l.mine ? 'border-emerald-500/40 bg-emerald-500/5' : l.linkFull ? 'border-zinc-800 bg-zinc-900/40 opacity-70' : 'border-zinc-800 bg-zinc-900/40'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[13px] font-semibold text-zinc-200 leading-snug min-w-0">{l.title}</div>
        <span className={`flex-none text-[10.5px] font-black rounded-full px-2 py-0.5 ${l.linkFull ? 'bg-rose-500/15 text-rose-300' : l.count >= l.max ? 'bg-rose-500/15 text-rose-300' : 'bg-zinc-800 text-zinc-300'}`}>
          {l.count}/{l.max}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] font-bold text-sky-400 hover:text-sky-300">
          <ExternalLink className="w-3.5 h-3.5" /> Mở link
        </a>
        <div className="ml-auto flex items-center gap-2">
          {l.mine ? (
            <>
              <span className="flex items-center gap-1 text-[11px] font-black text-emerald-400"><Check className="w-3.5 h-3.5" /> Đã nộp</span>
              <button disabled={busy} onClick={() => onPick(l.id)} className="text-[11px] font-bold text-zinc-400 hover:text-zinc-200">Đổi ảnh</button>
              <button disabled={busy} onClick={() => onRelease(l.id)} className="text-zinc-600 hover:text-rose-400" title="Bỏ chỗ"><X className="w-3.5 h-3.5" /></button>
            </>
          ) : l.linkFull ? (
            <span className="text-[11px] font-black text-rose-300">Đầy — chọn link khác</span>
          ) : !l.canClaim ? (
            <span className="text-[11px] text-zinc-500">Không thể nộp</span>
          ) : (
            <button disabled={busy} onClick={() => onPick(l.id)} className="flex items-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-900 text-[11px] font-black rounded-lg px-3 py-1.5 disabled:opacity-50">
              <Upload className="w-3.5 h-3.5" /> {busy ? 'Đang gửi…' : 'Nộp ảnh'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
