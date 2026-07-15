import * as React from 'react';
import {
  Users, TrendingUp, AlertCircle, Clock, BookOpen,
  CheckCircle2, Trophy, XCircle, Target, Activity, Play, UserX, Zap,
  CalendarCheck,
} from 'lucide-react';
import { Card, Badge, Progress } from '../ui';
import type {
  DashboardKPI, OverdueItem, ActivityItem, TeamMemberProgress,
} from '../../services/dashboardDataService';
import { getEmployeesMonthlyQuizStats, type MonthlyQuizStat } from '../../services/attendanceService';

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

function timeAgo(iso: string): string {
  if (!iso) return '—';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'Vừa xong';
  if (m < 60) return `${m}p trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h trước`;
  return `${Math.floor(h / 24)}d trước`;
}

const ACTION_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  completed: { label: 'Hoàn thành', color: 'text-emerald-500', icon: CheckCircle2 },
  quiz_pass: { label: 'Đạt quiz', color: 'text-blue-400', icon: Trophy },
  quiz_fail: { label: 'Fail quiz', color: 'text-red-400', icon: XCircle },
  started: { label: 'Bắt đầu học', color: 'text-amber-400', icon: Play },
};

// ══════════════════════════════════════════════════════════════════════════
// MANAGER DASHBOARD
// ══════════════════════════════════════════════════════════════════════════
interface ManagerDashboardProps {
  department: string;
  data: {
    kpi: DashboardKPI;
    teamMembers: TeamMemberProgress[];
    overdueItems: OverdueItem[];
    recentActivity: ActivityItem[];
    quizByCourse: { courseName: string; passed: number; failed: number; avg: number }[];
  } | null;
  loading: boolean;
}

