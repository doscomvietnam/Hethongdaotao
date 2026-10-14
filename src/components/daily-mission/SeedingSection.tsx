import * as React from 'react';
import { ExternalLink, Upload, Check, X, RefreshCw, Users, AlertCircle, Share2, Clock, ClipboardPaste, ImagePlus, Loader2 } from 'lucide-react';
import {
  getSeedingState, getCachedSeedingState, submitSeeding, releaseSeeding, claimSeeding, compressImage,
  getOpenedLinks, markLinkOpened, unmarkLinkOpened, SEED_WAIT_MS,
  type SeedingState, type SeedingGroupView, type SeedingLinkView,
} from '../../services/seedingService';

const GROUP_STYLE: Record<string, { ring: string; chip: string; dot: string; head: string; title: string }> = {
  koc: { ring: 'border-violet-500/40', chip: 'bg-violet-500/15 text-violet-300', dot: 'bg-violet-400', head: 'bg-violet-500/10', title: 'text-violet-400' },
  company: { ring: 'border-sky-500/40', chip: 'bg-sky-500/15 text-sky-300', dot: 'bg-sky-400', head: 'bg-sky-500/10', title: 'text-sky-400' },
  competitor: { ring: 'border-amber-500/40', chip: 'bg-amber-500/15 text-amber-300', dot: 'bg-amber-400', head: 'bg-amber-500/10', title: 'text-amber-400' },
};

