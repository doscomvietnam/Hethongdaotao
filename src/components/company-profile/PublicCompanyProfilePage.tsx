import * as React from 'react';
import { Building2, LogIn } from 'lucide-react';
import CompanyProfilePage from './CompanyProfilePage';
import { convertGoogleDriveToSlideEmbedUrl, convertGoogleDriveToVideoEmbedUrl } from '../../services/mediaHelpers';
import type { Course } from '../../types';

/**
 * Hồ sơ công ty — bản CÔNG KHAI (xem KHÔNG cần đăng nhập).
 * Tự lấy dữ liệu qua /api/company-profile (service_role, chỉ 3 brand công ty),
 * bọc trong khung sáng gọn có nút "Đăng nhập", tái dùng UI của CompanyProfilePage.
 */
export default function PublicCompanyProfilePage() {
  const [courses, setCourses] = React.useState<Course[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    fetch('/api/company-profile')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then((d) => {
        if (!alive) return;
        const mapped = (d.courses || []).map((item: any) => ({
          id: item.course_id,
          title: item.course_name,
          brand: item.brand,
          category: item.category,
          slideUrl: convertGoogleDriveToSlideEmbedUrl(item.slide_url || ''),
          videoUrl: convertGoogleDriveToVideoEmbedUrl(item.video_url || ''),
        })) as unknown as Course[];
        setCourses(mapped);
      })
      .catch(() => {
        if (alive) setErr('Không tải được hồ sơ công ty. Vui lòng thử lại.');
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="pub-root">
      <style>{PUB_CSS}</style>

      <header className="pub-hd">
        <div className="pub-hd-l">
          <div className="pub-logo"><Building2 className="w-5 h-5" /></div>
          <div>
            <div className="pub-brand">Doscom Academy</div>
            <div className="pub-tag">Hồ sơ công ty · Trang công khai</div>
          </div>
        </div>
        <a className="pub-login" href="/login">
          <LogIn className="w-4 h-4" /> Đăng nhập
        </a>
      </header>

      <main className="pub-main">
        {err ? (
          <div className="pub-msg">{err}</div>
        ) : !courses ? (
          <div className="pub-msg">
            <div className="pub-spin" /> Đang tải hồ sơ công ty…
          </div>
        ) : (
          <CompanyProfilePage courses={courses} />
        )}
      </main>
    </div>
  );
}

const PUB_CSS = `
.pub-root { min-height:100dvh; background:#f5f7fa; color:#1e293b;
  font-family:"Be Vietnam Pro","Inter",system-ui,-apple-system,"Segoe UI",sans-serif; }
.pub-root *, .pub-root *::before, .pub-root *::after { box-sizing:border-box; }
.pub-hd { position:sticky; top:0; z-index:20; display:flex; align-items:center; justify-content:space-between;
  gap:16px; padding:12px clamp(16px,4vw,32px); background:rgba(255,255,255,.9); backdrop-filter:blur(8px);
  border-bottom:1px solid #e2e8f0; }
.pub-hd-l { display:flex; align-items:center; gap:12px; }
.pub-logo { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center;
  background:#eff6ff; color:#2563eb; border:1px solid #dbeafe; flex:none; }
.pub-brand { font-size:15px; font-weight:900; letter-spacing:-.01em; }
.pub-tag { font-size:11.5px; color:#64748b; margin-top:1px; }
.pub-login { display:inline-flex; align-items:center; gap:7px; font-size:13px; font-weight:800; color:#fff;
  background:#2563eb; border:none; padding:9px 16px; border-radius:11px; text-decoration:none;
  box-shadow:0 6px 16px rgba(37,99,235,.28); transition:background .12s; }
.pub-login:hover { background:#1d4ed8; }
.pub-main { max-width:1200px; margin:0 auto; padding:clamp(16px,3vw,28px) clamp(16px,4vw,32px) 32px; }
.pub-msg { display:flex; align-items:center; justify-content:center; gap:12px; min-height:50vh;
  color:#64748b; font-size:14px; font-weight:600; }
.pub-spin { width:22px; height:22px; border-radius:50%; border:2px solid #cbd5e1; border-top-color:#2563eb;
  animation:pub-rot .7s linear infinite; }
@keyframes pub-rot { to { transform:rotate(360deg); } }
`;
