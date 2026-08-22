import * as React from 'react';
import { getProductProfiles, saveProductProfiles, type ProductProfileData } from '../../services/productProfileService';
import { supabase } from '../../services/supabaseClient';
import type { Employee } from '../../types';

// ── CSS (dark, scoped dưới .ppx để không đụng style app) ────────────────────
const PP_CSS = `
.ppx{--bg:#EAEEF4;--surface:#FFFFFF;--surface2:#F5F8FC;--surface3:#EDF2F8;--ink:#101827;--ink2:#33415A;
  --muted:#66748C;--faint:#93A0B4;--border:#DCE3ED;--border2:#C9D3E0;--primary:#1B44C4;--primary-ink:#1B44C4;
  --cyan:#0891B2;--green:#0E9F55;--green-bg:#E4F5EC;--amber:#B7791F;--amber-bg:#FBF1DC;--red:#D42B2B;--red-bg:#FBE6E6;
  --indigo:#4F46E5;--mono:ui-monospace,"SF Mono","Cascadia Code",Menlo,monospace;
  color:var(--ink);font-size:14px;line-height:1.6}
.ppx *{box-sizing:border-box}
.ppx a{color:inherit;text-decoration:none}
.pp-app{display:grid;grid-template-columns:260px minmax(0,1fr);gap:0;min-height:520px;border:1px solid var(--border);border-radius:18px;overflow:hidden;background:var(--bg)}
.pp-side{background:var(--surface2);border-right:1px solid var(--border);padding:16px 12px;height:100%;overflow-y:auto}
.pp-search{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:8px 11px;margin-bottom:12px}
.pp-search input{border:0;background:transparent;color:var(--ink);font-size:13px;width:100%;outline:none;font-family:inherit}
.pp-sidelabel{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:var(--faint);padding:4px 8px 8px}
.pp-item{display:flex;gap:10px;align-items:flex-start;padding:9px 10px;border-radius:11px;cursor:pointer;border:1px solid transparent;width:100%;text-align:left;background:transparent}
.pp-item:hover{background:var(--surface3)}
.pp-item.on{background:var(--surface);border-color:var(--border2)}
.pp-code{font-family:var(--mono);font-size:11px;font-weight:700;color:var(--muted);background:var(--surface3);border-radius:6px;padding:2px 6px;flex:none;margin-top:1px;min-width:50px;text-align:center}
.pp-item.on .pp-code{color:var(--primary-ink);background:color-mix(in srgb,var(--primary) 16%,transparent)}
.pp-nm{font-size:12.5px;font-weight:600;color:var(--ink2);line-height:1.35}
.pp-item.on .pp-nm{color:var(--ink);font-weight:700}
.pp-main{min-width:0;display:flex;flex-direction:column;height:100%;overflow:hidden}
.pp-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;border-bottom:1px solid var(--border);background:var(--surface);z-index:20;flex-wrap:wrap;flex:none}
.pp-tabs{display:flex;gap:4px;background:var(--surface3);padding:4px;border-radius:11px;border:1px solid var(--border)}
.pp-tab{border:0;background:transparent;color:var(--muted);font-weight:800;font-size:12px;padding:8px 14px;border-radius:8px;cursor:pointer;text-transform:uppercase;letter-spacing:.04em;font-family:inherit}
.pp-tab.on{background:var(--primary);color:#fff}
.pp-sync{font-size:11px;font-weight:700;color:var(--green);display:inline-flex;align-items:center;gap:7px;
  border:1px solid color-mix(in srgb,var(--green) 30%,transparent);background:var(--green-bg);border-radius:20px;
  padding:6px 12px;cursor:pointer;font-family:inherit}
.pp-sync:hover{filter:brightness(.97)}
.pp-sync .d{width:7px;height:7px;border-radius:50%;background:var(--green)}
.pp-body{padding:20px;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden}

.pp-hero{position:relative;overflow:hidden;border-radius:20px;border:1px solid var(--border);padding:26px;margin-bottom:18px;
  background:radial-gradient(120% 140% at 100% 0%,color-mix(in srgb,var(--primary) 18%,transparent),transparent 55%),var(--surface)}
.pp-eyebrow{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--primary-ink);display:flex;gap:9px;align-items:center;margin-bottom:12px}
.pp-eyebrow .b{background:var(--primary);color:#fff;padding:3px 9px;border-radius:6px}
.pp-title{font-size:clamp(22px,3vw,34px);font-weight:900;letter-spacing:-1px;margin:0 0 12px;color:var(--ink)}
.pp-idrow{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
.pp-idchip{font-family:var(--mono);font-size:12px;font-weight:700;padding:6px 11px;border-radius:9px;border:1px solid var(--border2);background:var(--surface2);color:var(--ink2);display:inline-flex;gap:7px;align-items:center}
.pp-idchip i{font-style:normal;color:var(--faint);font-size:10px;text-transform:uppercase;letter-spacing:.06em}
.pp-lede{font-size:15px;color:var(--ink2);max-width:66ch;white-space:pre-line}
.pp-specstrip{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1px;margin-top:20px;background:var(--border);border:1px solid var(--border);border-radius:13px;overflow:hidden}
.pp-spec{background:var(--surface2);padding:12px 14px}
.pp-spec .k{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--faint);margin-bottom:5px}
.pp-spec .v{font-size:13.5px;font-weight:700;color:var(--ink)}

.pp-detail{flex:1;min-height:0;display:flex;gap:18px;padding:18px}
.pp-toc{flex:none;width:190px;height:100%;display:flex;flex-direction:column;gap:2px;padding:12px 8px;border:1px solid var(--border);border-radius:13px;background:var(--surface);overflow-y:auto}
.pp-toc>*{flex-shrink:0}
.pp-toc .h{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:var(--faint);padding:2px 10px 8px}
.pp-toc a{font-size:12px;font-weight:600;color:var(--muted);padding:6px 10px;border-radius:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
.pp-toc a:hover{color:var(--ink);background:var(--surface3)}
.pp-content{flex:1;min-width:0;height:100%;overflow-y:auto;display:flex;flex-direction:column;gap:16px;padding-right:2px}
.pp-content>*{flex-shrink:0}
.ppx :target{scroll-margin-top:14px}

.pp-card{background:var(--surface);border:1px solid var(--border);border-radius:15px;overflow:hidden}
.pp-cardh{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--border)}
.pp-cardh .n{font-family:var(--mono);font-weight:800;font-size:12px;color:#fff;background:var(--primary);width:25px;height:25px;border-radius:8px;display:grid;place-items:center;flex:none}
.pp-cardh h3{margin:0;font-size:15px;font-weight:800;letter-spacing:-.2px;color:var(--ink)}
.pp-cardb{padding:4px 22px 12px;display:flex;flex-direction:column}
.pp-cardb .l{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--faint)}
.pp-row{display:grid;grid-template-columns:186px 1fr;gap:22px;padding:15px 0;border-bottom:1px solid var(--border);align-items:start}
.pp-row:last-child{border-bottom:0}
.pp-row>.l{padding-top:2px}
.pp-val{font-size:14px;color:var(--ink2);white-space:pre-line}
.pp-ul,.pp-ol{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.pp-ul li{position:relative;padding-left:18px;font-size:14px;color:var(--ink2)}
.pp-ul li::before{content:"";position:absolute;left:1px;top:8px;width:6px;height:6px;border-radius:2px;background:var(--primary)}
.pp-ol{counter-reset:ppc}
.pp-ol li{counter-increment:ppc;position:relative;padding-left:32px;font-size:14px;color:var(--ink2);min-height:23px;display:flex;align-items:center}
.pp-ol li::before{content:counter(ppc);position:absolute;left:0;top:0;width:23px;height:23px;border-radius:7px;background:var(--primary);color:#fff;font-weight:800;font-size:11px;display:grid;place-items:center;font-family:var(--mono)}
.pp-def{display:flex;flex-direction:column;gap:9px}
.pp-def .di{font-size:14px;color:var(--ink2);line-height:1.55}
.pp-def .di b{color:var(--ink);font-weight:800}
@media(max-width:640px){.pp-row{grid-template-columns:1fr;gap:6px}}
.pp-tags{display:flex;flex-wrap:wrap;gap:7px}
.pp-tag{font-size:12.5px;font-weight:600;padding:5px 10px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);color:var(--ink2)}
.pp-tag.hash{font-family:var(--mono);color:var(--cyan);background:color-mix(in srgb,var(--cyan) 10%,transparent);border-color:color-mix(in srgb,var(--cyan) 26%,transparent)}
.pp-panel{border-radius:12px;padding:14px 16px;border:1px solid;margin:14px 0}
.pp-panel>.l{margin-bottom:10px;display:block}
.pp-panel.amber{background:var(--amber-bg);border-color:color-mix(in srgb,var(--amber) 40%,transparent)}
.pp-panel.amber .l{color:var(--amber)}
.pp-panel.green{background:var(--green-bg);border-color:color-mix(in srgb,var(--green) 32%,transparent)}
.pp-panel.green .l{color:var(--green)}
.pp-panel.red{background:var(--red-bg);border-color:color-mix(in srgb,var(--red) 32%,transparent)}
.pp-panel.red .l{color:var(--red)}
.pp-clist{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.pp-clist li{font-size:13.5px;color:var(--ink2);padding-left:22px;position:relative;line-height:1.5}
.pp-panel.green .pp-clist li::before{content:"✓";position:absolute;left:0;color:var(--green);font-weight:800}
.pp-panel.red .pp-clist li::before{content:"✕";position:absolute;left:0;color:var(--red);font-weight:800}
.pp-panel.amber .pp-clist li::before{content:"•";position:absolute;left:2px;color:var(--amber);font-weight:800}

/* Matrix */
.pp-mtool{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.pp-legend{display:flex;gap:16px;font-size:12.5px;font-weight:700;flex-wrap:wrap;align-items:center}
.pp-legend .g{color:var(--green)} .pp-legend .r{color:var(--muted)}
.pp-print{border:1px solid var(--border2);background:var(--surface);color:var(--ink2);border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit}
.pp-mwrap{overflow:auto;border:1px solid var(--border);border-radius:14px;background:var(--surface);max-height:calc(100vh - 150px)}
.pp-mtable{border-collapse:separate;border-spacing:0;font-size:12px}
.pp-mtable th,.pp-mtable td{border-right:1px solid var(--border);border-bottom:1px solid var(--border)}
.pp-mtable thead th{position:sticky;top:0;z-index:3;background:#0B1220;color:#fff}
.pp-mtable thead th.corner{left:0;z-index:5;text-align:left;padding:0 14px;font-size:10px;font-weight:800;letter-spacing:.12em;color:#93A0C0;min-width:150px}
.pp-mtable thead th.fld{height:196px;vertical-align:bottom;padding:10px 0 14px}
.pp-mtable thead th.fld span{writing-mode:vertical-rl;transform:rotate(180deg);font-weight:700;font-size:11px;white-space:nowrap;color:#CBD5E6;display:inline-block;max-height:176px;overflow:hidden;text-overflow:ellipsis}
.pp-mtable tbody th.pc{position:sticky;left:0;z-index:2;background:var(--surface);text-align:left;padding:10px 14px;min-width:150px}
.pp-mtable tbody th.pc b{display:block;font-weight:900;font-size:13px;color:var(--ink)}
.pp-mtable tbody th.pc small{color:var(--muted);font-family:var(--mono);font-size:11px}
.pp-mtable td.c{width:36px;min-width:36px;text-align:center;font-weight:800;font-size:13px}
.pp-mtable td.yes{background:var(--green-bg);color:var(--green)}
.pp-mtable td.no{background:var(--red-bg);color:var(--faint)}
.pp-mtable tbody tr:hover td.c{filter:brightness(1.25)}

.pp-msg{padding:60px 20px;text-align:center;color:var(--muted);font-weight:600}
.pp-spin{width:34px;height:34px;border:3px solid var(--border2);border-top-color:var(--primary);border-radius:50%;margin:0 auto 14px;animation:ppspin 1s linear infinite}
@keyframes ppspin{to{transform:rotate(360deg)}}
.pp-retry{margin-top:14px;border:1px solid var(--border2);background:var(--surface);color:var(--ink);border-radius:10px;padding:9px 18px;font-weight:700;cursor:pointer;font-family:inherit}

@media(max-width:1180px){.pp-toc{display:none}}
@media(max-width:820px){
  .pp-app{grid-template-columns:1fr;height:auto;overflow:visible}
  .pp-side{height:auto;border-right:0;border-bottom:1px solid var(--border)}
  .pp-main{height:auto;overflow:visible}
  .pp-body{overflow:visible;flex:none}
  .pp-detail{flex-direction:column;height:auto;overflow:visible;padding:14px}
  .pp-content{height:auto;overflow:visible}
  .pp-list{max-height:240px;overflow-y:auto}
}
.pp-btn{border:1px solid var(--border2);background:var(--surface);color:var(--ink2);border-radius:9px;padding:7px 13px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.pp-btn:hover{border-color:var(--primary);color:var(--primary-ink)}
.pp-btn.primary{background:var(--primary);border-color:var(--primary);color:#fff}
.pp-btn.primary:hover{filter:brightness(1.06);color:#fff}
.pp-btn.danger{color:var(--red);border-color:color-mix(in srgb,var(--red) 40%,transparent)}
.pp-btn:disabled{opacity:.55;cursor:not-allowed}
.pp-modal-bg{position:fixed;inset:0;background:rgba(8,13,22,.55);backdrop-filter:blur(3px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}
.pp-modal{background:var(--surface);border:1px solid var(--border);border-radius:16px;width:min(780px,100%);max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 70px -24px rgba(0,0,0,.45)}
.pp-modal-h{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border)}
.pp-modal-h h3{margin:0;font-size:16px;font-weight:900;color:var(--ink)}
.pp-modal-b{padding:16px 20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px}
.pp-modal-f{padding:14px 20px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:10px}
.pp-fgrp{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:var(--primary-ink);margin:10px 0 0;padding-bottom:6px;border-bottom:1px dashed var(--border)}
.pp-fld-e{display:flex;flex-direction:column;gap:5px}
.pp-fld-e label{font-size:11px;font-weight:700;color:var(--ink2)}
.pp-fld-e textarea{border:1px solid var(--border2);border-radius:9px;padding:8px 10px;font-family:inherit;font-size:13px;color:var(--ink);background:var(--surface2);resize:vertical;min-height:36px;line-height:1.5}
.pp-fld-e textarea:focus{outline:none;border-color:var(--primary)}
.pp-x{border:0;background:transparent;color:var(--muted);cursor:pointer;font-size:22px;line-height:1}
.pp-x:hover{color:var(--ink)}
@media print{.pp-side,.pp-top,.pp-mtool{display:none!important}.pp-app{border:0;display:block}.pp-mwrap{max-height:none;border:0}}
`;

