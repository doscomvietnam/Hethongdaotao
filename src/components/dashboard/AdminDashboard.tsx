import * as React from 'react';
import {
  Users, BookOpen, TrendingUp, AlertCircle, Clock, Download,
  BarChart3, CheckCircle2, Trophy, ArrowUpRight,
  Target, Activity, XCircle, UserX, Play,
  RefreshCw, Settings, X, ExternalLink, Flame, CalendarCheck, CalendarDays,
} from 'lucide-react';
import { Card, Badge } from '../ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type {
  DashboardKPI, DeptStat, LearningStatus, CourseRanking, OverdueItem, ActivityItem,
  LeaderboardData, EmployeeQuizActivity, MonthStat,
} from '../../services/dashboardDataService';
import { getLeaderboardData, getLeaderboardDateRange, getOnboardingLeaderboard, getQuizActivity3Months, getMissedEmployeesForMonth, getMonthlyQuizRateSummary, getMonthlyQuizRateByDept } from '../../services/dashboardDataService';
import type { OnboardingLeaderboardEntry, MissedEmployee, MonthlyQuizRateSummary } from '../../services/dashboardDataService';
import {
  syncLeaderboardToLark,
  setLarkLeaderboardWebhookUrl,
  getLarkLeaderboardWebhookUrl,
  getLastLbSyncTimestamp,
} from '../../services/larkSyncService';
import {
  getOverdueEmployeesForDate,
  getOverdueEmployeesByDay,
  getYesterdayDateStrVN,
  exportOverdueEmployeesExcel,
  exportOverdueByDayExcel,
  DEFAULT_EXPORT_START_DATE,
  type OverdueEmployeeRow,
} from '../../services/dailyAttendanceService';

// ── Shared sub-components ───────────────────────────────────────────────
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

const STATUS_COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444'];
const STATUS_LABELS = ['Chưa học', 'Đang học', 'Hoàn thành', 'Quá hạn'];

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
  quiz_pass: { label: 'Đạt kiểm tra', color: 'text-blue-400', icon: Trophy },
  quiz_fail: { label: 'Không đạt kiểm tra', color: 'text-red-400', icon: XCircle },
  started: { label: 'Bắt đầu học', color: 'text-amber-400', icon: Play },
};

// ══════════════════════════════════════════════════════════════════════════
// QUIZ ACTIVITY — 3 THÁNG
// ══════════════════════════════════════════════════════════════════════════
// Tỷ lệ hoàn thành tháng = số ngày đạt / tổng ngày làm việc
function cellColor(passed: number, workdays: number): string {
  if (workdays === 0) return 'text-zinc-600';
  const rate = passed / workdays;
  if (rate >= 0.9) return 'text-emerald-400';
  if (rate >= 0.8) return 'text-sky-400';
  if (rate >= 0.6) return 'text-amber-400';
  return 'text-red-400';
}