export function ManagerDashboardView({ department, data, loading }: ManagerDashboardProps) {
  const currentYM = React.useMemo(() => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 7), []);
  const [curM, curY] = currentYM.split('-');

  const [quizStatsMap, setQuizStatsMap] = React.useState<Map<string, MonthlyQuizStat>>(new Map());
  React.useEffect(() => {
    if (!data?.teamMembers?.length) return;
    getEmployeesMonthlyQuizStats(data.teamMembers.map(m => ({ id: m.employeeId })), currentYM)
      .then(setQuizStatsMap)
      .catch(e => console.error('Manager quiz stats error:', e));
  }, [data, currentYM]);

  if (loading || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Đang tải dữ liệu phòng ban...</p>
        </div>
      </div>
    );
  }

  const { kpi, teamMembers, overdueItems, recentActivity, quizByCourse } = data;

  const kpiCards = [
    { label: 'NHÂN VIÊN PHÒNG BAN', value: kpi.totalEmployees, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', ring: 'ring-blue-500/20' },
    { label: 'TỶ LỆ HOÀN THÀNH', value: `${kpi.completionRate}%`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
    { label: 'CHƯA HỌC', value: kpi.notStartedCount, icon: UserX, color: 'text-zinc-400', bg: 'bg-zinc-500/10', ring: 'ring-zinc-500/20' },
    { label: 'ĐANG HỌC', value: kpi.inProgressCount, icon: Play, color: 'text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20' },
    { label: 'QUÁ HẠN', value: kpi.overdueCount, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-500/20' },
    { label: 'FAIL QUIZ', value: kpi.failedQuizCount, icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', ring: 'ring-rose-500/20' },
    { label: 'ĐIỂM QUIZ TB', value: kpi.avgQuizScore || '—', icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/10', ring: 'ring-purple-500/20' },
  ];

  const needReminder = teamMembers.filter(m => m.needsReminder);
  const failedMembers = teamMembers.filter(m => m.hasFailed);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-blue-500 rounded-full" />
          <h1 className="text-2xl lg:text-3xl xl:text-4xl font-black tracking-tighter text-white uppercase leading-none">
            QUẢN LÝ — {department.toUpperCase()}
          </h1>
        </div>
        <p className="text-zinc-600 font-bold uppercase tracking-[0.3em] text-[10px] ml-5">Tổng quan đào tạo phòng {department}</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-7 gap-3 lg:gap-4">
        {kpiCards.map((kpi, i) => <KpiCard key={i} {...kpi} />)}
      </div>

      {/* Team progress table */}
      <Card className="p-5 lg:p-6 xl:p-8 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
        <SectionHeader icon={Users} title="Tiến độ học tập của team" subtitle={`${teamMembers.length} thành viên`} color="text-blue-400" bg="bg-blue-500/10" ring="ring-blue-500/30" />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-900">
                {['Nhân viên', 'Tỷ lệ', 'Điểm TB', `Kiểm tra T${curM}/${curY}`].map(h => (
                  <th key={h} className="px-4 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamMembers.map(m => {
                const qs = quizStatsMap.get(m.employeeId);
                return (
                  <tr key={m.employeeId} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-xs font-black text-zinc-200">{m.employeeName}</p>
                      <p className="text-[9px] text-zinc-600 font-bold">{m.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${m.completionRate}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-emerald-400 tabular-nums">{m.completionRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-black text-zinc-300 tabular-nums">{m.avgScore || '—'}</td>
                    <td className="px-4 py-3">
                      {qs ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <CalendarCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                            <span className="text-[10px] font-black text-emerald-400 tabular-nums">{qs.done}</span>
                            <span className="text-[9px] text-zinc-600 font-bold">/ {qs.required} ngày</span>
                            {qs.missed > 0 && <span className="text-[9px] text-red-400 font-black ml-1">· {qs.missed} chưa làm</span>}
                          </div>
                          <div className="w-24 bg-zinc-800 rounded-full h-1 flex overflow-hidden">
                            {qs.required > 0 && (
                              <>
                                <div className="h-full bg-emerald-500" style={{ width: `${qs.done / qs.required * 100}%` }} />
                                <div className="h-full bg-red-500/60" style={{ width: `${qs.missed / qs.required * 100}%` }} />
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[9px] text-zinc-700 font-bold">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Row: Need reminder + Overdue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Need reminder */}
        <Card className="p-5 lg:p-6 xl:p-8 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <SectionHeader icon={Zap} title="Cần nhắc học" subtitle={`${needReminder.length} nhân viên chưa bắt đầu`} color="text-amber-400" bg="bg-amber-500/10" ring="ring-amber-500/30" />
          <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
            {needReminder.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/20 mx-auto mb-2" />
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Team đang học tích cực!</p>
              </div>
            ) : needReminder.map(m => (
              <div key={m.employeeId} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/[0.03] border border-amber-500/10">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <UserX className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-zinc-200 truncate">{m.employeeName}</p>
                  <p className="text-[9px] text-zinc-500 font-bold">{m.completedCourses}/{m.totalCourses} khóa</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Overdue */}
        <Card className="p-5 lg:p-6 xl:p-8 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <SectionHeader icon={AlertCircle} title="Quá hạn đào tạo" subtitle={`${overdueItems.length} khóa quá hạn`} color="text-red-400" bg="bg-red-500/10" ring="ring-red-500/30" />
          <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
            {overdueItems.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/20 mx-auto mb-2" />
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Không có ai quá hạn!</p>
              </div>
            ) : overdueItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/[0.03] border border-red-500/10">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-zinc-200 truncate">{item.employeeName}</p>
                  <p className="text-[9px] text-zinc-500 font-bold truncate">{item.courseName}</p>
                </div>
                <Badge variant="warning" className="text-[8px] px-2 py-0.5 flex-shrink-0">{item.daysOverdue}d</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row: Fail quiz members + Quiz by course */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 lg:p-6 xl:p-8 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <SectionHeader icon={XCircle} title="Nhân viên fail quiz" subtitle={`${failedMembers.length} nhân viên`} color="text-rose-400" bg="bg-rose-500/10" ring="ring-rose-500/30" />
          <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
            {failedMembers.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="w-8 h-8 text-emerald-500/20 mx-auto mb-2" />
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Team quiz tốt!</p>
              </div>
            ) : failedMembers.map(m => (
              <div key={m.employeeId} className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/[0.03] border border-rose-500/10">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-4 h-4 text-rose-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-zinc-200 truncate">{m.employeeName}</p>
                </div>
                <span className="text-xs font-black text-zinc-400 tabular-nums">{m.avgScore} điểm</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:p-6 xl:p-8 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <SectionHeader icon={BookOpen} title="Kết quả quiz theo khóa" subtitle="Tỷ lệ đạt/fail của team" color="text-purple-400" bg="bg-purple-500/10" ring="ring-purple-500/30" />
          <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-hide">
            {quizByCourse.length === 0 ? (
              <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest text-center py-8">Chưa có kết quả quiz</p>
            ) : quizByCourse.map((q, i) => (
              <div key={i} className="p-3 rounded-xl bg-zinc-950 border border-zinc-900">
                <p className="text-xs font-black text-zinc-200 truncate mb-2">{q.courseName}</p>
                <div className="flex items-center gap-4 text-[9px] font-bold">
                  <span className="text-emerald-400">✓ {q.passed} đạt</span>
                  <span className="text-red-400">✗ {q.failed} fail</span>
                  <span className="text-zinc-400 ml-auto">TB: {q.avg} điểm</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="p-5 lg:p-6 xl:p-8 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
        <SectionHeader icon={Activity} title="Hoạt động gần đây của team" subtitle="Cập nhật mới nhất" color="text-purple-400" bg="bg-purple-500/10" ring="ring-purple-500/30" />
        <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
          {recentActivity.length === 0 ? (
            <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest text-center py-8">Chưa có hoạt động</p>
          ) : recentActivity.map((act, i) => {
            const meta = ACTION_META[act.action] || ACTION_META.started;
            const ActIcon = meta.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition-all">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${act.action === 'quiz_fail' ? 'bg-red-500/10' : act.action === 'completed' ? 'bg-emerald-500/10' : 'bg-zinc-900'}`}>
                  <ActIcon className={`w-4 h-4 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-200 truncate">
                    <span className="font-black">{act.employeeName}</span>
                  </p>
                  <p className="text-[9px] text-zinc-500 font-bold truncate">
                    <span className={meta.color}>{meta.label}</span> — {act.courseName}
                    {act.score != null && <span className="text-zinc-400"> ({act.score} điểm)</span>}
                  </p>
                </div>
                <span className="text-[9px] text-zinc-700 font-bold flex-shrink-0">{timeAgo(act.timestamp)}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