// ── Helpers ─────────────────────────────────────────────────────────────────
const isEmpty = (v?: string) => !v || !v.trim() || v.trim() === '(trống)';
// Chuẩn hóa tên mục về cùng kiểu: nếu toàn CHỮ HOA → viết thường, hoa chữ đầu; giữ nguyên từ viết tắt.
const ACRO = new Set(['PPE', 'FAQ', 'USP', 'SKU', 'CCSC', 'CCSD', 'CCSP', 'CCTC', 'MCTV', 'MSDS', 'KPI', 'CEO', 'CCO', 'CHRO', 'CFO', 'CMO', 'COO', 'EV', 'BSC', 'GT', 'NPP', 'DIY', 'CSKH']);
const prettyLabel = (s: string): string => {
  if (!s) return s;
  if (s !== s.toUpperCase() || s === s.toLowerCase()) return s; // không phải toàn HOA → giữ nguyên
  return s.split(/\s+/).map((w, i) => {
    if (ACRO.has(w.replace(/[()[\].,:;-]/g, ''))) return w;
    const lo = w.toLowerCase();
    return i === 0 ? lo.charAt(0).toUpperCase() + lo.slice(1) : lo;
  }).join(' ');
};
const findIdx = (fields: string[], re: RegExp) => fields.findIndex((f) => re.test(f));

