import * as React from 'react';
import { Building2, ExternalLink, FileText } from 'lucide-react';
import type { Course, Employee } from '../../types';

/**
 * Hồ sơ công ty — tái dùng dữ liệu KHÓA HỌC (lọc theo thương hiệu công ty).
 * Cột trái: 2 cấp (nhóm = thương hiệu → mục con = khóa). Bấm mục con → cột phải hiện slide.
 * Admin quản lý nội dung qua Quản trị › Khóa học (không đồng bộ riêng).
 */

// Thương hiệu thuộc "Hồ sơ công ty" + nhãn hiển thị (thứ tự = thứ tự hiện ở cột trái)
const COMPANY_BRANDS: { brand: string; label: string }[] = [
  { brand: 'Tổng Quan Về Công Ty', label: 'Tổng quan công ty' },
  { brand: 'Nội Quy - Quy Chế', label: 'Nội quy – Quy chế' },
  { brand: 'Văn Hóa Công Ty', label: 'Văn hóa công ty' },
];

interface Section {
  brand: string;
  label: string;
  cats: { cat: string; items: Course[] }[];
  total: number;
}

export default function CompanyProfilePage({
  courses,
  employee,
  onManage,
}: {
  courses: Course[];
  employee?: Employee;
  onManage?: () => void;
}) {
  const isAdmin = employee?.role === 'admin' || employee?.role === 'manager';

  // Gom nhóm: thương hiệu → danh mục → khóa (giữ nguyên thứ tự xuất hiện)
  const sections = React.useMemo<Section[]>(() => {
    const out: Section[] = [];
    for (const { brand, label } of COMPANY_BRANDS) {
      const list = courses.filter((c) => c.brand === brand);
      if (!list.length) continue;
      const catOrder: string[] = [];
      const byCat = new Map<string, Course[]>();
      for (const c of list) {
        const cat = (c.category || '').trim() || 'Tài liệu';
        if (!byCat.has(cat)) { byCat.set(cat, []); catOrder.push(cat); }
        byCat.get(cat)!.push(c);
      }
      out.push({
        brand,
        label,
        total: list.length,
        cats: catOrder.map((cat) => ({ cat, items: byCat.get(cat)! })),
      });
    }
    return out;
  }, [courses]);

  const allItems = React.useMemo(
    () => sections.flatMap((s) => s.cats.flatMap((c) => c.items)),
    [sections]
  );

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (allItems.length && !allItems.some((c) => c.id === selectedId)) {
      setSelectedId(allItems[0].id);
    }
  }, [allItems, selectedId]);

  const selected = allItems.find((c) => c.id === selectedId) || null;
  const selectedMeta = React.useMemo(() => {
    if (!selected) return null;
    for (const s of sections)
      for (const c of s.cats)
        if (c.items.some((it) => it.id === selected.id))
          return { brandLabel: s.label, cat: c.cat };
    return null;
  }, [selected, sections]);

  // Khung cuộn cố định: đo đỉnh khung → cao = 100dvh - top (bù lề dưới của <main>)
  const wrapRef = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const setH = () => {
      if (window.innerWidth <= 820) { el.style.height = 'auto'; el.style.marginBottom = '0px'; return; }
      const top = el.getBoundingClientRect().top;
      const main = el.closest('main');
      const padB = main ? (parseFloat(getComputedStyle(main).paddingBottom) || 0) : 0;
      el.style.height = `calc(100dvh - ${Math.max(0, Math.round(top)) + 8}px)`;
      el.style.marginBottom = `-${Math.round(padB)}px`;
    };
    setH();
    window.addEventListener('resize', setH);
    return () => window.removeEventListener('resize', setH);
  }, [sections]);

  const media = selected?.slideUrl || selected?.videoUrl || '';

  return (
    <div className="cpx">
      <style>{CSS}</style>

      <div className="cp-top">
        <div className="cp-top-l">
          <div className="cp-top-icon"><Building2 className="w-5 h-5" /></div>
          <div>
            <h1 className="cp-top-title">Hồ sơ công ty</h1>
            <p className="cp-top-sub">Tổng quan, nội quy – quy chế và văn hóa công ty</p>
          </div>
        </div>
        {isAdmin && onManage && (
          <button className="cp-manage" onClick={onManage} title="Thêm/sửa tài liệu trong Quản trị › Khóa học">
            <FileText className="w-3.5 h-3.5" /> Quản lý tài liệu
          </button>
        )}
      </div>

      {allItems.length === 0 ? (
        <div className="cp-blank">
          <Building2 className="w-10 h-10" style={{ opacity: 0.4 }} />
          <p>Chưa có tài liệu hồ sơ công ty.</p>
          {isAdmin && <span>Thêm khóa vào các thương hiệu: Tổng Quan Về Công Ty, Nội Quy - Quy Chế, Văn Hóa Công Ty trong Quản trị › Khóa học.</span>}
        </div>
      ) : (
        <div className="cp-wrap" ref={wrapRef}>
          {/* CỘT TRÁI: nhóm → mục con */}
          <nav className="cp-side" aria-label="Danh mục hồ sơ công ty">
            {sections.map((s) => (
              <div className="cp-group" key={s.brand}>
                <div className="cp-group-h">{s.label}<span className="cp-badge">{s.total}</span></div>
                {s.cats.map((c) => (
                  <div key={c.cat}>
                    {s.cats.length > 1 && <div className="cp-cat">{c.cat}</div>}
                    {c.items.map((it) => (
                      <button
                        key={it.id}
                        className={'cp-item' + (it.id === selectedId ? ' active' : '')}
                        onClick={() => setSelectedId(it.id)}
                      >
                        {it.title}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </nav>

          {/* CỘT PHẢI: slide */}
          <section className="cp-main">
            {selected && (
              <>
                <div className="cp-head">
                  <div className="cp-crumb">
                    {selectedMeta?.brandLabel}
                    {selectedMeta?.cat ? <span className="cp-sep">›</span> : null}
                    {selectedMeta?.cat}
                  </div>
                  <div className="cp-title">{selected.title}</div>
                </div>

                {media ? (
                  <div className="cp-viewer">
                    <iframe
                      src={media}
                      title={selected.title}
                      allow="autoplay; fullscreen"
                      allowFullScreen
                    />
                    <a className="cp-open" href={media} target="_blank" rel="noopener noreferrer" title="Mở ở tab mới">
                      <ExternalLink className="w-3.5 h-3.5" /> Mở ở tab mới
                    </a>
                  </div>
                ) : (
                  <div className="cp-viewer cp-viewer-empty">
                    <span>Tài liệu này chưa có slide.</span>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

const CSS = `
.cpx { --cp-bg:#f5f7fa; --cp-card:#ffffff; --cp-border:#e2e8f0; --cp-text:#1e293b; --cp-muted:#64748b; --cp-accent:#2563eb; --cp-accent-soft:#eff6ff;
  color:var(--cp-text); }
.cpx *, .cpx *::before, .cpx *::after { box-sizing:border-box; }
.cp-top { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
.cp-top-l { display:flex; align-items:center; gap:12px; }
.cp-top-icon { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center;
  background:var(--cp-accent-soft); color:var(--cp-accent); border:1px solid #dbeafe; }
.cp-top-title { font-size:20px; font-weight:900; margin:0; color:var(--cp-text); }
.cp-top-sub { font-size:12.5px; color:var(--cp-muted); margin:2px 0 0; }
.cp-manage { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:var(--cp-accent);
  background:var(--cp-accent-soft); border:1px solid #dbeafe; padding:8px 12px; border-radius:10px; cursor:pointer; }
.cp-manage:hover { background:#dbeafe; }

.cp-wrap { display:flex; gap:16px; background:var(--cp-bg); border:1px solid var(--cp-border);
  border-radius:16px; padding:14px; overflow:hidden; }
.cp-side { width:300px; flex:0 0 300px; overflow-y:auto; padding-right:6px; }
.cp-side::-webkit-scrollbar, .cp-viewer::-webkit-scrollbar { width:8px; }
.cp-side::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:8px; }

.cp-group { margin-bottom:16px; }
.cp-group-h { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:900; text-transform:uppercase;
  letter-spacing:.04em; color:var(--cp-accent); padding:4px 10px 8px; }
.cp-badge { margin-left:auto; font-size:10.5px; font-weight:800; color:var(--cp-muted); background:#e9eef5;
  border-radius:999px; padding:1px 8px; }
.cp-cat { font-size:11px; font-weight:800; color:var(--cp-muted); text-transform:uppercase; letter-spacing:.03em;
  padding:8px 10px 3px; }
.cp-item { display:block; width:100%; text-align:left; border:none; background:transparent; padding:9px 12px;
  border-radius:10px; font-size:13.5px; color:var(--cp-text); cursor:pointer; line-height:1.4; transition:background .12s; }
.cp-item:hover { background:#e9eef5; }
.cp-item.active { background:var(--cp-accent); color:#fff; font-weight:700; box-shadow:0 4px 12px rgba(37,99,235,.28); }

.cp-main { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; overflow:hidden; }
.cp-head { padding:2px 4px 12px; border-bottom:1px solid var(--cp-border); margin-bottom:12px; flex:0 0 auto; }
.cp-crumb { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; color:var(--cp-muted);
  display:flex; align-items:center; gap:6px; }
.cp-sep { opacity:.6; }
.cp-title { font-size:19px; font-weight:900; color:var(--cp-text); margin-top:5px; line-height:1.25; }
.cp-viewer { flex:1 1 auto; position:relative; border-radius:12px; overflow:hidden; background:#0b1220;
  border:1px solid var(--cp-border); min-height:320px; }
.cp-viewer iframe { width:100%; height:100%; border:0; display:block; }
.cp-viewer-empty { display:flex; align-items:center; justify-content:center; background:var(--cp-card); color:var(--cp-muted);
  font-size:14px; }
.cp-open { position:absolute; top:10px; right:10px; display:inline-flex; align-items:center; gap:6px;
  font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; color:#fff;
  background:var(--cp-accent); padding:8px 12px; border-radius:10px; text-decoration:none;
  box-shadow:0 6px 16px rgba(37,99,235,.4); }
.cp-open:hover { background:#1d4ed8; }

.cp-blank { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px;
  padding:60px 20px; color:var(--cp-muted); text-align:center; background:var(--cp-bg);
  border:1px dashed var(--cp-border); border-radius:16px; }
.cp-blank p { font-size:15px; font-weight:700; color:var(--cp-text); margin:0; }
.cp-blank span { font-size:12.5px; max-width:520px; }

@media (max-width:820px) {
  .cp-wrap { flex-direction:column; }
  .cp-side { width:100%; flex:none; max-height:40vh; padding-right:0; }
  .cp-main { min-height:70vh; }
  .cp-viewer { min-height:60vh; }
}
`;
