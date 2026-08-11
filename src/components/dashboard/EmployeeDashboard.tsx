import * as React from 'react';
import {
  BookOpen, CheckCircle2, Zap, AlertCircle, Clock,
  Trophy, Star, Award, Flame, ArrowRight, Play, TrendingUp,
  CalendarCheck, XCircle,
} from 'lucide-react';
import { Course } from '../../types';
import { Card, Badge, Progress } from '../ui';
import { getYesterdayOverdueForUser } from '../../services/dailyAttendanceService';
import { getEmployeeMonthlyQuizCalendar, type MonthlyQuizCalendar } from '../../services/attendanceService';
import { GamificationWidget } from '../gamification/GamificationWidget';

// ── Helper: level info ──────────────────────────────────────────────────
function getLevelInfo(rate: number) {
  if (rate >= 90) return { label: 'Bậc thầy sản phẩm', icon: Flame, color: 'text-amber-400', gradient: 'from-amber-500 to-orange-500' };
  if (rate >= 60) return { label: 'Chuyên gia SP', icon: Trophy, color: 'text-emerald-500', gradient: 'from-emerald-500 to-teal-500' };
  if (rate >= 30) return { label: 'Học viên tích cực', icon: Star, color: 'text-blue-400', gradient: 'from-blue-500 to-cyan-500' };
  return { label: 'Tân binh đào tạo', icon: Award, color: 'text-amber-500', gradient: 'from-amber-500 to-orange-500' };
}

// ── Vòng tròn tiến độ (SVG) ─────────────────────────────────────────────
function CompletionRing({ value, size = 132, stroke = 11, colorClass = 'text-emerald-400' }: {
  value: number; size?: number; stroke?: number; colorClass?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, value)) / 100) * circ;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" className="stroke-zinc-300" />
        <circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeLinecap="round" fill="none"
          stroke="currentColor" className={`${colorClass} transition-all duration-1000`}
          strokeDasharray={circ} strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white tabular-nums leading-none">{value}%</span>
        <span className="text-[8px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1.5">Hoàn thành</span>
      </div>
    </div>
  );
}

// ── Chỉ số nhanh trong hero ─────────────────────────────────────────────
function HeroStat({ icon: Icon, color, value, label }: {
  icon: React.ElementType; color: string; value: string | number; label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-9 h-9 rounded-xl bg-white/[0.03] ring-1 ring-white/10 flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="leading-none">
        <p className={`text-lg font-black tabular-nums ${color} leading-none`}>{value}</p>
        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1">{label}</p>
      </div>
    </div>
  );
}