/** Khối "Seeding hôm nay" — nhúng trong trang Kiểm tra (ExamHubPage). */
export default function SeedingSection() {
  const [data, setData] = React.useState<SeedingState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const pendingRef = React.useRef<string | null>(null);
  // linkId → thời điểm bấm "Mở link" lần đầu; đủ SEED_WAIT_MS mới được nộp ảnh
  const [opened, setOpened] = React.useState<Record<string, number>>({});
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => { getOpenedLinks().then(setOpened); }, []);
  const onOpen = (linkId: string) => {
    setOpened((prev) => (prev[linkId] !== undefined ? prev : { ...prev, [linkId]: Date.now() }));
    markLinkOpened(linkId);
  };
  // Còn link đang chờ → đếm ngược mỗi giây
  const waiting = Object.values(opened).some((t) => now - t < SEED_WAIT_MS);
  React.useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [waiting]);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const lastLoadRef = React.useRef(0);
  const load = React.useCallback(async (silent = false) => {
    lastLoadRef.current = Date.now();
    if (!silent) setLoading(true);
    try { setData(await getSeedingState()); setErr(null); }
    catch (e: any) { if (!silent) setErr(e.message || 'Không tải được nhiệm vụ'); }
    finally { if (!silent) setLoading(false); }
  }, []);


  React.useEffect(() => {
    let alive = true;
    // Có dữ liệu lần trước (cùng tài khoản, cùng ngày) → hiện ngay, tải mới ở nền; chưa có → tải bình thường
    getCachedSeedingState().then((cached) => {
      if (!alive) return;
      if (cached) { setData(cached); setLoading(false); load(true); }
      else load();
    });
    // Cập nhật số đếm 60s/lần, CHỈ khi tab đang hiển thị (trước đây 15s kể cả tab ẩn → sinh rất nhiều log Supabase).
    // Quay lại tab sau ≥20s → tải mới ngay. Giới hạn lượt vẫn được máy chủ kiểm lại khi nộp ảnh.
    const visible = () => document.visibilityState === 'visible';
    const t = setInterval(() => { if (visible()) load(true); }, 60_000);
    const onVis = () => { if (visible() && Date.now() - lastLoadRef.current > 20_000) load(true); };
    document.addEventListener('visibilitychange', onVis);
    return () => { alive = false; clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [load]);

  React.useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 3500); return () => clearTimeout(t); } }, [msg]);

  // Bấm "Nộp ảnh" → mở hộp nộp ảnh cho link đó (dán Ctrl+V / dán từ bộ nhớ tạm / chọn file / kéo thả)
  const [pickFor, setPickFor] = React.useState<string | null>(null);
  const pick = (linkId: string) => setPickFor(linkId);

  // Bấm "Mở link" lần đầu = GIỮ CHỖ trên máy chủ rồi mới mở video. Đủ 2 người giữ/nộp → báo ngay, không mở.
  // Mở tab trống NGAY trong cú bấm (tránh trình duyệt chặn popup) rồi mới điền link khi giữ chỗ xong.
  const openLink = async (l: SeedingLinkView) => {
    const w = window.open('', '_blank');
    setBusy(l.id);
    try {
      setData(await claimSeeding(l.id));
      onOpen(l.id);
      if (w) { w.opener = null; w.location.href = l.url; }
      else setMsg({ type: 'ok', text: 'Đã giữ chỗ — bấm "Mở lại link" để xem video' });
    } catch (e: any) {
      w?.close();
      setMsg({ type: 'err', text: e.message || 'Không mở được link' });
      await load(true);
    } finally { setBusy(null); }
  };
  const chooseFile = () => { pendingRef.current = pickFor; fileRef.current?.click(); };

  const submitFile = async (file: File, linkId: string) => {
    if (!file.type.startsWith('image/')) { setMsg({ type: 'err', text: 'Vui lòng chọn file ảnh' }); return; }
    setBusy(linkId);
    try {
      const { base64, contentType } = await compressImage(file);
      setData(await submitSeeding(linkId, base64, contentType));
      setMsg({ type: 'ok', text: 'Đã nộp ảnh seeding ✓' });
      setPickFor(null);
    } catch (e: any) { setMsg({ type: 'err', text: e.message || 'Nộp ảnh thất bại' }); await load(true); }
    finally { setBusy(null); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; const linkId = pendingRef.current;
    e.target.value = '';
    if (!file || !linkId) return;
    await submitFile(file, linkId);
  };
  const pickTitle = pickFor ? data?.groups.flatMap((g) => g.links).find((l) => l.id === pickFor)?.title || '' : '';

  const release = async (linkId: string) => {
    setBusy(linkId);
    try {
      setData(await releaseSeeding(linkId)); setMsg({ type: 'ok', text: 'Đã bỏ chỗ' });
      setOpened((prev) => { const n = { ...prev }; delete n[linkId]; return n; }); unmarkLinkOpened(linkId);
    }
    catch (e: any) { setMsg({ type: 'err', text: e.message || 'Lỗi' }); }
    finally { setBusy(null); }
  };

  return (
    <section>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
      {pickFor && (
        <SubmitDialog title={pickTitle} busy={busy === pickFor} onClose={() => busy !== pickFor && setPickFor(null)}
          onChooseFile={chooseFile} onImage={(f) => submitFile(f, pickFor)}
          onError={(text) => setMsg({ type: 'err', text })} />
      )}

      {/* Tiêu đề khối */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/30 flex items-center justify-center">
            <Share2 className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white uppercase leading-none">Seeding hằng ngày</h2>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.12em] sm:tracking-[0.3em] mt-2">
              Mở link → seeding → chụp màn hình → nộp ảnh · bắt buộc 1 link/ngày, tự nguyện thêm 2{data ? ` · ${data.date}` : ''}
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
        <>
          <DailyProgress st={data!} />
          <div className="grid gap-4 md:grid-cols-3 md:grid-rows-[auto_1fr] md:gap-y-0">
            {data!.groups.map((g) => <GroupCard key={g.key} g={g} busy={busy} onPick={pick} onRelease={release} opened={opened} now={now} onOpen={onOpen} onOpenLink={openLink} dayFull={data!.dayFull}
              holdFull={!data!.dayFull && data!.myTodayTotal + (data!.openClaims || 0) >= data!.maxPerDay} />)}
          </div>
        </>
      )}
    </section>
  );
}

