import * as React from 'react';
import { Plus, Trash2, Eye, EyeOff, Users, ExternalLink, RotateCcw, Ban, ImageOff, Pencil, Check, X } from 'lucide-react';
import {
  SEEDING_GROUPS, adminListSeeding, adminSaveLink, adminDeleteLink, adminSetLinkStatus,
  adminListSubmissions, adminRevokeSubmission, adminRestoreSubmission,
} from '../../services/seedingService';

const vnToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

interface AdminLink { id: string; group_key: string; title: string; url: string; max_people: number; status: string; count: number; }

export default function SeedingManagement() {
  const [date, setDate] = React.useState(vnToday());
  const [tab, setTab] = React.useState<'links' | 'subs'>('links');
  const [links, setLinks] = React.useState<AdminLink[]>([]);
  const [groupPeople, setGroupPeople] = React.useState<Record<string, number>>({});
  const [subs, setSubs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const loadLinks = React.useCallback(async () => {
    setLoading(true);
    try { const r = await adminListSeeding(date); setLinks(r.links || []); setGroupPeople(r.groupPeople || {}); setErr(null); }
    catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, [date]);

  const loadSubs = React.useCallback(async () => {
    setLoading(true);
    try { const r = await adminListSubmissions(date); setSubs(r.submissions || []); setErr(null); }
    catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, [date]);

  React.useEffect(() => { tab === 'links' ? loadLinks() : loadSubs(); }, [tab, loadLinks, loadSubs]);

  return (
    <div>
      {/* Thanh công cụ */}
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          <button onClick={() => setTab('links')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest ${tab === 'links' ? 'bg-white text-zinc-900' : 'text-zinc-400'}`}>Quản lý link</button>
          <button onClick={() => setTab('subs')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest ${tab === 'subs' ? 'bg-white text-zinc-900' : 'text-zinc-400'}`}>Ảnh nộp</button>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-zinc-400">
          Ngày
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 text-xs" />
        </label>
      </div>

      {err && <div className="mb-4 text-sm text-rose-400">{err}</div>}
      {loading ? <div className="py-12 text-center text-zinc-500 text-sm">Đang tải…</div> :
        tab === 'links' ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {SEEDING_GROUPS.map(g => (
              <GroupLinks key={g.key} group={g} date={date}
                links={links.filter(l => l.group_key === g.key)}
                people={groupPeople[g.key] || 0}
                onChanged={loadLinks} />
            ))}
          </div>
        ) : (
          <SubmissionsGrid subs={subs} onChanged={loadSubs} />
        )}
    </div>
  );
}

function GroupLinks({ group, date, links, people, onChanged }: {
  group: { key: string; label: string }; date: string; links: AdminLink[]; people: number; onChanged: () => void;
}) {
  const [title, setTitle] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [max, setMax] = React.useState(5);
  const [saving, setSaving] = React.useState(false);

  const add = async () => {
    if (!title.trim() || !url.trim()) return;
    setSaving(true);
    try { await adminSaveLink({ group_key: group.key, title: title.trim(), url: url.trim(), task_date: date, max_people: max }); setTitle(''); setUrl(''); setMax(5); onChanged(); }
    catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };
  const del = async (id: string) => { if (!confirm('Xóa link này? (xóa cả ảnh đã nộp của link)')) return; await adminDeleteLink(id); onChanged(); };
  const toggle = async (l: AdminLink) => { await adminSetLinkStatus(l.id, l.status === 'active' ? 'inactive' : 'active'); onChanged(); };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <span className="text-sm font-black text-zinc-100">{group.label}</span>
        <span className="flex items-center gap-1 text-[11px] font-black bg-zinc-800 text-zinc-300 rounded-full px-2.5 py-1"><Users className="w-3 h-3" />{people}/15</span>
      </div>
      <div className="p-3 flex flex-col gap-2">
        {links.length === 0 && <div className="text-center text-[12px] text-zinc-600 py-3">Chưa có link</div>}
        {links.map(l => (
          <LinkItem key={l.id} l={l} groupKey={group.key} date={date} onToggle={toggle} onDelete={del} onChanged={onChanged} />
        ))}
        {/* Thêm link */}
        <div className="rounded-xl border border-dashed border-zinc-700 p-2.5 flex flex-col gap-2 mt-1">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tiêu đề video" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-200" />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Dán link video…" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-200" />
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-zinc-500 flex items-center gap-1">Tối đa <input type="number" min={1} max={50} value={max} onChange={e => setMax(parseInt(e.target.value) || 5)} className="w-14 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200" /> người</label>
            <button disabled={saving} onClick={add} className="ml-auto flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-black rounded-lg px-3 py-1.5 disabled:opacity-50"><Plus className="w-3.5 h-3.5" /> Thêm link</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkItem({ l, groupKey, date, onToggle, onDelete, onChanged }: {
  l: AdminLink; groupKey: string; date: string;
  onToggle: (l: AdminLink) => void; onDelete: (id: string) => void; onChanged: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(l.title);
  const [url, setUrl] = React.useState(l.url);
  const [max, setMax] = React.useState(l.max_people);
  const [saving, setSaving] = React.useState(false);

  const startEdit = () => { setTitle(l.title); setUrl(l.url); setMax(l.max_people); setEditing(true); };
  const save = async () => {
    if (!title.trim() || !url.trim()) return;
    setSaving(true);
    try {
      await adminSaveLink({ id: l.id, group_key: groupKey, title: title.trim(), url: url.trim(), task_date: date, max_people: max });
      setEditing(false); onChanged();
    } catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div className="rounded-xl border border-sky-500/40 bg-zinc-900/80 p-2.5 flex flex-col gap-2">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tiêu đề video" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-200" />
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link video" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-200" />
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-zinc-500 flex items-center gap-1">Tối đa <input type="number" min={1} max={50} value={max} onChange={e => setMax(parseInt(e.target.value) || 5)} className="w-14 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200" /> người</label>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-zinc-200 px-2 py-1.5"><X className="w-3.5 h-3.5" /> Hủy</button>
            <button disabled={saving} onClick={save} className="flex items-center gap-1 bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-black rounded-lg px-3 py-1.5 disabled:opacity-50"><Check className="w-3.5 h-3.5" /> {saving ? 'Đang lưu…' : 'Lưu'}</button>
          </div>
        </div>
        {max < l.count && <div className="text-[10.5px] text-amber-400">Lưu ý: link đã có {l.count} người nộp, nhiều hơn số tối đa mới.</div>}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 ${l.status !== 'active' ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12.5px] font-semibold text-zinc-200 min-w-0 leading-snug">{l.title}</div>
        <span className={`flex-none text-[10px] font-black rounded-full px-2 py-0.5 ${l.count >= l.max_people ? 'bg-rose-500/15 text-rose-300' : 'bg-zinc-800 text-zinc-400'}`}>{l.count}/{l.max_people}</span>
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
              {s.imageUrl ? <img src={s.imageUrl} alt="" className="w-full h-full object-cover" /> : <ImageOff className="w-6 h-6 text-zinc-700" />}
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