function cellBg(passed: number, workdays: number): string {
  if (workdays === 0) return 'bg-zinc-900/40';
  const rate = passed / workdays;
  if (rate >= 0.9) return 'bg-emerald-500/10';
  if (rate >= 0.8) return 'bg-sky-500/10';
  if (rate >= 0.6) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

function QuizActivity3Months() {
  const [activities, setActivities] = React.useState<EmployeeQuizActivity[]>([]);
  const [monthLabels, setMonthLabels] = React.useState<{ key: string; label: string; workdays: number }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deptFilter, setDeptFilter] = React.useState<string>('');
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    getQuizActivity3Months()
      .then(({ activities, monthLabels }) => {
        setActivities(activities);
        setMonthLabels(monthLabels);
      })
      .catch(e => console.error('QuizActivity3M error:', e))
      .finally(() => setLoading(false));
  }, []);

  const departments = React.useMemo(() => {
    const depts = [...new Set(activities.map(a => a.department))].sort((a, b) => a.localeCompare(b, 'vi'));
    return depts;
  }, [activities]);

  const filtered = React.useMemo(() => {
    return activities.filter(a => {
      if (deptFilter && a.department !== deptFilter) return false;
      if (search && !a.employeeName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [activities, deptFilter, search]);

  const totalWorkdays = monthLabels.reduce((a, m) => a + m.workdays, 0);

  const workdayMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    monthLabels.forEach(m => { map[m.key] = m.workdays; });
    return map;
  }, [monthLabels]);

  return (
    <Card className="p-5 lg:p-6 xl:p-8 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
      <SectionHeader
        icon={CalendarDays}
        title="Hoạt động Kiểm Tra 3 tháng"
        subtitle="Tỷ lệ hoàn thành = số ngày có làm / tổng ngày làm việc trong tháng"
        color="text-sky-400"
        bg="bg-sky-500/10"
        ring="ring-sky-500/30"
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Tìm tên..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-sky-500/50 w-40"
        />
        <button
          onClick={() => setDeptFilter('')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${deptFilter === '' ? 'bg-sky-500 text-white' : 'text-zinc-500 hover:text-zinc-300 bg-zinc-900'}`}
        >
          Tất cả
        </button>
        {departments.map(dept => (
          <button
            key={dept}
            onClick={() => setDeptFilter(dept === deptFilter ? '' : dept)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${deptFilter === dept ? 'bg-sky-500 text-white' : 'text-zinc-500 hover:text-zinc-300 bg-zinc-900'}`}
          >
            {dept}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 text-zinc-700 animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-2 px-3 text-[9px] text-zinc-500 font-black uppercase tracking-widest w-48">Nhân viên</th>
                <th className="text-left py-2 px-3 text-[9px] text-zinc-500 font-black uppercase tracking-widest w-28">Phòng ban</th>
                {monthLabels.map(m => (
                  <th key={m.key} className="text-center py-2 px-3 text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                    <div>{m.label}</div>
                    <div className="text-zinc-700 font-bold normal-case tracking-normal">{m.workdays} ngày làm việc</div>
                    <div className="flex gap-1 justify-center mt-0.5">
                      <span className="text-[8px] text-zinc-600 font-bold bg-zinc-900 rounded px-1">HT%</span>
                      <span className="text-[8px] text-zinc-600 font-bold bg-zinc-900 rounded px-1">Điểm</span>
                    </div>
                  </th>
                ))}
                <th className="text-center py-2 px-3 text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                  <div>Tổng 3 tháng</div>
                  <div className="text-zinc-700 font-bold normal-case tracking-normal">{totalWorkdays} ngày</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : filtered.map(emp => (
                <tr key={emp.employeeId} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="py-2 px-3 font-bold text-zinc-200 truncate max-w-[12rem]">{emp.employeeName}</td>
                  <td className="py-2 px-3 text-zinc-500 text-[10px] font-bold truncate">{emp.department}</td>
                  {emp.months.map((m: MonthStat) => {
                    const wd = workdayMap[m.month] ?? 0;
                    return (
                      <td key={m.month} className="py-2 px-3 text-center align-top">
                        {wd === 0 ? (
                          <span className="text-zinc-700 font-bold">—</span>
                        ) : (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="text-[9px] text-zinc-400 font-bold">{m.done}/{wd} ngày làm</span>
                            {/* Điểm TB tháng */}
                            {m.monthAvgScore != null ? (
                              <div className={`flex flex-col items-center rounded-lg px-2 py-1 ${m.monthScorePassed ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                                <span className={`font-black text-xs ${m.monthScorePassed ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {m.monthAvgScore}%
                                </span>
                                <span className="text-[9px] font-bold text-zinc-500">
                                  {m.monthScorePassed ? '✓ Đạt' : '✗ Chưa đạt'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center rounded-lg px-2 py-1 bg-zinc-900/40">
                                <span className="text-zinc-600 text-[9px] font-bold">—</span>
                                <span className="text-zinc-700 text-[9px] font-bold">Chưa có điểm</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-center align-top">
                    <div className="inline-flex flex-col items-center gap-1">
                      <span className="text-[9px] text-zinc-400 font-bold">{emp.totalDone}/{totalWorkdays} ngày làm</span>
                      {(emp.totalCourseCount + emp.totalDone) > 0 && (() => {
                        const allMonthScores = emp.months.flatMap(m =>
                          m.monthAvgScore != null ? [m.monthAvgScore] : []
                        );
                        const overallAvg = allMonthScores.length
                          ? Math.round(allMonthScores.reduce((a, b) => a + b, 0) / allMonthScores.length)
                          : null;
                        return overallAvg != null ? (
                          <div className={`flex flex-col items-center rounded-lg px-2 py-1 ${overallAvg >= 80 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                            <span className={`font-black text-xs ${overallAvg >= 80 ? 'text-emerald-400' : 'text-red-400'}`}>{overallAvg}%</span>
                            <span className="text-[9px] font-bold text-zinc-500">{overallAvg >= 80 ? '✓ Đạt' : '✗ Chưa đạt'}</span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-zinc-900">
        <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Hoàn thành (HT%):</span>
        <span className="text-[9px] text-emerald-400 font-bold">≥90% Tốt</span>
        <span className="text-[9px] text-sky-400 font-bold">80–89% Đạt</span>
        <span className="text-[9px] text-amber-400 font-bold">60–79% Chưa HT</span>
        <span className="text-[9px] text-red-400 font-bold">&lt;60% Nghiêm trọng</span>
        <span className="text-[9px] text-zinc-700 font-bold">|</span>
        <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Điểm tháng:</span>
        <span className="text-[9px] text-emerald-400 font-bold">✓ ≥80% Đạt</span>
        <span className="text-[9px] text-red-400 font-bold">✗ &lt;80% Chưa đạt</span>
        <span className="text-[9px] text-zinc-500 ml-auto font-bold">HT% = ngày có làm / ngày làm việc · Điểm = TB kiểm tra hằng ngày + khóa học</span>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════
interface AdminDashboardProps {
  data: {
    kpi: DashboardKPI;
    deptStats: DeptStat[];
    learningStatus: LearningStatus;
    topCompleted: CourseRanking[];
    topFailed: CourseRanking[];
    overdueItems: OverdueItem[];
    recentActivity: ActivityItem[];
  } | null;
  loading: boolean;
  onExport: () => void;
  exporting: boolean;
  onLarkSync: (onProgress: (stage: string, pct: number) => void) => Promise<{
    success: boolean; message: string; recordsCreated: number; recordsUpdated: number; totalRecords: number;
  }>;
}

export function AdminDashboardView({ data, loading, onExport, exporting, onLarkSync }: AdminDashboardProps) {
  // Lark sync state
  const [syncing, setSyncing] = React.useState(false);
  const [syncStage, setSyncStage] = React.useState('');
  const [syncProgress, setSyncProgress] = React.useState(0);
  const [syncResult, setSyncResult] = React.useState<{
    success: boolean; message: string; recordsCreated: number; recordsUpdated: number; totalRecords: number;
  } | null>(null);
  const [showLarkConfig, setShowLarkConfig] = React.useState(false);
  const [webhookUrl, setWebhookUrl] = React.useState('');
  const [lastSyncAt, setLastSyncAt] = React.useState<string | null>(null);
  const [showToast, setShowToast] = React.useState(false);

  // Leaderboard data — lọc theo tháng (null = từ ngày ra mắt đến nay)
  const currentMonthStr = React.useMemo(() => {
    const vnNow = new Date(Date.now() + 7 * 3600 * 1000);
    return vnNow.toISOString().slice(0, 7); // 'YYYY-MM'
  }, []);
  const [leaderboardMonth, setLeaderboardMonth] = React.useState<string>('');
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardData | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = React.useState(true);

  // Leaderboard Lark sync state
  const [lbSyncing, setLbSyncing] = React.useState(false);
  const [lbSyncStage, setLbSyncStage] = React.useState('');
  const [lbSyncProgress, setLbSyncProgress] = React.useState(0);
  const [lbSyncResult, setLbSyncResult] = React.useState<{ success: boolean; message: string; recordsCreated: number; totalRecords: number } | null>(null);
  const [showLbToast, setShowLbToast] = React.useState(false);
  const [showLbConfig, setShowLbConfig] = React.useState(false);
  const [lbWebhookUrl, setLbWebhookUrl] = React.useState('');
  const [lbLastSyncAt, setLbLastSyncAt] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      setLbWebhookUrl(getLarkLeaderboardWebhookUrl());
      setLbLastSyncAt(getLastLbSyncTimestamp());
    } catch { }
  }, []);

  React.useEffect(() => {
    setLeaderboardLoading(true);
    const { startDate, endDate } = getLeaderboardDateRange(leaderboardMonth || null);
    getLeaderboardData(startDate, endDate)
      .then(setLeaderboard)
      .catch(e => console.error('Leaderboard fetch error:', e))
      .finally(() => setLeaderboardLoading(false));
  }, [leaderboardMonth]);

  // Onboarding leaderboard
  const [onboardingLb, setOnboardingLb] = React.useState<OnboardingLeaderboardEntry[]>([]);
  const [onboardingLbLoading, setOnboardingLbLoading] = React.useState(true);
  React.useEffect(() => {
    getOnboardingLeaderboard()
      .then(setOnboardingLb)
      .catch(e => console.error('Onboarding leaderboard error:', e))
      .finally(() => setOnboardingLbLoading(false));
  }, []);

  // Tỷ lệ hoàn thành quiz tháng hiện tại
  const [quizRateSummary, setQuizRateSummary] = React.useState<MonthlyQuizRateSummary | null>(null);
  const [deptQuizStats, setDeptQuizStats] = React.useState<DeptStat[]>([]);
  React.useEffect(() => {
    getMonthlyQuizRateSummary(currentMonthStr)
      .then(setQuizRateSummary)
      .catch(e => console.error('Quiz rate error:', e));
    getMonthlyQuizRateByDept(currentMonthStr)
      .then(setDeptQuizStats)
      .catch(e => console.error('Dept quiz rate error:', e));
  }, [currentMonthStr]);

  // Nhân viên chưa làm bài trong tháng được chọn
  const [missedEmployees, setMissedEmployees] = React.useState<MissedEmployee[]>([]);
  const [missedEmpLoading, setMissedEmpLoading] = React.useState(true);
  React.useEffect(() => {
    setMissedEmpLoading(true);
    const month = leaderboardMonth || currentMonthStr;
    getMissedEmployeesForMonth(month)
      .then(setMissedEmployees)
      .catch(e => console.error('Missed employees error:', e))
      .finally(() => setMissedEmpLoading(false));
  }, [leaderboardMonth, currentMonthStr]);

  // Vắng làm bài (8h30-18h, trừ Chủ nhật, bỏ qua user đã hoàn thành tất cả khóa).
  // Admin có thể chọn ngày tùy ý để xem lịch sử. Mặc định = hôm qua.
  const [missedDate, setMissedDate] = React.useState<string>(getYesterdayDateStrVN());
  const [missedYesterday, setMissedYesterday] = React.useState<OverdueEmployeeRow[]>([]);
  const [missedLoading, setMissedLoading] = React.useState(true);
  const [exportingAll, setExportingAll] = React.useState(false);
  const isMissedSunday = React.useMemo(
    () => new Date(`${missedDate}T00:00:00.000Z`).getUTCDay() === 0,
    [missedDate],
  );
  const todayDateStr = React.useMemo(() => {
    const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return nowVN.toISOString().slice(0, 10);
  }, []);
  React.useEffect(() => {
    setMissedLoading(true);
    getOverdueEmployeesForDate(missedDate)
      .then(setMissedYesterday)
      .catch((e) => console.error('Missed date fetch error:', e))
      .finally(() => setMissedLoading(false));
  }, [missedDate]);

  // Check if Lark is configured (env or localStorage)
  const envWebhookUrl = import.meta.env.VITE_LARK_WEBHOOK_URL || '';
  const isLarkReady = Boolean(webhookUrl || envWebhookUrl);

  React.useEffect(() => {
    try {
      setWebhookUrl(localStorage.getItem('lark_webhook_url') || envWebhookUrl);
      setLastSyncAt(localStorage.getItem('lark_last_sync_at'));
    } catch { }
  }, []);

  const handleLarkSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setShowToast(false);
    try {
      const result = await onLarkSync((stage, pct) => {
        setSyncStage(stage);
        setSyncProgress(pct);
      });
      setSyncResult(result);
      setShowToast(true);
      setLastSyncAt(localStorage.getItem('lark_last_sync_at'));
    } catch (e: any) {
      setSyncResult({ success: false, message: e.message || 'Lỗi đồng bộ', recordsCreated: 0, recordsUpdated: 0, totalRecords: 0 });
      setShowToast(true);
    } finally {
      setSyncing(false);
      setTimeout(() => setShowToast(false), 6000);
    }
  };

  const handleSaveLarkConfig = () => {
    try {
      localStorage.setItem('lark_webhook_url', webhookUrl);
    } catch {}
    // Update the service
    import('../../services/larkSyncService').then(m => m.setLarkWebhookUrl(webhookUrl));
    setShowLarkConfig(false);
  };

  const handleSaveLbConfig = () => {
    setLarkLeaderboardWebhookUrl(lbWebhookUrl);
    setShowLbConfig(false);
  };

  const handleLbLarkSync = async () => {
    if (!lbWebhookUrl) { setShowLbConfig(true); return; }
    if (!leaderboard) return;
    setLbSyncing(true);
    setLbSyncResult(null);
    setShowLbToast(false);
    const { label } = getLeaderboardDateRange(leaderboardMonth || null);
    try {
      const result = await syncLeaderboardToLark(leaderboard, label, (stage, pct) => {
        setLbSyncStage(stage);
        setLbSyncProgress(pct);
      });
      setLbSyncResult({ success: result.success, message: result.message, recordsCreated: result.recordsCreated, totalRecords: result.totalRecords });
      setLbLastSyncAt(getLastLbSyncTimestamp());
      setShowLbToast(true);
    } catch (e: any) {
      setLbSyncResult({ success: false, message: e.message || 'Lỗi đồng bộ', recordsCreated: 0, totalRecords: 0 });
      setShowLbToast(true);
    } finally {
      setLbSyncing(false);
      setTimeout(() => setShowLbToast(false), 6000);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Đang tải dữ liệu dashboard...</p>
        </div>
      </div>
    );
  }

  const { kpi, deptStats, learningStatus, topCompleted, topFailed, overdueItems, recentActivity } = data;

  const kpiCards = [
    { label: 'TỔNG NHÂN VIÊN', value: kpi.totalEmployees, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', ring: 'ring-blue-500/20' },
    { label: 'KHÓA HỌC ACTIVE', value: kpi.totalCourses, icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
    { label: 'QUIZ THÁNG NÀY', value: quizRateSummary ? `${quizRateSummary.rate}%` : '—', icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20' },
    { label: 'ĐIỂM KIỂM TRA TB', value: kpi.avgQuizScore || '—', icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/10', ring: 'ring-purple-500/20' },
    { label: 'LƯỢT KHÔNG ĐẠT', value: kpi.failedQuizCount, icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', ring: 'ring-rose-500/20' },
  ];

  const statusData = [
    { name: 'Chưa học', value: learningStatus.notStarted },
    { name: 'Đang học', value: learningStatus.inProgress },
    { name: 'Hoàn thành', value: learningStatus.completed },
    { name: 'Quá hạn', value: learningStatus.overdue },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Lark Config Modal */}
      {showLarkConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0C0C0E] border border-zinc-800 rounded-2xl w-[520px] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowLarkConfig(false)} className="absolute top-4 right-4 p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 ring-1 ring-blue-500/30 flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-black text-white text-lg uppercase tracking-tight">Cấu hình Lark Anycross</h3>
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Đồng bộ qua Webhook Trigger</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block mb-2">Webhook URL</label>
                <input
                  type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://anycross.larksuite.com/..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-blue-500/40 font-mono"
                />
              </div>
              {/* Hướng dẫn thiết lập */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Hướng dẫn thiết lập Anycross</p>
                <div className="space-y-2">
                  {[
                    'Mở Lark → Anycross → Tạo Flow mới',
                    'Chọn Trigger: "Webhook" (Asynchronous)',
                    'Thêm Action: "Lark Base" → Create Record',
                    'Map các trường dữ liệu từ webhook payload',
                    'Publish Flow → Copy Webhook URL',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-400 text-[9px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-[10px] text-zinc-400 font-bold leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Cấu trúc data */}
              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                <p className="text-[9px] text-amber-400 font-black uppercase tracking-widest mb-2">Cấu trúc dữ liệu gửi qua Webhook</p>
                <p className="text-[9px] text-zinc-500 font-mono leading-relaxed">{'{ action, batch_index, total_batches, records: [{ Họ tên, Email, Phòng ban, Khóa học, ... }] }'}</p>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <p className="text-[9px] text-zinc-400 font-bold">Truy cập <a href="https://anycross.larksuite.com" target="_blank" rel="noopener" className="text-blue-400 underline">anycross.larksuite.com</a> để tạo Flow</p>
              </div>
              <button
                onClick={handleSaveLarkConfig}
                disabled={!webhookUrl}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                Lưu Webhook URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync progress bar */}
      {syncing && (
        <div className="fixed top-0 left-0 right-0 z-[60]">
          <div className="h-1 bg-zinc-900">
            <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 transition-all duration-500 ease-out" style={{ width: `${syncProgress}%` }} />
          </div>
          <div className="bg-[#0C0C0E]/95 backdrop-blur-md border-b border-zinc-800/50 px-6 py-2.5 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
            <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">{syncStage}</span>
            <span className="text-[10px] text-zinc-600 font-bold ml-auto tabular-nums">{syncProgress}%</span>
          </div>
        </div>
      )}

      {/* Sync result toast — redesigned */}
      {showToast && syncResult && (
        <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-400">
          <div className={`w-[340px] rounded-2xl border shadow-2xl overflow-hidden ${
            syncResult.success
              ? 'bg-[#0C0C0E] border-emerald-500/20'
              : 'bg-[#0C0C0E] border-red-500/20'
          }`}>
            {/* Header */}
            <div className={`px-5 py-3.5 flex items-center gap-3 ${
              syncResult.success ? 'bg-emerald-500/5' : 'bg-red-500/5'
            }`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                syncResult.success ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}>
                {syncResult.success
                  ? <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  : <XCircle className="w-4 h-4 text-red-400" />
                }
              </div>
              <div className="flex-1">
                <p className={`text-xs font-black uppercase tracking-wide ${
                  syncResult.success ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {syncResult.message === 'sync_success'
                    ? 'Đồng bộ thành công'
                    : syncResult.message === 'no_data'
                      ? 'Không có dữ liệu'
                      : syncResult.message === 'no_changes'
                        ? 'Dữ liệu đã cập nhật'
                        : syncResult.message === 'partial_sync'
                          ? 'Đồng bộ chưa hoàn tất'
                          : syncResult.message === 'sync_failed'
                            ? 'Đồng bộ thất bại'
                            : 'Lỗi đồng bộ'
                  }
                </p>
                <p className="text-[9px] text-zinc-600 font-bold mt-0.5">
                  {syncResult.message === 'no_data'
                    ? 'Không có dữ liệu để đồng bộ'
                    : syncResult.message === 'no_changes'
                      ? `${syncResult.totalRecords} bản ghi đã đồng bộ trước đó, không có thay đổi`
                      : syncResult.success
                        ? `Xóa ${syncResult.recordsUpdated} cũ → Tạo mới ${syncResult.recordsCreated} bản ghi`
                        : syncResult.message
                  }
                </p>
              </div>
              <button onClick={() => setShowToast(false)} className="p-1 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Stats */}
            <div className="px-5 py-3 grid grid-cols-3 gap-3 border-t border-zinc-800/50">
              <div className="text-center">
                <p className="text-lg font-black text-emerald-400 tabular-nums leading-none">{syncResult.recordsCreated}</p>
                <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Tạo mới</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-orange-400 tabular-nums leading-none">{syncResult.recordsUpdated}</p>
                <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Đã xóa</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-zinc-400 tabular-nums leading-none">{syncResult.totalRecords}</p>
                <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Tổng</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Webhook Config Modal */}
      {showLbConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0C0C0E] border border-zinc-800 rounded-2xl w-[480px] p-8 shadow-2xl relative">
            <button onClick={() => setShowLbConfig(false)} className="absolute top-4 right-4 p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-black text-white text-lg uppercase tracking-tight">Cấu hình Lark — Bảng Xếp Hạng</h3>
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Webhook riêng cho Top 10 nhân viên</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block mb-2">Leaderboard Webhook URL</label>
                <input
                  type="url" value={lbWebhookUrl} onChange={e => setLbWebhookUrl(e.target.value)}
                  placeholder="https://anycross.larksuite.com/..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/40 font-mono"
                />
              </div>
              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                <p className="text-[9px] text-amber-400 font-black uppercase tracking-widest mb-1">Cấu trúc dữ liệu gửi</p>
                <p className="text-[9px] text-zinc-500 font-mono leading-relaxed">{'{ leaderboard_key, Hạng, Loại, Kỳ, Họ và tên, Phòng ban, Điểm TB (%), Số bài, Số ngày học, Ngày làm bài cuối }'}</p>
              </div>
              <button
                onClick={handleSaveLbConfig}
                disabled={!lbWebhookUrl}
                className="w-full py-3 bg-amber-500 text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-all disabled:opacity-50"
              >
                Lưu Webhook URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard sync progress bar */}
      {lbSyncing && (
        <div className="fixed top-0 left-0 right-0 z-[60]">
          <div className="h-1 bg-zinc-900">
            <div className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 transition-all duration-500 ease-out" style={{ width: `${lbSyncProgress}%` }} />
          </div>
          <div className="bg-[#0C0C0E]/95 backdrop-blur-md border-b border-zinc-800/50 px-6 py-2.5 flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
            <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">{lbSyncStage}</span>
            <span className="text-[10px] text-zinc-600 font-bold ml-auto tabular-nums">{lbSyncProgress}%</span>
          </div>
        </div>
      )}

      {/* Leaderboard sync result toast */}
      {showLbToast && lbSyncResult && (
        <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-400">
          <div className={`w-[320px] rounded-2xl border shadow-2xl overflow-hidden ${lbSyncResult.success ? 'bg-[#0C0C0E] border-amber-500/20' : 'bg-[#0C0C0E] border-red-500/20'}`}>
            <div className={`px-5 py-3.5 flex items-center gap-3 ${lbSyncResult.success ? 'bg-amber-500/5' : 'bg-red-500/5'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${lbSyncResult.success ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                {lbSyncResult.success ? <Trophy className="w-4 h-4 text-amber-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
              </div>
              <div className="flex-1">
                <p className={`text-xs font-black uppercase tracking-wide ${lbSyncResult.success ? 'text-amber-400' : 'text-red-400'}`}>
                  {lbSyncResult.message === 'sync_success' ? 'Leaderboard đã đồng bộ' : lbSyncResult.message === 'no_data' ? 'Không có dữ liệu' : 'Đồng bộ chưa hoàn tất'}
                </p>
                <p className="text-[9px] text-zinc-600 font-bold mt-0.5">
                  {lbSyncResult.success ? `${lbSyncResult.recordsCreated}/${lbSyncResult.totalRecords} records → Lark` : lbSyncResult.message}
                </p>
              </div>
              <button onClick={() => setShowLbToast(false)} className="p-1 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Bảng quản trị đào tạo</h1>
          <p className="text-zinc-500 text-sm">Tổng quan hiệu suất toàn hệ thống Doscom Enterprise</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Lark sync button — training progress */}
          <button onClick={handleLarkSync} disabled={syncing}
            className="flex items-center gap-2 px-3 sm:px-5 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all disabled:opacity-50"
            title={lastSyncAt ? `Lần sync cuối: ${new Date(lastSyncAt).toLocaleString('vi-VN')}` : 'Đồng bộ tiến độ đào tạo lên Lark Base'}>
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{syncing ? 'ĐANG ĐỒNG BỘ...' : 'ĐỒNG BỘ LARK'}</span>
          </button>
          {/* Leaderboard Lark sync button */}
          <button
            onClick={handleLbLarkSync}
            disabled={lbSyncing || !leaderboard}
            className="flex items-center gap-2 px-3 sm:px-5 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all disabled:opacity-50"
            title={lbLastSyncAt ? `Sync BXH cuối: ${new Date(lbLastSyncAt).toLocaleString('vi-VN')}` : 'Đồng bộ Top 10 bảng xếp hạng lên Lark'}
          >
            <Trophy className={`w-4 h-4 ${lbSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{lbSyncing ? 'ĐANG SYNC...' : 'SYNC BXH'}</span>
          </button>
          {/* Leaderboard webhook config */}
          <button
            onClick={() => setShowLbConfig(true)}
            className="p-3 rounded-xl text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/30 transition-all"
            title="Cấu hình Leaderboard Webhook URL"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={onExport} disabled={exporting}
            className="flex items-center gap-2 px-3 sm:px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all disabled:opacity-50">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{exporting ? 'ĐANG XUẤT...' : 'XUẤT EXCEL'}</span>
          </button>
        </div>
      </header>

      {/* KPI Cards — 3 cards / row trên laptop, 6 / row trên màn ≥ 1536px */}
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3 lg:gap-4">
        {kpiCards.map((kpi, i) => <KpiCard key={i} {...kpi} />)}
      </div>

      {/* Row: Department chart + Learning status donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department completion bar chart */}
        <Card className="col-span-2 p-5 lg:p-6 xl:p-8 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <SectionHeader icon={BarChart3} title="Hoàn thành theo phòng ban" subtitle={`Tỷ lệ % quiz hoàn thành · T${currentMonthStr.slice(5, 7)}/${currentMonthStr.slice(0, 4)}`} />
          <div className="h-[280px]">
            {deptQuizStats.length === 0 ? (
              <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest text-center py-12">Chưa có dữ liệu</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptQuizStats} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181B" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525B', fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#52525B', fontWeight: 700 }} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ backgroundColor: '#09090B', borderRadius: '12px', border: '1px solid #27272A', fontSize: 11 }} formatter={(v: any) => [`${v}%`, '']} />
                  <Bar dataKey="completion" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Learning status donut */}
        <Card className="p-5 lg:p-6 xl:p-8 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <SectionHeader icon={Activity} title="Trạng thái học tập" subtitle="Phân bổ toàn hệ thống" color="text-blue-400" bg="bg-blue-500/10" ring="ring-blue-500/30" />
          <div className="relative h-[200px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" innerRadius={55} outerRadius={80} startAngle={90} endAngle={-270} stroke="none">
                  {statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#09090B', borderRadius: '12px', border: '1px solid #27272A', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {statusData.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[i] }} />
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{STATUS_LABELS[i]}</span>
                <span className="text-[10px] text-zinc-300 font-black ml-auto tabular-nums">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row: Top completed + Top failed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 lg:p-6 xl:p-8 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <SectionHeader icon={Trophy} title="Top hoàn thành cao" subtitle="Khóa học có tỷ lệ hoàn thành tốt nhất" color="text-amber-400" bg="bg-amber-500/10" ring="ring-amber-500/30" />
          <div className="space-y-3">
            {topCompleted.length === 0 ? (
              <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest text-center py-8">Chưa có dữ liệu</p>
            ) : topCompleted.map((c, i) => (
              <div key={c.courseId} className="flex items-center gap-4 p-3 rounded-xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition-all">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-900 text-zinc-500'}`}>
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-zinc-200 truncate">{c.courseName}</p>
                  <p className="text-[9px] text-zinc-600 font-bold">{c.brand}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-emerald-400 tabular-nums">{c.rate}%</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 lg:p-6 xl:p-8 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <SectionHeader icon={XCircle} title="Top không đạt cao" subtitle="Khóa học có tỷ lệ không đạt nhiều nhất" color="text-red-400" bg="bg-red-500/10" ring="ring-red-500/30" />
          <div className="space-y-3">
            {topFailed.length === 0 ? (
              <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest text-center py-8">Không có khóa nào bị fail</p>
            ) : topFailed.map((c, i) => (
              <div key={c.courseId} className="flex items-center gap-4 p-3 rounded-xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition-all">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black bg-red-500/10 text-red-400">
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-zinc-200 truncate">{c.courseName}</p>
                  <p className="text-[9px] text-zinc-600 font-bold">{c.brand}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-red-400 tabular-nums">{c.total} <span className="text-[9px] text-zinc-600">lượt fail</span></p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Leaderboards: Top điểm cao / Làm bài đều / Không học */}
      <div className="space-y-4">
        {/* Month picker header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-white text-lg uppercase tracking-tight leading-none">BẢNG XẾP HẠNG</h3>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1">
              {leaderboardMonth
                ? `Tháng ${leaderboardMonth.split('-')[1]}/${leaderboardMonth.split('-')[0]}`
                : 'Từ ngày ra mắt đến nay'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLeaderboardMonth('')}
              className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border transition-colors ${leaderboardMonth === '' ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' : 'text-zinc-500 border-zinc-800 hover:text-amber-400 hover:border-amber-500/30'}`}
            >
              Tất cả
            </button>
            <input
              type="month"
              value={leaderboardMonth}
              min="2026-05"
              max={currentMonthStr}
              onChange={e => setLeaderboardMonth(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-200 focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
            />
            <button
              onClick={() => setLeaderboardMonth(currentMonthStr)}
              className="text-[10px] font-black text-zinc-500 hover:text-amber-400 uppercase tracking-widest px-2 py-2 transition-colors"
              title="Tháng hiện tại"
            >
              ↺ Tháng này
            </button>
          </div>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Top 10 điểm cao */}
        <Card className="p-5 lg:p-6 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <SectionHeader icon={Trophy} title="Top 10 Điểm Cao" subtitle="Điểm trung bình cao nhất" color="text-amber-400" bg="bg-amber-500/10" ring="ring-amber-500/30" />
          {leaderboardLoading ? (
            <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest text-center py-8">Đang tải...</p>
          ) : !leaderboard || leaderboard.topScorers.length === 0 ? (
            <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest text-center py-8">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.topScorers.map((emp, i) => (
                <div key={emp.employeeId} className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition-all">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                    i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-zinc-600/20 text-zinc-300' : i === 2 ? 'bg-orange-700/20 text-orange-400' : 'bg-zinc-900 text-zinc-600'
                  }`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-zinc-200 truncate">{emp.employeeName}</p>
                    <p className="text-[9px] text-zinc-600 font-bold truncate">{emp.department}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-amber-400 tabular-nums">{emp.value}%</p>
                    {emp.extra != null && <p className="text-[9px] text-zinc-600 font-bold">{emp.extra} bài</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top 10 làm bài thường xuyên */}
        <Card className="p-5 lg:p-6 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <SectionHeader icon={CalendarCheck} title="Top 10 Chuyên Cần" subtitle="Tổng số bài kiểm tra nhiều nhất" color="text-emerald-400" bg="bg-emerald-500/10" ring="ring-emerald-500/30" />
          {leaderboardLoading ? (
            <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest text-center py-8">Đang tải...</p>
          ) : !leaderboard || leaderboard.topConsistent.length === 0 ? (
            <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest text-center py-8">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.topConsistent.map((emp, i) => (
                <div key={emp.employeeId} className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition-all">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                    i === 0 ? 'bg-emerald-500/20 text-emerald-400' : i === 1 ? 'bg-zinc-600/20 text-zinc-300' : i === 2 ? 'bg-orange-700/20 text-orange-400' : 'bg-zinc-900 text-zinc-600'
                  }`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-zinc-200 truncate">{emp.employeeName}</p>
                    <p className="text-[9px] text-zinc-600 font-bold truncate">{emp.department}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-emerald-400 tabular-nums">{emp.value}</p>
                    <p className="text-[9px] text-zinc-600 font-bold">bài</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Chưa làm bài trong tháng */}
        <Card className="p-5 lg:p-6 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <SectionHeader
            icon={Flame}
            title="Nhân Viên Chưa Làm Bài"
            subtitle={missedEmpLoading ? 'Đang tải...' : `${missedEmployees.length} nhân viên · T${(leaderboardMonth || currentMonthStr).slice(5, 7)}/${(leaderboardMonth || currentMonthStr).slice(0, 4)}`}
            color="text-red-400" bg="bg-red-500/10" ring="ring-red-500/30"
          />
          {missedEmpLoading ? (
            <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest text-center py-8">Đang tải...</p>
          ) : missedEmployees.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/20 mx-auto mb-2" />
              <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest">Tất cả đều tham gia đầy đủ!</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[590px] space-y-2">
              {missedEmployees.map((emp) => (
                <div key={emp.employeeId} className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition-all">
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-[10px] font-black text-red-400 flex-shrink-0">
                    {emp.missed}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-zinc-200 truncate">{emp.employeeName}</p>
                    <p className="text-[9px] text-zinc-600 font-bold truncate">{emp.department}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-red-400 tabular-nums">{emp.missed}</p>
                    <p className="text-[9px] text-zinc-600 font-bold">/{emp.required} ngày</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top 10 không đạt */}
        <Card className="p-5 lg:p-6 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <SectionHeader icon={XCircle} title="Top 10 Không Đạt" subtitle="Nhiều lần thi không đạt nhất (<80%)" color="text-rose-400" bg="bg-rose-500/10" ring="ring-rose-500/30" />
          {leaderboardLoading ? (
            <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest text-center py-8">Đang tải...</p>
          ) : !leaderboard || leaderboard.topFailed.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/20 mx-auto mb-2" />
              <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest">Tất cả đều đạt điểm tốt!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.topFailed.map((emp, i) => (
                <div key={emp.employeeId} className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition-all">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-[10px] font-black text-rose-400 flex-shrink-0">
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-zinc-200 truncate">{emp.employeeName}</p>
                    <p className="text-[9px] text-zinc-600 font-bold truncate">{emp.department}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-rose-400 tabular-nums">{emp.value}</p>
                    <p className="text-[9px] text-zinc-600 font-bold">
                      {emp.extra != null ? `/${emp.extra} bài` : 'lần'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      </div>

      {/* Top 10 Onboarding Test */}
      <Card className="p-5 lg:p-6 xl:p-8 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
        <SectionHeader
          icon={Trophy}
          title="Top 10 Onboarding Test"
          subtitle="Nhân viên đạt điểm cao nhất bài kiểm tra onboarding (cùng điểm → thời gian ngắn hơn xếp trên)"
          color="text-violet-400"
          bg="bg-violet-500/10"
          ring="ring-violet-500/30"
        />
        {onboardingLbLoading ? (
          <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest text-center py-10">Đang tải...</p>
        ) : onboardingLb.length === 0 ? (
          <div className="text-center py-10">
            <Trophy className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
            <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest">Chưa có nhân viên nào nộp bài</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {onboardingLb.map((emp, i) => {
              const totalQ = 30;
              const mm = Math.floor(emp.timeSeconds / 60);
              const ss = emp.timeSeconds % 60;
              const timeStr = `${mm}:${String(ss).padStart(2, '0')}`;
              return (
                <div key={emp.employeeId} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition-all">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                    i === 0 ? 'bg-violet-500/20 text-violet-300' : i === 1 ? 'bg-zinc-600/20 text-zinc-300' : i === 2 ? 'bg-orange-700/20 text-orange-400' : 'bg-zinc-900 text-zinc-600'
                  }`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-zinc-200 truncate">{emp.employeeName}</p>
                    <p className="text-[9px] text-zinc-600 font-bold truncate">{emp.department}</p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    <p className="text-sm font-black text-violet-400 tabular-nums leading-none">
                      {emp.correctCount}/{totalQ} <span className="text-[10px] text-zinc-500">câu</span>
                    </p>
                    <p className="text-[9px] text-zinc-500 font-bold tabular-nums">{timeStr} phút</p>
                  </div>
                  <div className="flex-shrink-0">
                    {emp.passed
                      ? <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Đạt</span>
                      : <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Chưa đạt</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Vắng làm bài — daily attendance check (8h30-18h, trừ CN). Admin chọn ngày tùy ý. */}
      <Card className="p-5 lg:p-6 xl:p-8 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <SectionHeader
            icon={UserX}
            title="Vắng làm bài"
            subtitle={
              isMissedSunday
                ? 'Ngày đã chọn là Chủ nhật — không tính'
                : missedLoading
                  ? 'Đang kiểm tra...'
                  : `${missedYesterday.length} nhân viên chưa làm kiểm tra trong ngày này`
            }
            color="text-red-400" bg="bg-red-500/10" ring="ring-red-500/30"
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ngày</label>
            <input
              type="date"
              value={missedDate}
              max={todayDateStr}
              onChange={(e) => setMissedDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-200 focus:border-red-500/40 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-colors"
            />
            <button
              type="button"
              onClick={() => setMissedDate(getYesterdayDateStrVN())}
              className="text-[10px] font-black text-zinc-500 hover:text-red-400 uppercase tracking-widest px-2 py-2 transition-colors"
              title="Đặt lại về hôm qua"
            >
              ↺ Hôm qua
            </button>
            <button
              type="button"
              onClick={() => exportOverdueEmployeesExcel(missedYesterday, missedDate)}
              disabled={missedLoading || isMissedSunday || missedYesterday.length === 0}
              className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 disabled:bg-zinc-900 disabled:text-zinc-700 disabled:cursor-not-allowed text-red-400 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 hover:border-red-500/40 transition-colors"
              title="Xuất danh sách ngày đã chọn ra Excel"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất Excel
            </button>
            <button
              type="button"
              onClick={async () => {
                setExportingAll(true);
                try {
                  const groups = await getOverdueEmployeesByDay(DEFAULT_EXPORT_START_DATE);
                  if (groups.length === 0) {
                    alert(`Không có ngày làm việc nào từ ${DEFAULT_EXPORT_START_DATE} đến hôm qua.`);
                  } else {
                    await exportOverdueByDayExcel(groups, DEFAULT_EXPORT_START_DATE);
                  }
                } catch (e: any) {
                  alert('Lỗi xuất Excel: ' + (e?.message || e));
                } finally {
                  setExportingAll(false);
                }
              }}
              disabled={exportingAll}
              className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 disabled:bg-zinc-900 disabled:text-zinc-700 disabled:cursor-not-allowed text-amber-400 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-500/20 hover:border-amber-500/40 transition-colors"
              title={`Xuất từ ${DEFAULT_EXPORT_START_DATE} đến hôm qua, mỗi ngày 1 sheet`}
            >
              <Download className="w-3.5 h-3.5" />
              {exportingAll ? 'Đang xuất...' : 'Xuất tất cả'}
            </button>
          </div>
        </div>
        {isMissedSunday ? (
          <div className="text-center py-10">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-3" />
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Chủ nhật là ngày nghỉ — không kiểm tra</p>
          </div>
        ) : missedLoading ? (
          <div className="text-center py-10">
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Đang tải dữ liệu...</p>
          </div>
        ) : missedYesterday.length === 0 ? (
          <div className="text-center py-10">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-3" />
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Toàn bộ nhân viên đã làm bài ngày này!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto scrollbar-hide">
            {missedYesterday.map((m) => (
              <div key={m.employee_id} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/[0.03] border border-red-500/10 hover:border-red-500/20 transition-all">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <UserX className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-zinc-200 truncate">{m.full_name}</p>
                  <p className="text-[9px] text-zinc-500 font-bold truncate">{m.department}</p>
                </div>
                <Badge variant="warning" className="text-[8px] px-2 py-0.5 flex-shrink-0 font-mono">
                  {m.missedDate}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Row: Overdue list + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue */}
        <Card className="p-5 lg:p-6 xl:p-8 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <SectionHeader icon={AlertCircle} title="Nhân viên quá hạn" subtitle={`${overdueItems.length} người đang quá hạn đào tạo`} color="text-red-400" bg="bg-red-500/10" ring="ring-red-500/30" />
          <div className="space-y-2 max-h-[360px] overflow-y-auto scrollbar-hide">
            {overdueItems.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-3" />
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Không có ai quá hạn!</p>
              </div>
            ) : overdueItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/[0.03] border border-red-500/10 hover:border-red-500/20 transition-all">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-zinc-200 truncate">{item.employeeName}</p>
                  <p className="text-[9px] text-zinc-500 font-bold truncate">{item.courseName}</p>
                </div>
                <Badge variant="warning" className="text-[8px] px-2 py-0.5 flex-shrink-0">
                  {item.daysOverdue}d quá hạn
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent activity */}
        <Card className="p-5 lg:p-6 xl:p-8 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <SectionHeader icon={Activity} title="Hoạt động gần đây" subtitle="Cập nhật mới nhất từ hệ thống" color="text-purple-400" bg="bg-purple-500/10" ring="ring-purple-500/30" />

          <div className="space-y-2 max-h-[360px] overflow-y-auto scrollbar-hide">
            {recentActivity.length === 0 ? (
              <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest text-center py-10">Chưa có hoạt động</p>
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
                      <span className="text-zinc-500"> • {act.department}</span>
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

      {/* Quiz activity 3 tháng */}
      <QuizActivity3Months />
    </div>
  );
}