/** Thanh tiến độ: hôm nay đã seed x / mục tiêu tối thiểu 4 link. */
/** Tiến độ ngày: 1 lượt bắt buộc + lượt tự nguyện, kèm điểm seeding tích lũy. */
function DailyProgress({ st }: { st: SeedingState }) {
  const reqDone = Math.min(st.myTodayTotal, st.requiredPerDay);
  const optDone = Math.max(0, Math.min(st.myTodayTotal - st.requiredPerDay, st.optionalPerDay));
  const reqOk = reqDone >= st.requiredPerDay;
  return (
    <div className={`mb-4 rounded-2xl border p-4 ${reqOk ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-400/15 flex items-center justify-center text-xl">⭐</div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Điểm seeding tháng này</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-500 leading-none tabular-nums">{st.points}</span>
              <span className="text-xs font-bold text-zinc-500">điểm</span>
              {st.pointsToday > 0 && <span className="text-xs font-black text-emerald-500">+{st.pointsToday} hôm nay</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className={`rounded-xl border px-3 py-2 ${reqOk ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-amber-500/40 bg-amber-500/10'}`}>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Bắt buộc</div>
          <div className={`text-sm font-black ${reqOk ? 'text-emerald-500' : 'text-amber-500'}`}>
            {reqOk ? `✓ Đã xong ${reqDone}/${st.requiredPerDay}` : `Còn ${st.requiredPerDay - reqDone} link`}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tự nguyện (không bắt buộc)</div>
          <div className="text-sm font-black text-zinc-200">{optDone}/{st.optionalPerDay} link</div>
        </div>
      </div>
      {st.dayFull && <div className="text-[11px] font-black text-emerald-500 mt-2">Hôm nay bạn đã seed đủ {st.maxPerDay} lượt — cảm ơn bạn!</div>}
    </div>
  );
}

function GroupCard({ g, busy, onPick, onRelease, opened, now, onOpen, onOpenLink, dayFull, holdFull }: {
  g: SeedingGroupView; busy: string | null; onPick: (id: string) => void; onRelease: (id: string) => void;
  opened: Record<string, number>; now: number; onOpen: (id: string) => void; onOpenLink: (l: SeedingLinkView) => void; dayFull: boolean;
  holdFull: boolean;   // đang giữ chỗ đủ số lượt còn lại trong ngày → phải nộp ảnh link đang mở trước
}) {
  const st = GROUP_STYLE[g.key] || GROUP_STYLE.koc;
  // Link nộp được / đã nộp hôm nay lên trước, link không làm được xuống cuối
  const rank = (l: SeedingLinkView) => (l.mineToday || l.claimedAt ? 0 : l.canClaim ? 1 : 2);
  const links = [...g.links].sort((a, b) => rank(a) - rank(b));
  return (
    <div className={`rounded-2xl border-2 ${st.ring} bg-zinc-900/50 overflow-hidden flex flex-col md:grid md:grid-rows-subgrid md:row-span-2`}>
      <div className={`p-4 border-b border-zinc-800/80 ${st.head}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`w-3 h-3 flex-none rounded-full ${st.dot}`} />
            <span className={`text-lg sm:text-xl font-black uppercase tracking-tight leading-tight ${st.title}`}>{g.label}</span>
          </div>
          <span className={`flex items-center gap-1 text-[11px] font-black rounded-full px-2.5 py-1 ${g.groupFull ? 'bg-rose-500/15 text-rose-300' : st.chip}`} title="Số người tham gia nhóm hôm nay">
            <Users className="w-3 h-3" /> {g.people}/{g.maxPeople}
          </span>
        </div>
        <div className="text-[11px] text-zinc-500 mt-1.5">
          {g.groupFull
            ? 'Nhóm đã đủ người hôm nay — chuyển nhóm khác'
            : `Hôm nay bạn đã seed ${g.myLinksInGroup}/${g.maxLinksPerGroup} link trong nhóm`}
        </div>
        {!g.groupFull && g.maxLinksPerGroup > 2 && (
          <div className="text-[10.5px] text-emerald-400 mt-1">2 nhóm kia đã đầy → bạn được seed {g.maxLinksPerGroup} link ở nhóm này</div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        {links.length === 0 ? (
          <div className="text-center text-[12px] text-zinc-600 py-6">Chưa có link</div>
        ) : links.map((l) => <LinkRow key={l.id} l={l} busy={busy === l.id} onPick={onPick} onRelease={onRelease}
            openedAt={opened[l.id] ?? (l.claimedAt ? Date.parse(l.claimedAt) : undefined)} now={now} onOpen={onOpen} onOpenLink={onOpenLink} dayFull={dayFull} holdFull={holdFull} />)}
      </div>
    </div>
  );
}

function LinkRow({ l, busy, onPick, onRelease, openedAt, now, onOpen, onOpenLink, dayFull, holdFull }: {
  l: SeedingLinkView; busy: boolean; onPick: (id: string) => void; onRelease: (id: string) => void;
  openedAt: number | undefined; now: number; onOpen: (id: string) => void; onOpenLink: (l: SeedingLinkView) => void; dayFull: boolean;
  holdFull: boolean;
}) {
  // Máy chủ có giữ chỗ (trả về claimedAt) → "đã mở" = đang giữ chỗ; chỗ hết hạn thì phải bấm Mở link lại.
  // Máy chủ chưa hỗ trợ (chưa chạy SQL) → dựa vào lần bấm Mở link trên máy này như cũ.
  const serverClaims = l.claimedAt !== undefined;
  const opened = serverClaims ? !!l.claimedAt : openedAt !== undefined;
  const needOpen = !opened && !l.mineToday && l.canClaim;
  const held = l.held || 0;
  const waitLeft = opened ? Math.max(0, Math.ceil((openedAt + SEED_WAIT_MS - now) / 1000)) : 0;
  const waitingHere = opened && waitLeft > 0 && !l.mineToday && l.canClaim;
  const dim = !l.mineToday && !l.canClaim;
  return (
    <div className={`rounded-xl border p-3 ${l.mineToday ? 'border-emerald-500/40 bg-emerald-500/5' : dim ? 'border-zinc-800 bg-zinc-900/40 opacity-60' : 'border-zinc-800 bg-zinc-900/40'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[13px] font-semibold text-zinc-200 leading-snug min-w-0">{l.title}</div>
        <div className="flex-none flex flex-col items-end gap-1">
          <span className={`text-[10.5px] font-black rounded-full px-2 py-0.5 ${l.today + held >= l.dailyMax ? 'bg-rose-500/15 text-rose-300' : 'bg-zinc-800 text-zinc-300'}`} title="Lượt seeding hôm nay (đã nộp)">
            Hôm nay {l.today}/{l.dailyMax}
          </span>
          {held > 0 && <span className="text-[10px] font-black text-amber-500" title="Số người đã bấm Mở link, chưa nộp ảnh">{held} người đang seed</span>}
          <span className="text-[10px] font-bold text-zinc-500" title="Tổng lượt seeding của link">Tổng {l.total}/{l.totalMax}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        {needOpen ? (
          <button type="button" disabled={busy} onClick={() => onOpenLink(l)}
            className="flex items-center gap-1.5 text-[11px] font-black text-white bg-sky-500 hover:bg-sky-400 rounded-lg px-3 py-1.5 disabled:opacity-60">
            <ExternalLink className="w-3.5 h-3.5" /> {busy ? 'Đang giữ chỗ…' : 'Mở link'}
          </button>
        ) : (
          <a href={l.url} target="_blank" rel="noopener noreferrer" onClick={() => onOpen(l.id)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-sky-400 hover:text-sky-300">
            <ExternalLink className="w-3.5 h-3.5" /> {opened ? 'Mở lại link' : 'Xem video'}
          </a>
        )}
        <div className="ml-auto flex items-center gap-2">
          {l.mineToday ? (
            <>
              <span className="flex items-center gap-1 text-[11px] font-black text-emerald-400"><Check className="w-3.5 h-3.5" /> Đã nộp <span className="text-amber-500">+1 điểm</span></span>
              <button disabled={busy} onClick={() => onPick(l.id)} className="text-[11px] font-bold text-zinc-400 hover:text-zinc-200">Đổi ảnh</button>
              <button disabled={busy} onClick={() => onRelease(l.id)} className="text-zinc-600 hover:text-rose-400" title="Bỏ lượt"><X className="w-3.5 h-3.5" /></button>
            </>
          ) : l.mine ? (
            <span className="text-[11px] text-zinc-500">Bạn đã seed link này trước đó</span>
          ) : l.linkFull ? (
            <span className="text-[11px] font-black text-rose-300">{l.today >= l.dailyMax ? 'Đủ lượt hôm nay — chọn link khác' : 'Đủ người đang seed — chọn link khác'}</span>
          ) : !l.canClaim ? (
            <span className="text-[11px] text-zinc-500">{dayFull ? 'Đã đủ lượt hôm nay' : holdFull ? 'Nộp ảnh link đang mở trước' : 'Đã đủ link trong nhóm'}</span>
          ) : (
            needOpen ? (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500" title="Bấm Mở link để seeding trước, sau đó mới nộp ảnh">
                <Upload className="w-3.5 h-3.5" /> Mở link trước để nộp ảnh
              </span>
            ) : waitingHere ? (
              <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-500" title="Xem hết video rồi mới nộp ảnh">
                <Clock className="w-3.5 h-3.5" /> Bạn cần xem hết video để nộp ảnh
                {l.claimedAt && <button disabled={busy} onClick={() => onRelease(l.id)} className="ml-1 text-zinc-500 hover:text-rose-400" title="Bỏ giữ chỗ (nhường cho người khác)"><X className="w-3.5 h-3.5" /></button>}
              </span>
            ) : (
              <button disabled={busy} onClick={() => onPick(l.id)} className="flex items-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-900 text-[11px] font-black rounded-lg px-3 py-1.5 disabled:opacity-50">
                <Upload className="w-3.5 h-3.5" /> {busy ? 'Đang gửi…' : 'Nộp ảnh'}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/** Hộp nộp ảnh: dán (Ctrl+V / ⌘V / nhấn giữ → Dán), nút "Dán từ bộ nhớ tạm", chọn file, hoặc kéo thả ảnh. */
function SubmitDialog({ title, busy, onClose, onChooseFile, onImage, onError }: {
  title: string; busy: boolean; onClose: () => void; onChooseFile: () => void;
  onImage: (f: File) => void; onError: (text: string) => void;
}) {
  const [drag, setDrag] = React.useState(false);
  const zoneRef = React.useRef<HTMLDivElement>(null);
  const canReadClipboard = typeof navigator !== 'undefined' && !!(navigator.clipboard && (navigator.clipboard as any).read);

  const asFile = (blob: Blob) =>
    blob instanceof File ? blob : new File([blob], `dan-anh.${(blob.type.split('/')[1] || 'png')}`, { type: blob.type || 'image/png' });

  // Dán ở bất kỳ đâu khi hộp đang mở
  React.useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = [...(e.clipboardData?.items || [])];
      const img = items.find((it) => it.kind === 'file' && it.type.startsWith('image/'));
      e.preventDefault();
      if (zoneRef.current) zoneRef.current.textContent = '';
      if (busy) return;
      const f = img?.getAsFile();
      if (f) onImage(asFile(f)); else onError('Bộ nhớ tạm không có ảnh — hãy sao chép (copy) ảnh chụp màn hình rồi dán lại');
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('paste', onPaste); window.removeEventListener('keydown', onKey); };
  }, [busy, onImage, onError, onClose]);

  const readClipboard = async () => {
    try {
      const items = await (navigator.clipboard as any).read();
      for (const it of items) {
        const type = (it.types as string[]).find((t) => t.startsWith('image/'));
        if (type) { onImage(asFile(await it.getType(type))); return; }
      }
      onError('Bộ nhớ tạm không có ảnh — hãy sao chép (copy) ảnh rồi thử lại');
    } catch {
      onError('Trình duyệt chưa cho đọc bộ nhớ tạm — hãy nhấn giữ vào ô và chọn "Dán", hoặc bấm Ctrl+V');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'));
    if (f && !busy) onImage(f); else if (!f) onError('Vui lòng thả file ảnh');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[#0C0C0E] border border-zinc-800 p-5 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-black text-white uppercase tracking-tight">Nộp ảnh seeding</h3>
            {title && <p className="text-[12px] text-zinc-500 font-bold mt-0.5 truncate">{title}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="text-zinc-500 hover:text-white" aria-label="Đóng"><X className="w-5 h-5" /></button>
        </div>

        {/* Ô dán / kéo thả — lớp contentEditable phủ lên để điện thoại hiện menu "Dán" khi nhấn giữ */}
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
          className={`relative rounded-xl border-2 border-dashed transition-colors ${drag ? 'border-sky-400 bg-sky-500/10' : 'border-zinc-700 focus-within:border-sky-500/60 bg-zinc-900/40'}`}>
          <div className="pointer-events-none flex flex-col items-center gap-1.5 px-4 py-8 text-center">
            {busy ? <Loader2 className="w-6 h-6 text-sky-400 animate-spin" /> : <ClipboardPaste className="w-6 h-6 text-sky-400" />}
            <p className="text-[13px] font-black text-zinc-200">{busy ? 'Đang gửi ảnh…' : 'Dán ảnh vào đây'}</p>
            <p className="text-[11px] text-zinc-500 font-bold">Ctrl+V / ⌘V · điện thoại: nhấn giữ vào ô → Dán · hoặc kéo thả ảnh</p>
          </div>
          <div ref={zoneRef} contentEditable={!busy} suppressContentEditableWarning tabIndex={0} role="textbox" aria-label="Dán ảnh vào đây"
            onInput={(e) => { (e.target as HTMLDivElement).textContent = ''; }}
            className="absolute inset-0 rounded-xl outline-none caret-transparent text-transparent cursor-text overflow-hidden" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {canReadClipboard && (
            <button type="button" onClick={readClipboard} disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-500 text-[11px] font-black uppercase tracking-widest px-3 py-2.5 disabled:opacity-50">
              <ClipboardPaste className="w-4 h-4" /> Dán từ bộ nhớ tạm
            </button>
          )}
          <button type="button" onClick={onChooseFile} disabled={busy}
            className={`flex items-center justify-center gap-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 text-[11px] font-black uppercase tracking-widest px-3 py-2.5 disabled:opacity-50 ${canReadClipboard ? '' : 'sm:col-span-2'}`}>
            <ImagePlus className="w-4 h-4" /> Chọn ảnh từ máy
          </button>
        </div>
      </div>
    </div>
  );
}