// ── Biểu đồ cột hoạt động quiz trong tháng (hero Mẫu C) ──────────────────
function QuizBars({ calendar }: { calendar: MonthlyQuizCalendar }) {
  const bars = calendar.days.filter(d => d.status !== 'sunday');
  return (
    <div>
      <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-2">Hoạt động quiz T{calendar.days[0]?.date.slice(5, 7)}</p>
      <div className="flex items-end gap-[3px] h-16">
        {bars.map(d => {
          let cls = 'h-1.5 bg-zinc-800';
          if (d.status === 'done') cls = 'h-full bg-gradient-to-t from-emerald-600 to-emerald-400';
          else if (d.status === 'today') cls = 'h-2/3 bg-gradient-to-t from-blue-600 to-blue-400';
          else if (d.status === 'future' || d.status === 'holiday' || d.status === 'absent') cls = 'h-1.5 bg-zinc-800';
          else cls = 'h-1/3 bg-gradient-to-t from-red-600 to-red-500';
          return <div key={d.date} className={`flex-1 min-w-[3px] rounded-t ${cls}`} title={d.date} />;
        })}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">{calendar.stat.done} đã làm</span>
        {calendar.stat.missed > 0 && <span className="text-[9px] text-red-400 font-black uppercase tracking-widest">{calendar.stat.missed} chưa</span>}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, bg, ring, pct, barColor }: {
  label: string; value: string | number; icon: React.ElementType; color: string; bg: string; ring: string; pct?: number; barColor?: string;
}) {
  return (
    <Card className="p-4 lg:p-5 bg-[#0C0C0E] border-zinc-900 rounded-2xl hover:border-zinc-800 transition-all">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest leading-none">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${bg} ring-1 ${ring} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className={`text-2xl lg:text-3xl font-black ${color} tracking-tighter tabular-nums leading-none`}>{value}</p>
      {pct != null && (
        <div className="mt-3 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor || 'bg-emerald-500'} transition-all duration-1000`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
        </div>
      )}
    </Card>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, color = 'text-emerald-500', bg = 'bg-emerald-500/10', ring = 'ring-emerald-500/30' }: {
  icon: React.ElementType; title: string; subtitle?: string; color?: string; bg?: string; ring?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`w-10 h-10 rounded-2xl ${bg} ring-1 ${ring} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <h3 className="font-black text-white text-lg uppercase tracking-tight leading-none">{title}</h3>
        {subtitle && <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Monthly quiz calendar ───────────────────────────────────────────────
function MonthlyCalendarCard({ calendar, yearMonth }: {
  calendar: MonthlyQuizCalendar;
  yearMonth: string;
}) {
  const [y, m] = yearMonth.split('-').map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay(); // 0=Sun
  const offset = firstDow === 0 ? 6 : firstDow - 1; // Mon-first: Mon=0..Sun=6
  const dayHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const cells = [...Array(offset).fill(null) as null[], ...calendar.days];
  const { stat } = calendar;
  const pct = stat.required > 0 ? Math.round(stat.done / stat.required * 100) : 0;

  return (
    <Card className="p-5 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Lịch kiểm tra hằng ngày</p>
            <p className="text-sm font-black text-white">
              Tháng {m}/{y} · <span className="text-emerald-400">{pct}%</span> hoàn thành
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-[9px] font-bold uppercase tracking-widest">
          <span className="text-emerald-400">{stat.done} đã làm</span>
          {stat.missed > 0 && <span className="text-red-400">{stat.missed} chưa làm</span>}
          {stat.absent > 0 && <span className="text-zinc-500">{stat.absent} nghỉ</span>}
          <span className="text-zinc-600">/ {stat.required} ngày</span>
          {calendar.days.some(d => d.status === 'today') && (
            <span className="text-blue-400">hôm nay chưa làm</span>
          )}
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayHeaders.map(h => (
          <div key={h} className="text-center text-[9px] font-black text-zinc-600 uppercase py-1">{h}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((entry, i) => {
          if (!entry) return <div key={`pad-${i}`} className="h-9" />;
          const { day, status, date } = entry;

          if (status === 'sunday') return (
            <div key={date} className="h-9 flex items-center justify-center rounded-lg">
              <span className="text-[10px] font-bold text-zinc-800">{day}</span>
            </div>
          );
          if (status === 'future') return (
            <div key={date} className="h-9 flex items-center justify-center rounded-lg bg-zinc-900/40">
              <span className="text-[10px] font-bold text-zinc-700">{day}</span>
            </div>
          );
          if (status === 'holiday') return (
            <div key={date} className="h-9 flex flex-col items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
              <span className="text-[9px] font-bold text-amber-500">{day}</span>
              <span className="text-[7px] text-amber-700 leading-none">lễ</span>
            </div>
          );
          if (status === 'absent') return (
            <div key={date} className="h-9 flex flex-col items-center justify-center rounded-lg bg-zinc-800/40 ring-1 ring-zinc-700/20">
              <span className="text-[9px] font-bold text-zinc-500">{day}</span>
              <span className="text-[7px] text-zinc-600 leading-none">nghỉ</span>
            </div>
          );
          if (status === 'done') return (
            <div key={date} className="h-9 flex flex-col items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/25">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 mb-0.5" />
              <span className="text-[9px] font-black text-emerald-400 leading-none">{day}</span>
            </div>
          );
          if (status === 'today') return (
            <div key={date} className="h-9 flex flex-col items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/30 animate-pulse">
              <Clock className="w-3 h-3 text-blue-400 mb-0.5" />
              <span className="text-[9px] font-black text-blue-400 leading-none">{day}</span>
            </div>
          );
          return (
            <div key={date} className="h-9 flex flex-col items-center justify-center rounded-lg bg-red-500/10 ring-1 ring-red-500/20">
              <XCircle className="w-3 h-3 text-red-400 mb-0.5" />
              <span className="text-[9px] font-black text-red-400 leading-none">{day}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-zinc-900">
        {[
          { cls: 'bg-emerald-500/20 ring-1 ring-emerald-500/30', label: 'Đã làm' },
          { cls: 'bg-red-500/15 ring-1 ring-red-500/20', label: 'Chưa làm' },
          { cls: 'bg-blue-500/10 ring-1 ring-blue-500/30', label: 'Hôm nay' },
          { cls: 'bg-zinc-800/50 ring-1 ring-zinc-700/20', label: 'Nghỉ làm' },
          { cls: 'bg-amber-500/10 ring-1 ring-amber-500/20', label: 'Ngày lễ' },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${cls}`} />
            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// EMPLOYEE DASHBOARD
// ══════════════════════════════════════════════════════════════════════════
interface EmployeeDashboardProps {
  courses: Course[];
  onCourseClick: (course: Course) => void;
  employeeId?: string;
  employeeName?: string;
  department?: string;
}

export function EmployeeDashboardView({ courses: allCourses, onCourseClick, employeeId, employeeName, department }: EmployeeDashboardProps) {
  // Lọc khóa tính vào Dashboard (tỷ lệ hoàn thành / khóa được giao):
  //  - Lộ trình học (CEO, Sale) VẪN tính vào % (theo yêu cầu), dù có mục "Lộ trình học" riêng.
  //  - Khóa sản phẩm (Doscom, Noma) chỉ tính cho phòng Kinh doanh + Marketing;
  //    phòng khác vẫn xem được nhưng không bị tính vào %.
  const courses = React.useMemo(() => {
    const isSalesDept = ['kinh doanh', 'marketing'].some(k => (department || '').toLowerCase().includes(k));
    return allCourses.filter(c => {
      if (!isSalesDept && (c.brand === 'Doscom' || c.brand === 'Noma')) return false;
      return true;
    });
  }, [allCourses, department]);
  const now = new Date();

  // Cảnh báo vắng làm bài hôm qua (8h30-18h, trừ Chủ nhật, miễn trừ nếu hoàn thành tất cả khóa)
  const [overdueInfo, setOverdueInfo] = React.useState<{ overdue: boolean; missedDate?: string }>({ overdue: false });
  React.useEffect(() => {
    if (!employeeId) return;
    getYesterdayOverdueForUser(employeeId, department || '')
      .then(setOverdueInfo)
      .catch((e) => console.error('Overdue check failed:', e));
  }, [employeeId, department]);

  // Thống kê kiểm tra hằng ngày tháng hiện tại
  const currentYM = React.useMemo(() => {
    return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 7);
  }, []);
  const [quizCalendar, setQuizCalendar] = React.useState<MonthlyQuizCalendar | null>(null);
  React.useEffect(() => {
    if (!employeeId) return;
    getEmployeeMonthlyQuizCalendar(employeeId, currentYM)
      .then(setQuizCalendar)
      .catch(e => console.error('Quiz stat error:', e));
  }, [employeeId, currentYM]);

  const completedCourses = courses.filter(c => c.progress === 100 || c.isCompleted);
  const ongoingCourses = courses.filter(c => c.progress > 0 && c.progress < 100 && !c.isCompleted);
  const completionRate = courses.length > 0 ? Math.round((completedCourses.length / courses.length) * 100) : 0;

  // Continue learning — most recent ongoing course
  const continueCourse = ongoingCourses.length > 0 ? ongoingCourses[0] : null;

  const levelInfo = getLevelInfo(completionRate);

  const [curM] = currentYM.split('-');
  const totalC = courses.length || 1;
  const kpiCards = [
    { label: 'KHÓA ĐƯỢC GIAO', value: courses.length, icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10', ring: 'ring-blue-500/20', pct: 100, barColor: 'bg-blue-500' },
    { label: 'ĐÃ HOÀN THÀNH', value: completedCourses.length, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20', pct: Math.round(completedCourses.length / totalC * 100), barColor: 'bg-emerald-500' },
    { label: 'ĐANG HỌC', value: ongoingCourses.length, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20', pct: Math.round(ongoingCourses.length / totalC * 100), barColor: 'bg-amber-500' },
    { label: 'TỶ LỆ HOÀN THÀNH', value: `${completionRate}%`, icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/10', ring: 'ring-violet-500/20', pct: completionRate, barColor: 'bg-violet-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Hero (Mẫu C — vòng tròn · danh tính · biểu đồ quiz) */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-900 bg-[#0C0C0E] p-6 lg:p-8">
        <div className={`absolute -top-24 -right-16 w-80 h-80 rounded-full bg-gradient-to-br ${levelInfo.gradient} opacity-[0.1] blur-3xl pointer-events-none`} />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_auto] items-center gap-8">
          {/* Vòng tròn hoàn thành */}
          <div className="flex justify-center">
            <CompletionRing value={completionRate} colorClass={levelInfo.color} />
          </div>

          {/* Danh tính + chỉ số nhanh */}
          <div className="min-w-0 space-y-4 text-center md:text-left">
            <div>
              <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.35em]">Tổng quan cá nhân</p>
              <h1 className="text-2xl lg:text-4xl font-black tracking-tighter text-white uppercase leading-none mt-2 truncate">
                {employeeName || 'Xin chào'}
              </h1>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest">
                <levelInfo.icon className={`w-3.5 h-3.5 ${levelInfo.color}`} />
                <span className={levelInfo.color}>{levelInfo.label}</span>
              </span>
              {department && <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">{department}</span>}
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-x-7 gap-y-3 pt-1">
              <HeroStat icon={CheckCircle2} color="text-emerald-400" value={`${completedCourses.length}/${courses.length}`} label="Hoàn thành" />
              <HeroStat icon={Zap} color="text-amber-400" value={ongoingCourses.length} label="Đang học" />
              <HeroStat icon={CalendarCheck} color="text-blue-400" value={quizCalendar ? `${quizCalendar.stat.done}/${quizCalendar.stat.required}` : '—'} label={`Quiz T${curM}`} />
            </div>
          </div>

          {/* Biểu đồ cột hoạt động quiz */}
          {quizCalendar && (
            <div className="w-full lg:w-52 md:col-span-2 lg:col-span-1">
              <QuizBars calendar={quizCalendar} />
            </div>
          )}
        </div>
      </section>

      {/* Banner: vắng làm bài hôm qua */}
      {overdueInfo.overdue && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-red-500/10 border border-red-500/30 ring-1 ring-red-500/20">
          <div className="w-11 h-11 rounded-xl bg-red-500/20 ring-1 ring-red-500/40 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-red-300 uppercase tracking-widest mb-1">Bạn đã bỏ lỡ quiz hôm qua</p>
            <p className="text-xs font-bold text-red-200/80 leading-relaxed">
              Ngày <span className="font-mono text-red-300">{overdueInfo.missedDate}</span> bạn không có điểm quiz nào được ghi nhận. Vui lòng hoàn thành ít nhất 1 bài hôm nay để không bị tính quá hạn.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {kpiCards.map((kpi, i) => <KpiCard key={i} {...kpi} />)}
      </div>

      {/* Gamification: XP · Streak · Thành tích */}
      {employeeId && <GamificationWidget employeeId={employeeId} />}

      {/* Lịch kiểm tra hằng ngày tháng này */}
      {quizCalendar && (
        <MonthlyCalendarCard calendar={quizCalendar} yearMonth={currentYM} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Continue learning + Assigned courses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Continue learning */}
          {continueCourse && (
            <Card className="p-0 bg-[#0C0C0E] border-zinc-900 rounded-2xl overflow-hidden">
              <div className="p-6">
                <SectionHeader icon={Play} title="Tiếp tục học" subtitle="Khóa học đang học gần nhất" />
                <div
                  className="flex items-center gap-5 p-4 rounded-xl bg-zinc-950 border border-zinc-900 hover:border-emerald-500/30 cursor-pointer transition-all group"
                  onClick={() => onCourseClick(continueCourse)}
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0">
                    <img src={continueCourse.thumbnail} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Badge variant="default" className="text-[8px] mb-1">{continueCourse.brand}</Badge>
                    <p className="text-sm font-black text-zinc-100 uppercase tracking-tight truncate group-hover:text-emerald-400 transition-colors">{continueCourse.title}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${continueCourse.progress}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-emerald-400 tabular-nums">{continueCourse.progress}%</span>
                    </div>
                    {continueCourse.endDate && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        <span className="text-[9px] text-zinc-600 font-bold">Deadline: {new Date(continueCourse.endDate).toLocaleDateString('vi-VN')}</span>
                      </div>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-all">
                    <ArrowRight className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Assigned courses */}
          <Card className="p-6 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
            <SectionHeader icon={BookOpen} title="Khóa học được giao" subtitle={`${courses.length} khóa học`} color="text-blue-400" bg="bg-blue-500/10" ring="ring-blue-500/30" />
            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-hide">
              {courses.length === 0 ? (
                <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest text-center py-10">Chưa có khóa học nào được giao</p>
              ) : courses.map(course => {
                const isOverdue = course.endDate && new Date(course.endDate) < now && !course.isCompleted;
                const isDone = course.isCompleted || course.progress === 100;
                return (
                  <div
                    key={course.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 cursor-pointer transition-all group"
                    onClick={() => onCourseClick(course)}
                  >
                    <div className="w-11 h-11 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 flex-shrink-0">
                      <img src={course.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-zinc-200 truncate group-hover:text-emerald-400 transition-colors">{course.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-zinc-600 font-bold">{course.brand}</span>
                        {course.endDate && (
                          <span className="text-[9px] text-zinc-700 font-bold">• {new Date(course.endDate).toLocaleDateString('vi-VN')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="w-12 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isDone ? 'bg-emerald-500' : isOverdue ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${course.progress}%` }} />
                      </div>
                      <span className={`text-[10px] font-black tabular-nums ${isDone ? 'text-emerald-400' : isOverdue ? 'text-red-400' : 'text-zinc-400'}`}>{course.progress}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

        </div>

        {/* Right sidebar: Achievements */}
        <div className="space-y-6">
          {/* Chỉ số hoàn thành (Mẫu C) */}
          <Card className="p-6 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
            <SectionHeader icon={levelInfo.icon} title="Chỉ số hoàn thành" subtitle={levelInfo.label} color={levelInfo.color} bg="bg-white/[0.05]" ring="ring-white/10" />
            <div className="flex items-center gap-5">
              <CompletionRing value={completionRate} size={96} stroke={9} colorClass={levelInfo.color} />
              <div className="min-w-0 space-y-2.5">
                <div>
                  <p className="text-3xl font-black text-white tabular-nums leading-none">
                    {completedCourses.length}<span className="text-zinc-600 text-xl">/{courses.length}</span>
                  </p>
                  <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mt-1.5">khóa hoàn thành</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-400 uppercase tracking-widest">
                    <Zap className="w-3 h-3" /> {ongoingCourses.length} đang học
                  </span>
                  {quizCalendar && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-blue-400 uppercase tracking-widest">
                      <CalendarCheck className="w-3 h-3" /> {quizCalendar.stat.done}/{quizCalendar.stat.required} quiz T{curM}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Learning history */}
          <Card className="p-6 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
            <SectionHeader icon={Clock} title="Lịch sử học tập" subtitle="Khóa đã hoàn thành gần đây" color="text-zinc-400" bg="bg-zinc-500/10" ring="ring-zinc-500/20" />
            <div className="space-y-2">
              {completedCourses.length === 0 ? (
                <div className="text-center py-6">
                  <BookOpen className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Chưa hoàn thành khóa nào</p>
                </div>
              ) : completedCourses.slice(0, 5).map(course => (
                <div key={course.id} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-950 border border-zinc-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <p className="text-[10px] font-bold text-zinc-300 truncate flex-1">{course.title}</p>
                  {course.lastQuizScore != null && (
                    <span className="text-[9px] font-black text-emerald-400 tabular-nums">{course.lastQuizScore}đ</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
