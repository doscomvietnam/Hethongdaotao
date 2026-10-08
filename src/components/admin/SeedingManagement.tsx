import * as React from 'react';
import { Plus, Trash2, Eye, EyeOff, Users, ExternalLink, RotateCcw, Ban, ImageOff, Pencil, Check, X, ChevronDown, AlertTriangle } from 'lucide-react';
import {
  SEEDING_GROUPS, adminListSeeding, adminSaveLink, adminDeleteLink, adminSetLinkStatus,
  adminListSubmissions, adminRevokeSubmission, adminRestoreSubmission, adminSeedingProgress,
} from '../../services/seedingService';

const vnToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const fmtDate = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

interface AdminLink {
  id: string; group_key: string; title: string; url: string; max_people: number; status: string;
  today: number; dailyMax: number; total: number; images: number;
  completedAt: string | null; imagesDeleteAt: string | null;
}

const GROUP_MAX = 28;

export default function SeedingManagement() {
  const [tab, setTab] = React.useState<'links' | 'subs' | 'progress'>('links');
  const [date, setDate] = React.useState(vnToday());
  const [links, setLinks] = React.useState<AdminLink[]>([]);
  const [groupPeople, setGroupPeople] = React.useState<Record<string, number>>({});
  const [minLinks, setMinLinks] = React.useState(28);
  const [subs, setSubs] = React.useState<any[]>([]);
  const [progress, setProgress] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'links') {
        const r = await adminListSeeding();
        setLinks(r.links || []); setGroupPeople(r.groupPeople || {}); setMinLinks(r.minLinksPerGroup || 28);
      } else if (tab === 'subs') {
        const r = await adminListSubmissions(date); setSubs(r.submissions || []);
      } else {
        setProgress(await adminSeedingProgress(date));
      }
      setErr(null);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, [tab, date]);

  React.useEffect(() => { load(); }, [load]);

  const tabBtn = (id: typeof tab, label: string) => (
    <button onClick={() => setTab(id)} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest ${tab === id ? 'bg-white text-zinc-900' : 'text-zinc-400'}`}>{label}</button>
  );

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {tabBtn('links', 'Quản lý link')}
          {tabBtn('subs', 'Ảnh nộp')}
          {tabBtn('progress', 'Tiến độ')}
        </div>
        {tab !== 'links' && (
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-400">
            Ngày
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 text-xs" />
          </label>
        )}
        {tab === 'links' && (
          <span className="text-[11px] text-zinc-500">Mỗi link: tối đa 2 lượt/ngày · đủ tổng lượt thì tự ẩn, ảnh giữ 7 ngày rồi tự xóa · không được trùng link cũ</span>
        )}
      </div>

      {err && <div className="mb-4 text-sm text-rose-400">{err}</div>}
      {loading ? <div className="py-12 text-center text-zinc-500 text-sm">Đang tải…</div> :
        tab === 'links' ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {SEEDING_GROUPS.map(g => (
              <GroupLinks key={g.key} group={g} minLinks={minLinks}
                links={links.filter(l => l.group_key === g.key)}
                people={groupPeople[g.key] || 0}
                onChanged={load} />
            ))}
          </div>
        ) : tab === 'subs' ? (
          <SubmissionsGrid subs={subs} onChanged={load} />
        ) : (
          <ProgressTable data={progress} />
        )}
    </div>
  );
}

function GroupLinks({ group, minLinks, links, people, onChanged }: {
  group: { key: string; label: string }; minLinks: number; links: AdminLink[]; people: number; onChanged: () => void;
}) {
  const [title, setTitle] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [quota, setQuota] = React.useState(10);
  const [saving, setSaving] = React.useState(false);
  const [addErr, setAddErr] = React.useState<string | null>(null);
  const [showDone, setShowDone] = React.useState(false);

  const running = links.filter(l => l.status === 'active');
  const hidden = links.filter(l => l.status === 'inactive');
  const done = links.filter(l => l.status === 'completed');

  const add = async () => {
    const u = url.trim();
    if (!u) { setAddErr('Dán link video trước đã'); return; }
    if (!/^https?:\/\//i.test(u)) { setAddErr('Link phải bắt đầu bằng http:// hoặc https://'); return; }
    setSaving(true); setAddErr(null);
    try { await adminSaveLink({ group_key: group.key, title: title.trim() || undefined, url: u, max_people: quota }); setTitle(''); setUrl(''); setQuota(10); onChanged(); }
    catch (e: any) { setAddErr(e.message || 'Thêm link thất bại'); } finally { setSaving(false); }
  };
  const del = async (id: string) => { if (!confirm('Xóa hẳn link này? Ảnh đã nộp của link cũng bị xóa.')) return; await adminDeleteLink(id); onChanged(); };
  const toggle = async (l: AdminLink) => { await adminSetLinkStatus(l.id, l.status === 'active' ? 'inactive' : 'active'); onChanged(); };

  const enough = running.length >= minLinks;
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-zinc-100">{group.label}</span>
          <span className="flex items-center gap-1 text-[11px] font-black bg-zinc-800 text-zinc-300 rounded-full px-2.5 py-1" title="Số người tham gia nhóm hôm nay"><Users className="w-3 h-3" />{people}/{GROUP_MAX}</span>
        </div>
        <div className={`flex items-center gap-1.5 mt-1.5 text-[11px] font-bold ${enough ? 'text-emerald-400' : 'text-amber-400'}`}>
          {!enough && <AlertTriangle className="w-3.5 h-3.5" />}
          {running.length}/{minLinks} link đang chạy{enough ? ' — đủ' : ` — cần thêm ${minLinks - running.length} link`}
        </div>
      </div>
      <div className="p-3 flex flex-col gap-2">
        {/* Thêm link */}
        <div className="rounded-xl border border-dashed border-zinc-700 p-2.5 flex flex-col gap-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tiêu đề video (không bắt buộc)" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-200" />
          <input value={url} onChange={e => { setUrl(e.target.value); setAddErr(null); }} onKeyDown={e => { if (e.key === 'Enter') add(); }} placeholder="Dán link video… (bắt buộc)" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-200" />
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-zinc-500 flex items-center gap-1">Tổng <input type="number" min={1} max={100} value={quota} onChange={e => setQuota(parseInt(e.target.value) || 10)} className="w-14 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200" /> lượt</label>
            <button disabled={saving} onClick={add} className="ml-auto flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-black rounded-lg px-3 py-1.5 disabled:opacity-50"><Plus className="w-3.5 h-3.5" /> {saving ? 'Đang thêm…' : 'Thêm link'}</button>
          </div>
          {addErr && <div className="text-[11px] font-semibold text-rose-400">{addErr}</div>}
        </div>

        {running.length === 0 && hidden.length === 0 && <div className="text-center text-[12px] text-zinc-600 py-3">Chưa có link đang chạy</div>}
        {[...running, ...hidden].map(l => (
          <LinkItem key={l.id} l={l} groupKey={group.key} onToggle={toggle} onDelete={del} onChanged={onChanged} />
        ))}

        {done.length > 0 && (
          <div className="mt-1">
            <button onClick={() => setShowDone(v => !v)} className="flex items-center gap-1.5 text-[11px] font-black text-zinc-500 hover:text-zinc-300 uppercase tracking-widest">
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDone ? 'rotate-180' : ''}`} /> Đã hoàn thành ({done.length})
            </button>
            {showDone && (
              <div className="flex flex-col gap-1.5 mt-2">
                {done.map(l => (
                  <div key={l.id} className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-zinc-400 truncate">{l.title}</span>
                      <span className="text-[10px] font-black text-emerald-400 flex-none">{l.total}/{l.max_people} ✓</span>
                    </div>
                    <div className="text-[10.5px] text-zinc-600 mt-0.5">
                      Xong {fmtDate(l.completedAt)} · {l.images > 0 ? `ảnh tự xóa ngày ${fmtDate(l.imagesDeleteAt)}` : 'ảnh đã xóa'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LinkItem({ l, groupKey, onToggle, onDelete, onChanged }: {
  l: AdminLink; groupKey: string;
  onToggle: (l: AdminLink) => void; onDelete: (id: string) => void; onChanged: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(l.title);
  const [url, setUrl] = React.useState(l.url);
  const [quota, setQuota] = React.useState(l.max_people);
  const [saving, setSaving] = React.useState(false);
  const [editErr, setEditErr] = React.useState<string | null>(null);

  const startEdit = () => { setTitle(l.title); setUrl(l.url); setQuota(l.max_people); setEditErr(null); setEditing(true); };
  const save = async () => {
    const u = url.trim();
    if (!u) { setEditErr('Link không được để trống'); return; }
    setSaving(true); setEditErr(null);
    try {
      await adminSaveLink({ id: l.id, group_key: groupKey, title: title.trim() || undefined, url: u, max_people: quota });
      setEditing(false); onChanged();
    } catch (e: any) { setEditErr(e.message || 'Lưu thất bại'); } finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div className="rounded-xl border border-sky-500/40 bg-zinc-900/80 p-2.5 flex flex-col gap-2">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tiêu đề video" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-200" />
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link video" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-200" />
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-zinc-500 flex items-center gap-1">Tổng <input type="number" min={1} max={100} value={quota} onChange={e => setQuota(parseInt(e.target.value) || 10)} className="w-14 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200" /> lượt</label>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-zinc-200 px-2 py-1.5"><X className="w-3.5 h-3.5" /> Hủy</button>
            <button disabled={saving} onClick={save} className="flex items-center gap-1 bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-black rounded-lg px-3 py-1.5 disabled:opacity-50"><Check className="w-3.5 h-3.5" /> {saving ? 'Đang lưu…' : 'Lưu'}</button>
          </div>
        </div>
        {quota <= l.total && <div className="text-[10.5px] text-amber-400">Link đã có {l.total} lượt — lưu với tổng {quota} lượt thì link sẽ hoàn thành ngay.</div>}
        {editErr && <div className="text-[11px] font-semibold text-rose-400">{editErr}</div>}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 ${l.status !== 'active' ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12.5px] font-semibold text-zinc-200 min-w-0 leading-snug">{l.title}{l.status === 'inactive' && <span className="ml-1.5 text-[10px] text-zinc-500">(đang ẩn)</span>}</div>
        <div className="flex-none flex flex-col items-end gap-0.5">
          <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${l.today >= l.dailyMax ? 'bg-rose-500/15 text-rose-300' : 'bg-zinc-800 text-zinc-400'}`}>Hôm nay {l.today}/{l.dailyMax}</span>
          <span className="text-[10px] font-bold text-zinc-500">Tổng {l.total}/{l.max_people}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-sky-400 truncate"><ExternalLink className="w-3 h-3 flex-none" /> mở</a>
        <div className="ml-auto flex items-center gap-2.5">
          <button onClick={startEdit} className="text-zinc-500 hover:text-sky-400" title="Sửa"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => onToggle(l)} className="text-zinc-500 hover:text-zinc-300" title={l.status === 'active' ? 'Ẩn' : 'Hiện'}>{l.status === 'active' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
          <button onClick={() => onDelete(l.id)} className="text-zinc-500 hover:text-rose-400" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

function SubmissionsGrid({ subs, onChanged }: { subs: any[]; onChanged: () => void }) {
  const [view, setView] = React.useState<string | null>(null);
  if (!subs.length) return <div className="py-12 text-center text-zinc-500 text-sm">Chưa có ảnh nộp ngày này</div>;
  const act = async (id: string, revoke: boolean) => { revoke ? await adminRevokeSubmission(id) : await adminRestoreSubmission(id); onChanged(); };
  return (
    <>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
        {subs.map(s => (
          <div key={s.id} className={`rounded-xl border overflow-hidden bg-zinc-900/60 ${s.status === 'revoked' ? 'border-rose-500/40' : 'border-zinc-800'}`}>
            <div className="aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => s.imageUrl && setView(s.imageUrl)}>
              {s.imageUrl ? <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />
                : <div className="flex flex-col items-center gap-1 text-zinc-600"><ImageOff className="w-6 h-6" />{s.imageDeleted && <span className="text-[10px]">Ảnh đã tự xóa</span>}</div>}
            </div>
            <div className="p-2.5">
              <div className="text-[12px] font-bold text-zinc-200 truncate">{s.employee}</div>
              <div className="text-[10.5px] text-zinc-500 truncate">{s.department} · {s.link_title}</div>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${s.status === 'revoked' ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{s.status === 'revoked' ? 'Đã thu hồi' : 'Hợp lệ'}</span>
                {s.status === 'revoked'
                  ? <button onClick={() => act(s.id, false)} className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-emerald-400"><RotateCcw className="w-3 h-3" /> Khôi phục</button>
                  : <button onClick={() => act(s.id, true)} className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-rose-400"><Ban className="w-3 h-3" /> Thu hồi</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {view && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setView(null)}>
          <img src={view} alt="" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </>
  );
}

const GROUP_SHORT: Record<string, string> = { koc: 'KOC', company: 'Công ty', competitor: 'Đối thủ' };

function ProgressTable({ data }: { data: any | null }) {
  if (!data) return null;
  const under = data.rows.filter((r: any) => r.count < data.requiredPerDay);
  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <span className="text-sm font-black text-zinc-100">{data.done}/{data.total} nhân viên đã seed lượt bắt buộc</span>
        <span className="text-[11px] font-bold text-amber-400">{under.length} người chưa seed hôm nay</span>
        <span className="text-[11px] text-zinc-500">· tối đa {data.maxPerDay} lượt/ngày (1 bắt buộc + 2 tự nguyện)</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
              <th className="text-left px-4 py-3">Nhân viên</th>
              <th className="text-left px-4 py-3">Phòng ban</th>
              <th className="text-left px-4 py-3">Theo nhóm</th>
              <th className="text-right px-4 py-3">Hôm nay</th>
              <th className="text-right px-4 py-3">Điểm</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r: any) => {
              const ok = r.count >= data.requiredPerDay;
              return (
                <tr key={r.id} className="border-b border-zinc-800/60 last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-zinc-200">{r.name}</td>
                  <td className="px-4 py-2.5 text-zinc-500 text-xs">{r.department}</td>
                  <td className="px-4 py-2.5 text-[11px] text-zinc-500">
                    {Object.entries(r.byGroup).map(([g, n]) => `${GROUP_SHORT[g] || g}: ${n}`).join(' · ') || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`text-[11px] font-black rounded-full px-2.5 py-1 ${ok ? 'bg-emerald-500/15 text-emerald-300' : r.count === 0 ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}`}>
                      {r.count}/{data.maxPerDay}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-black text-amber-500 tabular-nums">⭐ {r.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
