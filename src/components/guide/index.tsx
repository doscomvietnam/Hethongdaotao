import * as React from 'react';
import {
  BookOpen, Play, ClipboardCheck, BarChart3, LifeBuoy,
  AlertTriangle, CheckCircle2, Lock, Bell, FileText,
} from 'lucide-react';
import { Card } from '../ui';

// ─── Sub-components ─────────────────────────────────────────────────────

function StepNumber({ n }: { n: number }) {
  return (
    <span className="w-7 h-7 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30 text-emerald-400 text-[11px] font-black flex items-center justify-center flex-shrink-0">
      {n}
    </span>
  );
}

function Section({
  icon: Icon, title, subtitle, children, accent = 'emerald',
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  accent?: 'emerald' | 'amber' | 'blue' | 'purple';
}) {
  const colors = {
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/30' },
    amber:   { text: 'text-amber-400',   bg: 'bg-amber-500/10',   ring: 'ring-amber-500/30' },
    blue:    { text: 'text-blue-400',    bg: 'bg-blue-500/10',    ring: 'ring-blue-500/30' },
    purple:  { text: 'text-purple-400',  bg: 'bg-purple-500/10',  ring: 'ring-purple-500/30' },
  }[accent];

  return (
    <Card className="p-6 lg:p-8 bg-[#0C0C0E] border-zinc-900 rounded-3xl">
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-900">
        <div className={`w-12 h-12 rounded-2xl ${colors.bg} ring-1 ${colors.ring} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tight leading-none">{title}</h2>
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1.5">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <StepNumber n={n} />
      <div className="flex-1 text-sm text-zinc-300 font-medium leading-relaxed pt-0.5">{children}</div>
    </div>
  );
}

function Callout({
  variant = 'info', icon: Icon, children,
}: {
  variant?: 'info' | 'warn' | 'success';
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const cls = {
    info:    { bg: 'bg-blue-500/5',    border: 'border-blue-500/20',    text: 'text-blue-400' },
    warn:    { bg: 'bg-amber-500/5',   border: 'border-amber-500/20',   text: 'text-amber-400' },
    success: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  }[variant];
  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl ${cls.bg} border ${cls.border}`}>
      <Icon className={`w-4 h-4 ${cls.text} flex-shrink-0 mt-0.5`} />
      <div className="text-[12px] text-zinc-300 font-medium leading-relaxed">{children}</div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────

export default function GuidePage() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-5xl">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white uppercase leading-none">
              Hướng dẫn sử dụng
            </h1>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] mt-2">
              Hệ thống đào tạo Doscom — Tham khảo nhanh trong 3 phút
            </p>
          </div>
        </div>
      </header>

      {/* SECTION 1 — Cách vào học */}
      <Section icon={Play} title="1. Cách vào học" subtitle="Đăng nhập → chọn khóa → bắt đầu xem">
        <Step n={1}>
          Đăng nhập bằng <span className="font-bold text-white">email công ty</span> và mật khẩu được cấp.
          <span className="block text-[11px] text-zinc-500 italic mt-1">Lần đầu hệ thống yêu cầu đổi mật khẩu.</span>
        </Step>
        <Step n={2}>
          Vào menu <span className="font-black text-emerald-400">KHÓA HỌC PHÁT TRIỂN</span> ở thanh bên trái.
        </Step>
        <Step n={3}>
          Chọn <span className="font-bold text-white">tab thương hiệu</span> ở góc phải trên (Tất cả / Doscom / Noma / Nội bộ / Claude).
        </Step>
        <Step n={4}>
          Chọn <span className="font-bold text-white">chip lọc cấp 2</span>:
          <ul className="mt-2 space-y-1.5 text-[12px]">
            <li>• <span className="text-emerald-400 font-bold">Doscom / Noma</span>: dòng sản phẩm (Ghi âm, Camera, Định vị, Máy dò…)</li>
            <li>• <span className="text-emerald-400 font-bold">Nội bộ</span>: phòng ban (Kinh doanh, Tổng hợp, Công nghệ, Marketing, Kho)</li>
          </ul>
        </Step>
        <Step n={5}>
          Click thẻ khóa học để vào trang chi tiết. Trong đó:
          <ul className="mt-2 space-y-1.5 text-[12px]">
            <li>• Tab <span className="font-bold text-white">Video</span>: click để phát — hệ thống đếm thời gian xem thực tế</li>
            <li>• Tab <span className="font-bold text-white">Slide</span>: cuộn đọc, bấm <span className="font-bold">Mở ở tab mới</span> để xem toàn màn hình</li>
            <li>• Banner cam/đỏ hiển thị nếu khóa có deadline</li>
          </ul>
        </Step>

        <Callout variant="warn" icon={AlertTriangle}>
          <span className="font-black text-amber-400">Lưu ý:</span> Tua nhanh không được tính. Phải phát thật thì progress mới tăng. Tạm dừng video = dừng đếm.
        </Callout>
      </Section>

      {/* SECTION 2 — Cách làm bài test */}
      <Section icon={ClipboardCheck} title="2. Cách làm bài test" subtitle="Điều kiện mở → Các bước → Quy chế chấm" accent="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-900">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-amber-400" />
              <h3 className="text-[11px] font-black text-amber-400 uppercase tracking-widest">Điều kiện mở</h3>
            </div>
            <ul className="space-y-2 text-[12px] text-zinc-300 leading-relaxed">
              <li>• Xem video <span className="font-bold text-amber-400">≥ 50%</span> mới mở khóa nút làm bài</li>
              <li>• Mỗi nhân viên chỉ được làm <span className="font-bold text-amber-400">1 lần duy nhất</span></li>
            </ul>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-900">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Quy chế chấm</h3>
            </div>
            <ul className="space-y-2 text-[12px] text-zinc-300 leading-relaxed">
              <li>• 10 câu — đúng <span className="font-bold text-emerald-400">≥ 8/10</span> là đạt</li>
              <li>• Kết quả hiển thị ngay sau khi nộp</li>
              <li>• Điểm tự đồng bộ về Lark Base</li>
            </ul>
          </div>
        </div>

        <div className="pt-4 mt-2 border-t border-zinc-900 space-y-4">
          <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Các bước làm bài</h3>
          <Step n={1}>Cuộn xuống mục <span className="font-bold text-white">BÀI KIỂM TRA ĐÁNH GIÁ</span> ở trang chi tiết khóa học.</Step>
          <Step n={2}>Khi tiến độ video ≥ 50%, nút <span className="font-bold text-emerald-400">Bắt đầu làm bài test</span> chuyển xanh và mở khóa.</Step>
          <Step n={3}>Bấm nút → vào trang quiz.</Step>
          <Step n={4}>Mỗi đề có <span className="font-bold text-white">10 câu ngẫu nhiên</span> — chọn 1 đáp án (A/B/C/D) cho từng câu.</Step>
          <Step n={5}>Bấm <span className="font-bold text-white">Nộp bài</span> khi xong.</Step>
        </div>

        <Callout variant="warn" icon={AlertTriangle}>
          <span className="font-black text-amber-400">Cảnh báo:</span> Nộp bài là quyết định cuối. Không có lần làm lại.
        </Callout>
      </Section>

      {/* SECTION 3 — Cách xem kết quả */}
      <Section icon={BarChart3} title="3. Cách xem kết quả" subtitle="Trong khóa học → Dashboard tổng → Quản lý" accent="blue">
        <div>
          <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-3">Trong từng khóa học</h3>
          <p className="text-[12px] text-zinc-400 mb-3 leading-relaxed">
            Vào lại trang chi tiết khóa học → mục <span className="font-bold text-white">BÀI KIỂM TRA ĐÁNH GIÁ</span> hiển thị:
          </p>
          <ul className="space-y-1.5 text-[12px] text-zinc-300 pl-4">
            <li>• <span className="font-bold text-white">Kết quả cao nhất</span>: điểm đã đạt</li>
            <li>• <span className="font-bold text-white">Số lần thực hiện</span>: 1/1</li>
            <li>• <span className="font-bold text-white">Trạng thái</span>: ĐÃ HOÀN THÀNH (xanh) hoặc ĐÃ SỬ DỤNG HẾT LƯỢT (đỏ)</li>
          </ul>
        </div>

        <div className="pt-4 mt-2 border-t border-zinc-900">
          <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-3">Tổng quan trên Dashboard</h3>
          <Step n={1}>Vào menu <span className="font-black text-emerald-400">DASHBOARD</span> ở thanh bên.</Step>
          <Step n={2}>
            Các thông tin hiển thị:
            <ul className="mt-2 space-y-1.5 text-[12px]">
              <li>• Tiến độ tổng — % khóa học đã hoàn thành</li>
              <li>• Điểm trung bình quiz của bạn</li>
              <li>• Khóa học quá hạn (nếu có)</li>
              <li>• Khóa học sắp đến deadline (cảnh báo cam khi còn ≤ 2 ngày)</li>
            </ul>
          </Step>
          <Step n={3}>
            <span className="inline-flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chuông thông báo ở góc phải hiện khi:</span>
            </span>
            <ul className="mt-2 space-y-1.5 text-[12px]">
              <li>• Có khóa học mới giao cho phòng ban bạn</li>
              <li>• Khóa học sắp đến hạn</li>
            </ul>
          </Step>
        </div>

        <Callout variant="info" icon={FileText}>
          <span className="font-black text-blue-400">Dành cho quản lý / admin:</span>
          {' '}<span className="font-bold text-white">Manager</span> xem được kết quả của nhân viên trong phòng ban mình.
          {' '}<span className="font-bold text-white">Admin</span> xem toàn hệ thống tại trang <span className="font-bold">BẢNG QUẢN TRỊ ĐÀO TẠO</span>, có thể <span className="font-bold">Xuất Excel</span> hoặc <span className="font-bold">Đồng bộ Lark</span> để báo cáo.
        </Callout>
      </Section>

      {/* SECTION 4 — Hỗ trợ */}
      <Section icon={LifeBuoy} title="Hỗ trợ" subtitle="Các tình huống thường gặp" accent="purple">
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
            <p className="text-[11px] font-black text-zinc-300 uppercase tracking-widest mb-1.5">Quên mật khẩu</p>
            <p className="text-[12px] text-zinc-500 leading-relaxed">
              Bấm <span className="font-bold text-emerald-400">Quên mật khẩu</span> ở trang đăng nhập → nhập email → kiểm tra hộp thư reset.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
            <p className="text-[11px] font-black text-zinc-300 uppercase tracking-widest mb-1.5">Video không phát / slide không hiện</p>
            <p className="text-[12px] text-zinc-500 leading-relaxed">
              Thử refresh trang (F5). Nếu vẫn lỗi, báo IT kèm tên khóa học.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900">
            <p className="text-[11px] font-black text-zinc-300 uppercase tracking-widest mb-1.5">Sai điểm / sai kết quả</p>
            <p className="text-[12px] text-zinc-500 leading-relaxed">
              Liên hệ phòng nhân sự — không tự ý làm lại.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