// Trường hiển thị ở hero (không lặp lại ở thân bài)
const HERO_RE = /^(Tên sản phẩm|Mã sản phẩm|Mã SKU|Danh mục sản phẩm|Mô tả ngắn|Dung tích|Thể sản phẩm|Mùi hương\/Màu sắc|Hạn sử dụng|Bảo hành)$/i;

export default function ProductProfilePage({ employee }: { employee?: Employee }) {
  const isAdmin = employee?.role === 'admin' || employee?.role === 'manager';
  const [data, setData] = React.useState<ProductProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [sel, setSel] = React.useState(0);
  const [tab, setTab] = React.useState<'detail' | 'matrix'>('detail');
  const [q, setQ] = React.useState('');
  const [editing, setEditing] = React.useState<null | { mode: 'add' | 'edit'; values: string[] }>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveErr, setSaveErr] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true); setErr(null);
    getProductProfiles().then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setErr(e?.message || 'Lỗi tải dữ liệu'); setLoading(false); });
  }, []);
  React.useEffect(() => { load(); }, [load]);

  // Tự đồng bộ: tải lại dữ liệu (im lặng) khi quay lại tab / cửa sổ → sửa sheet là thấy đổi
  const refresh = React.useCallback(() => {
    getProductProfiles().then(setData).catch(() => {});
  }, []);
  React.useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', refresh);
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', refresh); };
  }, [refresh]);

  // Nhốt chiều cao khung: đo vị trí thật của khung → chiều cao = màn hình - top, để mỗi cột cuộn TRONG khung (không kéo cả trang)
  const appRef = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const el = appRef.current;
    if (!el) return;
    const setH = () => {
      if (window.innerWidth <= 820) { el.style.height = 'auto'; el.style.marginBottom = '0px'; return; }
      const top = el.getBoundingClientRect().top;
      const main = el.closest('main');
      const padB = main ? (parseFloat(getComputedStyle(main).paddingBottom) || 0) : 0;
      // Kéo dài khung xuống sát đáy (cách 8px), bù luôn lề dưới của <main> để không cuộn cả trang
      el.style.height = `calc(100dvh - ${Math.max(0, Math.round(top)) + 8}px)`;
      el.style.marginBottom = `-${Math.round(padB)}px`;
    };
    setH();
    window.addEventListener('resize', setH);
    return () => window.removeEventListener('resize', setH);
  }, [loading, data]);

  const fields = data?.fields || [];
  const iName = React.useMemo(() => findIdx(fields, /^Tên sản phẩm$/i), [fields]);
  const iCode = React.useMemo(() => findIdx(fields, /^Mã sản phẩm$/i), [fields]);
  const iSku = React.useMemo(() => findIdx(fields, /SKU/i), [fields]);
  const iCat = React.useMemo(() => findIdx(fields, /Danh mục/i), [fields]);
  const iDesc = React.useMemo(() => findIdx(fields, /Mô tả ngắn/i), [fields]);

  const products = data?.products || [];
  const codeOf = (p: { values: string[] }) => {
    const raw = iCode >= 0 ? p.values[iCode] : '';
    const m = (raw || '').match(/(\d{2,4})/);
    return m ? m[1] : (raw || '—').slice(0, 6);
  };
  const nameOf = (p: { values: string[] }) => (iName >= 0 ? p.values[iName] : '') || '(chưa đặt tên)';

  const filtered = React.useMemo(() => {
    const kw = q.trim().toLowerCase();
    return products.map((p, i) => ({ p, i })).filter(({ p }) => {
      if (!kw) return true;
      return (nameOf(p) + ' ' + (iCode >= 0 ? p.values[iCode] : '') + ' ' + (iSku >= 0 ? p.values[iSku] : '')).toLowerCase().includes(kw);
    });
  }, [products, q, iName, iCode, iSku]);

  // Nhóm trường cho thân bài (bỏ trường hero)
  const bodyGroups = React.useMemo(() => {
    const out: { group: string; items: { name: string; idx: number }[] }[] = [];
    fields.forEach((f, i) => {
      if (HERO_RE.test(f)) return;
      const g = (data?.groups[i] || 'Khác').replace(/^\d+\.\s*/, '');
      let cur = out[out.length - 1];
      if (!cur || cur.group !== g) { cur = { group: g, items: [] }; out.push(cur); }
      cur.items.push({ name: f, idx: i });
    });
    return out;
  }, [fields, data]);

  // ── Thêm / Sửa / Xóa (admin) — lưu toàn bộ dữ liệu lên storage ─────────────
  const persist = React.useCallback(async (next: ProductProfileData) => {
    setSaving(true); setSaveErr(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) throw new Error('Bạn cần đăng nhập lại');
      await saveProductProfiles(next, token);
      setData(next);
      setEditing(null);
    } catch (e: any) {
      setSaveErr(e?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }, []);
  const openAdd = () => { setSaveErr(null); setEditing({ mode: 'add', values: fields.map(() => '') }); };
  const openEdit = () => { setSaveErr(null); setEditing({ mode: 'edit', values: [...(products[sel]?.values || fields.map(() => ''))] }); };
  const saveEditing = () => {
    if (!data || !editing) return;
    const products2 = [...data.products];
    if (editing.mode === 'add') { products2.push({ values: editing.values }); setSel(products2.length - 1); }
    else { products2[sel] = { values: editing.values }; }
    persist({ ...data, products: products2 });
  };
  const deleteCurrent = () => {
    if (!data) return;
    if (!window.confirm('Xóa hẳn sản phẩm này khỏi hồ sơ?')) return;
    persist({ ...data, products: data.products.filter((_, i) => i !== sel) });
    setSel((x) => Math.max(0, x - 1));
  };

  const styleEl = <style dangerouslySetInnerHTML={{ __html: PP_CSS }} />;
  const modalEl = editing && data ? (
    <div className="pp-modal-bg" onClick={(e) => { if (e.target === e.currentTarget && !saving) setEditing(null); }}>
      <div className="pp-modal">
        <div className="pp-modal-h">
          <h3>{editing.mode === 'add' ? 'Thêm sản phẩm mới' : 'Sửa hồ sơ sản phẩm'}</h3>
          <button className="pp-x" onClick={() => !saving && setEditing(null)}>×</button>
        </div>
        <div className="pp-modal-b">
          {data.fields.map((f, i) => {
            const g = (data.groups[i] || '').replace(/^\d+\.\s*/, '');
            const prevG = i > 0 ? (data.groups[i - 1] || '').replace(/^\d+\.\s*/, '') : '';
            return (
              <React.Fragment key={i}>
                {g && g !== prevG && <div className="pp-fgrp">{g}</div>}
                <div className="pp-fld-e">
                  <label>{f}</label>
                  <textarea rows={(editing.values[i] || '').length > 70 ? 3 : 1} value={editing.values[i] || ''}
                    onChange={(e) => { const v = [...editing.values]; v[i] = e.target.value; setEditing({ ...editing, values: v }); }} />
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div className="pp-modal-f">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {editing.mode === 'edit' && <button className="pp-btn danger" disabled={saving} onClick={deleteCurrent}>Xóa</button>}
            {saveErr && <span style={{ color: 'var(--red)', fontSize: 12 }}>{saveErr}</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="pp-btn" disabled={saving} onClick={() => setEditing(null)}>Hủy</button>
            <button className="pp-btn primary" disabled={saving} onClick={saveEditing}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  if (loading) return <div className="ppx">{styleEl}<div className="pp-msg"><div className="pp-spin" />Đang tải hồ sơ sản phẩm…</div></div>;
  if (err) return <div className="ppx">{styleEl}<div className="pp-msg">⚠️ {err}<br /><button className="pp-retry" onClick={load}>Thử lại</button></div></div>;
  if (!data || products.length === 0) return <div className="ppx">{styleEl}{modalEl}<div className="pp-msg">Chưa có sản phẩm nào.{isAdmin && <><br /><button className="pp-retry" onClick={openAdd}>＋ Thêm sản phẩm</button></>}</div></div>;

  const cur = products[sel] || products[0];
  const gv = (i: number) => (i >= 0 ? cur.values[i] : '') || '';

  return (
    <div className="ppx">
      {styleEl}
      <div className="pp-app" ref={appRef}>
        {/* Danh sách sản phẩm */}
        <aside className="pp-side">
          <div className="pp-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--faint)' }}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm sản phẩm, mã, SKU…" />
          </div>
          <div className="pp-sidelabel">Danh mục sản phẩm · {products.length}</div>
          <div className="pp-list">
            {filtered.map(({ p, i }) => (
              <button key={i} className={'pp-item' + (i === sel ? ' on' : '')} onClick={() => { setSel(i); setTab('detail'); }}>
                <span className="pp-code">{codeOf(p)}</span>
                <span className="pp-nm">{nameOf(p).replace(/^NOMA\s*\d+\s*[-–]\s*/i, '')}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="pp-sidelabel" style={{ padding: 12 }}>Không tìm thấy.</div>}
          </div>
        </aside>

        {/* Nội dung */}
        <div className="pp-main">
          <div className="pp-top">
            <div className="pp-tabs">
              <button className={'pp-tab' + (tab === 'detail' ? ' on' : '')} onClick={() => setTab('detail')}>Hồ sơ chi tiết</button>
              <button className={'pp-tab' + (tab === 'matrix' ? ' on' : '')} onClick={() => setTab('matrix')}>Ma trận dữ liệu</button>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {isAdmin && <button className="pp-btn primary" onClick={openAdd}>＋ Thêm sản phẩm</button>}
              {isAdmin && <button className="pp-btn" onClick={openEdit}>✎ Sửa</button>}
              <button className="pp-sync" onClick={refresh} title="Tải lại dữ liệu mới nhất"><span className="d" /> Làm mới</button>
            </div>
          </div>

          {tab === 'detail' ? (
            <div className="pp-detail">
              <nav className="pp-toc">
                <div className="h">Nội dung</div>
                {bodyGroups.flatMap((g) => g.items).filter((it) => !isEmpty(cur.values[it.idx])).map((it) => (
                  <a key={it.idx} href={'#f-' + it.idx}>{prettyLabel(it.name)}</a>
                ))}
              </nav>
              <div className="pp-content">
              {/* Hero */}
              <div className="pp-hero">
                <div className="pp-eyebrow"><span className="b">Hồ sơ sản phẩm</span> {gv(iCode)}</div>
                <h1 className="pp-title">{gv(iName)}</h1>
                <div className="pp-idrow">
                  {!isEmpty(gv(iCode)) && <span className="pp-idchip"><i>Mã SP</i> {gv(iCode)}</span>}
                  {!isEmpty(gv(iSku)) && <span className="pp-idchip"><i>SKU</i> {gv(iSku)}</span>}
                  {!isEmpty(gv(iCat)) && <span className="pp-idchip"><i>Danh mục</i> {gv(iCat)}</span>}
                </div>
                {!isEmpty(gv(iDesc)) && <p className="pp-lede">{gv(iDesc)}</p>}
                <div className="pp-specstrip">
                  {[/Dung tích/i, /Thể sản phẩm/i, /Mùi/i, /Hạn sử dụng/i, /Bảo hành/i].map((re, k) => {
                    const idx = findIdx(fields, re); const v = gv(idx);
                    if (idx < 0 || isEmpty(v)) return null;
                    return <div className="pp-spec" key={k}><div className="k">{fields[idx]}</div><div className="v">{v}</div></div>;
                  })}
                </div>
              </div>

              {/* Nội dung theo nhóm */}
              {bodyGroups.map((g, gi) => {
                const visible = g.items.filter((it) => !isEmpty(cur.values[it.idx]));
                if (visible.length === 0) return null;
                return (
                  <section className="pp-card" key={gi}>
                    <div className="pp-cardh"><span className="n">{gi + 1}</span><h3>{g.group}</h3></div>
                    <div className="pp-cardb">
                      {visible.map((it) => <FieldBlock key={it.idx} anchor={'f-' + it.idx} name={it.name} value={cur.values[it.idx]} />)}
                    </div>
                  </section>
                );
              })}
              </div>
            </div>
          ) : (
            <div className="pp-body">
              <div className="pp-mtool">
                <div className="pp-legend">
                  <span className="g">● Có dữ liệu</span><span className="r">– Còn trống</span>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>· {products.length} sản phẩm × {fields.length} trường</span>
                </div>
                <button className="pp-print" onClick={() => window.print()}>⎙ In / PDF</button>
              </div>
              <div className="pp-mwrap">
                <table className="pp-mtable">
                  <thead>
                    <tr>
                      <th className="corner">Sản phẩm · SKU</th>
                      {fields.map((f, i) => <th className="fld" key={i}><span>{f}</span></th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, ri) => {
                      const filled = p.values.filter((v) => !isEmpty(v)).length;
                      return (
                        <tr key={ri}>
                          <th className="pc"><b>{iCode >= 0 && !isEmpty(p.values[iCode]) ? p.values[iCode] : nameOf(p).slice(0, 16)}</b><small>{(iSku >= 0 ? p.values[iSku] : '') || '—'} · {filled}/{fields.length}</small></th>
                          {p.values.map((v, ci) => <td className={'c ' + (isEmpty(v) ? 'no' : 'yes')} key={ci}>{isEmpty(v) ? '–' : '●'}</td>)}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      {modalEl}
    </div>
  );
}

// ── Field renderer (special cases: claim / lưu ý / chips) ────────────────────
// Số thứ tự: "Bước N…" hoặc số 1–2 chữ số + dấu . ) rồi PHẢI có khoảng trắng.
// (Yêu cầu ≤2 chữ số + khoảng trắng để không bắt nhầm giá kiểu VN: "109.000", "150.000".)
const NUM_RE = /^(?:bước\s*\d+\s*[:.)]?\s+|\d{1,2}[.)]\s+)/i;
const BUL_RE = /^[-•+*◆·]\s+/;
const DEF_RE = /^([^:]{2,52}):\s+(.+)$/;
const isMajority = (lines: string[], re: RegExp) => lines.length >= 2 && lines.filter((l) => re.test(l)).length >= Math.ceil(lines.length * 0.6);

function renderContent(lines: string[], raw: string) {
  if (isMajority(lines, NUM_RE)) return <ol className="pp-ol">{lines.map((l, i) => <li key={i}>{l.replace(NUM_RE, '')}</li>)}</ol>;
  if (isMajority(lines, BUL_RE)) return <ul className="pp-ul">{lines.map((l, i) => <li key={i}>{l.replace(BUL_RE, '')}</li>)}</ul>;
  if (isMajority(lines, DEF_RE)) {
    return <div className="pp-def">{lines.map((l, i) => { const m = l.match(DEF_RE); return m ? <div className="di" key={i}><b>{m[1]}:</b> {m[2]}</div> : <div className="di" key={i}>{l}</div>; })}</div>;
  }
  return <div className="pp-val">{raw}</div>;
}

function FieldBlock({ name, value, anchor }: { name: string; value: string; anchor: string }) {
  const v = (value || '').trim();
  if (isEmpty(v)) return null;
  const lines = v.split(/\n+/).map((s) => s.trim()).filter(Boolean);

  if (/keyword|từ khóa|hashtag/i.test(name)) {
    return (
      <div className="pp-row" id={anchor}>
        <div className="l">{name}</div>
        <div className="pp-tags">{lines.map((c, i) => <span className={'pp-tag' + (/hashtag/i.test(name) ? ' hash' : '')} key={i}>{c}</span>)}</div>
      </div>
    );
  }
  if (/claim/i.test(name)) {
    const no = /không được/i.test(name);
    return (
      <div className={'pp-panel ' + (no ? 'red' : 'green')} id={anchor}>
        <div className="l">{name}</div>
        <ul className="pp-clist">{lines.map((c, i) => <li key={i}>{c.replace(/^[✅❌•\-]\s*/, '')}</li>)}</ul>
      </div>
    );
  }
  if (/lưu ý/i.test(name)) {
    return (
      <div className="pp-panel amber" id={anchor}>
        <div className="l">{name}</div>
        <ul className="pp-clist">{lines.map((c, i) => <li key={i}>{c.replace(/^\d+[.)]\s*|^-\s*/, '')}</li>)}</ul>
      </div>
    );
  }
  return (
    <div className="pp-row" id={anchor}>
      <div className="l">{name}</div>
      <div className="v">{renderContent(lines, v)}</div>
    </div>
  );
}
