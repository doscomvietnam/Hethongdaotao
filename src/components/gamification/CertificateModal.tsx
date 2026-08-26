import * as React from 'react';
import { X, Printer, Award } from 'lucide-react';

interface CertificateModalProps {
  name: string;         // tên người được cấp
  courseName: string;   // tên khóa nhỏ
  score: number;        // điểm đạt (%)
  date: string;         // ngày cấp (đã format)
  onClose: () => void;
}

export default function CertificateModal({ name, courseName, score, date, onClose }: CertificateModalProps) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="cert-overlay" onClick={onClose}>
      <style>{CSS}</style>
      <div className="cert-box" onClick={(e) => e.stopPropagation()}>
        {/* Giấy chứng nhận */}
        <div className="cert-print-area">
          <div className="cert-paper">
            <div className="cert-frame">
              <div className="cert-eyebrow">Hệ thống đào tạo · Doscom Academy</div>
              <div className="cert-seal">🏅</div>
              <h1 className="cert-title">Giấy chứng nhận hoàn thành</h1>
              <div className="cert-rule"><span /></div>
              <p className="cert-lead">Chứng nhận</p>
              <p className="cert-name">{name || 'Học viên'}</p>
              <p className="cert-lead">đã hoàn thành và đạt bài kiểm tra khóa học</p>
              <p className="cert-course">“{courseName}”</p>
              <div className="cert-meta">
                <div className="cert-meta-item">
                  <span className="cert-meta-l">Kết quả</span>
                  <span className="cert-score">Đạt {score}%</span>
                </div>
                <div className="cert-meta-item">
                  <span className="cert-meta-l">Ngày cấp</span>
                  <span className="cert-meta-v">{date}</span>
                </div>
              </div>
              <div className="cert-foot">
                <Award className="cert-foot-ico" />
                <span>Đã ghi nhận vào Tủ huy hiệu của bạn</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nút thao tác (không in) */}
        <div className="cert-actions">
          <button className="cert-btn cert-print" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> In / Lưu PDF
          </button>
          <button className="cert-btn cert-close" onClick={onClose}>
            <X className="w-4 h-4" /> Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.cert-overlay { position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center;
  padding:20px; background:rgba(6,8,15,.78); backdrop-filter:blur(6px); animation:certfade .25s ease; }
@keyframes certfade { from{opacity:0} to{opacity:1} }
.cert-box { width:min(720px,96vw); max-height:94vh; overflow:auto; display:flex; flex-direction:column; gap:16px;
  animation:certpop .3s cubic-bezier(.2,.8,.2,1); }
@keyframes certpop { from{opacity:0; transform:translateY(12px) scale(.98)} to{opacity:1; transform:none} }

.cert-paper { background:
    radial-gradient(120% 100% at 50% 0%, #fffdf6 0%, #fbf6e9 55%, #f6efdc 100%);
  border-radius:18px; padding:14px; box-shadow:0 30px 80px rgba(0,0,0,.5); }
.cert-frame { border:2px solid #caa646; border-radius:12px; padding:34px 30px 28px; text-align:center; position:relative;
  outline:1px solid #e7d9a8; outline-offset:5px; }
.cert-eyebrow { font-size:11px; font-weight:800; letter-spacing:.22em; text-transform:uppercase; color:#a9832f; }
.cert-seal { font-size:46px; line-height:1; margin:12px 0 6px; filter:drop-shadow(0 6px 10px rgba(180,140,40,.35)); }
.cert-title { font-family:Georgia,'Times New Roman',serif; font-size:30px; font-weight:800; color:#1c2430;
  margin:2px 0 0; letter-spacing:.01em; text-wrap:balance; }
.cert-rule { display:flex; justify-content:center; margin:14px 0 18px; }
.cert-rule span { width:120px; height:3px; border-radius:3px;
  background:linear-gradient(90deg,transparent,#caa646,transparent); }
.cert-lead { font-size:13px; color:#5b6472; margin:6px 0; font-style:italic; }
.cert-name { font-family:Georgia,'Times New Roman',serif; font-size:32px; font-weight:800; color:#0f5132;
  margin:4px 0 2px; text-wrap:balance; }
.cert-course { font-size:16px; font-weight:700; color:#1c2430; margin:6px auto 0; max-width:90%; line-height:1.45; text-wrap:balance; }
.cert-meta { display:flex; justify-content:center; gap:40px; margin:24px 0 6px; flex-wrap:wrap; }
.cert-meta-item { display:flex; flex-direction:column; gap:4px; }
.cert-meta-l { font-size:10px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:#94897a; }
.cert-meta-v { font-size:14px; font-weight:700; color:#1c2430; }
.cert-score { font-size:15px; font-weight:900; color:#0f5132; }
.cert-foot { display:inline-flex; align-items:center; gap:8px; margin-top:22px; padding:8px 16px;
  background:rgba(15,81,50,.08); border:1px solid rgba(15,81,50,.18); border-radius:999px;
  font-size:11px; font-weight:800; letter-spacing:.02em; color:#0f5132; }
.cert-foot-ico { width:15px; height:15px; }

.cert-actions { display:flex; justify-content:center; gap:12px; }
.cert-btn { display:inline-flex; align-items:center; gap:8px; padding:11px 20px; border-radius:12px;
  font-size:12.5px; font-weight:800; letter-spacing:.03em; cursor:pointer; border:none; transition:all .15s; }
.cert-print { background:#0f5132; color:#fff; }
.cert-print:hover { background:#0b3d26; }
.cert-close { background:rgba(255,255,255,.1); color:#e5e7eb; border:1px solid rgba(255,255,255,.18); }
.cert-close:hover { background:rgba(255,255,255,.18); }

@media print {
  body * { visibility:hidden !important; }
  .cert-print-area, .cert-print-area * { visibility:visible !important; }
  .cert-print-area { position:fixed; inset:0; margin:0; padding:24px; background:#fff; }
  .cert-overlay { position:static; background:none; backdrop-filter:none; padding:0; }
  .cert-actions { display:none !important; }
  .cert-paper { box-shadow:none; }
}
`;
