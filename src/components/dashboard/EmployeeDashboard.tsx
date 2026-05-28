import * as React from 'react';
import {
  BookOpen, CheckCircle2, Zap, AlertCircle, Clock,
  Trophy, Target, Star, Award, Flame, ArrowRight, Play, TrendingUp,
} from 'lucide-react';
import { Course } from '../../types';
import { Card, Badge, Progress } from '../ui';
import { getYesterdayOverdueForUser } from '../../services/dailyAttendanceService';

// ── Helper: level info ──────────────────────────────────────────────────
function getLevelInfo(rate: number) {
  if (rate >= 90) return { label: 'Bậc thầy sản phẩm', icon: Flame, color: 'text-amber-400', gradient: 'from-amber-500 to-orange-500' };
  if (rate >= 60) return { label: 'Chuyên gia SP', icon: Trophy, color: 'text-emerald-500', gradient: 'from-emerald-500 to-teal-500' };
  if (rate >= 30) return { label: 'Học viên tích cực', icon: Star, color: 'text-blue-400', gradient: 'from-blue-500 to-cyan-500' };
  return { label: 'Tân binh đào tạo', icon: Award, color: 'text-zinc-400', gradient: 'from-zinc-600 to-zinc-500' };
}

function KpiCard({ label, value, icon: Icon, color, bg, ring }: {
  label: string; value: string | number; icon: React.ElementType; color: string; bg: string; ring: string;
}) {
  return (
    <Card className="p-5 bg-[#0C0C0E] border-zinc-900 rounded-2xl flex items-center gap-4 hover:border-zinc-800 transition-all group">
      <div className={`w-12 h-12 rounded-xl ${bg} ring-1 ${ring} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1 leading-none">{label}</p>
        <p className={`text-2xl font-black ${color} tracking-tighter tabular-nums leading-none`}>{value}</p>
      </div>
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

// ══════════════════════════════════════════════════════════════════════════
// EMPLOYEE DASHBOARD
// ══════════════════════════════════════════════════════════════════════════
interface EmployeeDashboardProps {
  courses: Course[];
  onCourseClick: (course: Course) => void;
  employeeId?: string;
  department?: string;
}

export function EmployeeDashboardView({ courses, onCourseClick, employeeId, department }: EmployeeDashboardProps) {
  const now = new Date();

  // Cảnh báo vắng làm bài hôm qua (8h30-18h, trừ Chủ nhật, miễn trừ nếu hoàn thành tất cả khóa)
  const [overdueInfo, setOverdueInfo] = React.useState<{ overdue: boolean; missedDate?: string }>({ overdue: false });
  React.useEffect(() => {
    if (!employeeId) return;
    getYesterdayOverdueForUser(employeeId, department || '')
      .then(setOverdueInfo)
      .catch((e) => console.error('Overdue check failed:', e));
  }, [employeeId, department]);

  const completedCourses = courses.filter(c => c.progress === 100 || c.isCompleted);
  const ongoingCourses = courses.filter(c => c.progress > 0 && c.progress < 100 && !c.isCompleted);
  const overdueCourses = courses.filter(c => c.endDate && new Date(c.endDate) < now && !c.isCompleted);
  const notStarted = courses.filter(c => c.progress === 0 && !c.isCompleted);

  const completionRate = courses.length > 0 ? Math.round((completedCourses.length / courses.length) * 100) : 0;

  // Quiz scores
  const coursesWithScores = courses.filter(c => c.lastQuizScore != null && c.lastQuizScore > 0);
  const avgQuizScore = coursesWithScores.length > 0
    ? Math.round(coursesWithScores.reduce((sum, c) => sum + (c.lastQuizScore || 0), 0) / coursesWithScores.length * 10) / 10
    : 0;
  const highestScore = coursesWithScores.length > 0
    ? Math.max(...coursesWithScores.map(c => c.lastQuizScore || 0))
    : 0;
  const latestQuizCourse = coursesWithScores.sort((a, b) => (b.lastQuizScore || 0) - (a.lastQuizScore || 0))[0];
  const latestScore = latestQuizCourse?.lastQuizScore || 0;

  // Continue learning — most recent ongoing course
  const continueCourse = ongoingCourses.length > 0 ? ongoingCourses[0] : null;

  const levelInfo = getLevelInfo(completionRate);

  const kpiCards = [
    { label: 'KHÓA ĐƯỢC GIAO', value: courses.length, icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10', ring: 'ring-blue-500/20' },
    { label: 'ĐÃ HOÀN THÀNH', value: completedCourses.length, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
    { label: 'ĐANG HỌC', value: ongoingCourses.length, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20' },
    { label: 'QUÁ HẠN', value: overdueCourses.length, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-500/20' },
    { label: 'TỶ LỆ HOÀN THÀNH', value: `${completionRate}%`, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10', ring: 'ring-purple-500/20' },
    { label: 'ĐIỂM QUIZ GẦN NHẤT', value: latestScore || '—', icon: Target, color: 'text-cyan-400', bg: 'bg-cyan-500/10', ring: 'ring-cyan-500/20' },
    { label: 'ĐIỂM CAO NHẤT', value: highestScore || '—', icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl lg:text-3xl xl:text-4xl font-black tracking-tighter text-white uppercase leading-none">TỔNG QUAN HỌC TẬP</h1>
        <p className="text-zinc-600 font-bold uppercase tracking-[0.3em] text-[10px]">Phát triển năng lực cốt lõi cùng Doscom Academy</p>
      </header>

      {/* Banner: vắng làm bài hôm qua */}
      {overdueInfo.overdue && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-red-500/10 border border-red-500/30 ring-1 ring-red-500/20">
          <div className="w-11 h-11 rounded-xl bg-red-500/20 ring-1 ring-red-500/40 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-red-300 uppercase tracking-widest mb-1">Bạn đã bỏ lỡ bài kiểm tra hôm qua</p>
            <p className="text-xs font-bold text-red-200/80 leading-relaxed">
              Ngày <span className="font-mono text-red-300">{overdueInfo.missedDate}</span> bạn không có điểm quiz nào được ghi nhận. Vui lòng hoàn thành ít nhất 1 bài hôm nay để không bị tính quá hạn.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-7 gap-3 lg:gap-4">
        {kpiCards.map((kpi, i) => <KpiCard key={i} {...kpi} />)}
      </div>

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

          {/* Overdue courses */}
          {overdueCourses.length > 0 && (
            <Card className="p-6 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
              <SectionHeader icon={AlertCircle} title="Khóa học quá hạn" subtitle={`${overdueCourses.length} khóa cần hoàn thành gấp`} color="text-red-400" bg="bg-red-500/10" ring="ring-red-500/30" />
              <div className="space-y-2">
                {overdueCourses.map(course => {
                  const daysOver = Math.floor((now.getTime() - new Date(course.endDate!).getTime()) / 86400000);
                  return (
                    <div key={course.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/[0.03] border border-red-500/10 cursor-pointer hover:border-red-500/20 transition-all" onClick={() => onCourseClick(course)}>
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-zinc-200 truncate">{course.title}</p>
                        <p className="text-[9px] text-zinc-500 font-bold">Tiến độ: {course.progress}%</p>
                      </div>
                      <Badge variant="warning" className="text-[8px] px-2 py-0.5 flex-shrink-0">{daysOver}d quá hạn</Badge>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right sidebar: Quiz results + Achievements */}
        <div className="space-y-6">
          {/* Recent quiz results */}
          <Card className="p-6 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
            <SectionHeader icon={Target} title="Kết quả quiz" subtitle="Điểm số gần đây" color="text-cyan-400" bg="bg-cyan-500/10" ring="ring-cyan-500/30" />
            <div className="space-y-2">
              {coursesWithScores.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                  <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Chưa có kết quả quiz</p>
                </div>
              ) : coursesWithScores.slice(0, 5).map(course => (
                <div key={course.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-900">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-zinc-200 truncate">{course.title}</p>
                    <p className="text-[9px] text-zinc-600 font-bold">{course.brand}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xl font-black tabular-nums ${(course.lastQuizScore || 0) >= 80 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {course.lastQuizScore}
                    </p>
                    <p className="text-[8px] text-zinc-600 font-bold uppercase">điểm</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Achievement card */}
          <Card className="p-0 bg-white border-zinc-200 shadow-[0_20px_60px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden">
            <div className={`bg-gradient-to-r ${levelInfo.gradient} px-6 pt-6 pb-8 relative`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                  <levelInfo.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-white uppercase tracking-tight leading-none">{levelInfo.label}</p>
                  <p className="text-[9px] text-white/70 font-bold uppercase tracking-widest mt-1">Thành tích cá nhân</p>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 -mt-3 space-y-4 relative z-10">
              {/* Completion rate */}
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em]">Hoàn thành</p>
                  <span className="text-sm font-black text-emerald-500 font-mono">{completionRate}%</span>
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000" style={{ width: `${completionRate}%` }} />
                </div>
                <div className="flex justify-between text-[8px] text-zinc-400 font-bold uppercase tracking-widest mt-2">
                  <span>{completedCourses.length} hoàn thành</span>
                  <span>{courses.length} tổng cộng</span>
                </div>
              </div>
              {/* Quiz avg */}
              <div className="p-4 bg-white rounded-xl border border-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em] mb-1">Điểm quiz TB</p>
                    <p className="text-2xl font-black text-zinc-800 font-mono tabular-nums">{avgQuizScore || '—'}</p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
              </div>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-zinc-50 rounded-xl text-center border border-zinc-100">
                  <p className="text-lg font-black text-zinc-800 tabular-nums">{completedCourses.length}</p>
                  <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">Hoàn thành</p>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl text-center border border-zinc-100">
                  <p className="text-lg font-black text-zinc-800 tabular-nums">{avgQuizScore || 0}</p>
                  <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">Điểm TB</p>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl text-center border border-zinc-100">
                  <p className="text-lg font-black text-zinc-800 tabular-nums">{highestScore || 0}</p>
                  <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">Cao nhất</p>
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
