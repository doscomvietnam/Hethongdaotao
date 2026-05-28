import * as React from 'react';
import {
  Users, BookOpen, TrendingUp, AlertCircle, Clock, Download,
  Search, BarChart3, CheckCircle2, Trophy, ArrowUpRight,
  Flame, Star, Award, Target, Activity, XCircle, UserX, Play,
  RefreshCw, Settings, X, ExternalLink, BookX,
} from 'lucide-react';
import { Card, Badge, Progress } from '../ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type {
  DashboardKPI, DeptStat, LearningStatus, CourseRanking, OverdueItem, ActivityItem,
} from '../../services/dashboardDataService';
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
  quiz_pass: { label: 'Đạt quiz', color: 'text-blue-400', icon: Trophy },
  quiz_fail: { label: 'Fail quiz', color: 'text-red-400', icon: XCircle },
  started: { label: 'Bắt đầu học', color: 'text-amber-400', icon: Play },
};

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
    { label: 'TỶ LỆ HOÀN THÀNH', value: `${kpi.completionRate}%`, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20' },
    { label: 'KHÓA CHƯA AI HỌC', value: kpi.untouchedCoursesCount, icon: BookX, color: 'text-zinc-400', bg: 'bg-zinc-500/10', ring: 'ring-zinc-500/20' },
    { label: 'NHÂN VIÊN CHƯA HỌC', value: kpi.inactiveEmployeesCount, icon: UserX, color: 'text-zinc-400', bg: 'bg-zinc-500/10', ring: 'ring-zinc-500/20' },
    { label: 'QUÁ HẠN', value: kpi.overdueCount, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-500/20' },
    { label: 'ĐIỂM QUIZ TB', value: kpi.avgQuizScore || '—', icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/10', ring: 'ring-purple-500/20' },
    { label: 'LƯỢT FAIL QUIZ', value: kpi.failedQuizCount, icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', ring: 'ring-rose-500/20' },
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

      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl lg:text-3xl xl:text-4xl font-black tracking-tighter text-white uppercase leading-none">BẢNG QUẢN TRỊ ĐÀO TẠO</h1>
          <p className="text-zinc-600 font-bold uppercase tracking-[0.3em] text-[10px]">Tổng quan hiệu suất toàn hệ thống Doscom Enterprise</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Lark sync button */}
          <button onClick={handleLarkSync} disabled={syncing}
            className="flex items-center gap-2 px-5 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all disabled:opacity-50"
            title={lastSyncAt ? `Lần sync cuối: ${new Date(lastSyncAt).toLocaleString('vi-VN')}\nXóa dữ liệu cũ + gửi lại toàn bộ` : 'Đồng bộ toàn bộ dữ liệu lên Lark Base'}>
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'ĐANG ĐỒNG BỘ...' : 'ĐỒNG BỘ LARK'}
          </button>
          <button onClick={onExport} disabled={exporting}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all disabled:opacity-50">
            <Download className="w-4 h-4" />
            {exporting ? 'ĐANG XUẤT...' : 'XUẤT EXCEL'}
          </button>
        </div>
      </header>

      {/* KPI Cards — 4 cards / row trên laptop, 8 / row trên màn ≥ 1536px */}
      <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-8 gap-3 lg:gap-4">
        {kpiCards.map((kpi, i) => <KpiCard key={i} {...kpi} />)}
      </div>

      {/* Row: Department chart + Learning status donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department completion bar chart */}
        <Card className="col-span-2 p-5 lg:p-6 xl:p-8 bg-[#0C0C0E] border-zinc-900 rounded-2xl">
          <SectionHeader icon={BarChart3} title="Hoàn thành theo phòng ban" subtitle="Tỷ lệ % hoàn thành đào tạo" />
          <div className="h-[280px]">
            {deptStats.length === 0 ? (
              <p className="text-zinc-700 text-[10px] font-bold uppercase tracking-widest text-center py-12">Chưa có dữ liệu</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptStats} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
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
          <SectionHeader icon={XCircle} title="Top fail quiz cao" subtitle="Khóa học có tỷ lệ fail quiz nhiều nhất" color="text-red-400" bg="bg-red-500/10" ring="ring-red-500/30" />
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
                  : `${missedYesterday.length} nhân viên không có điểm quiz trong ngày này`
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
    </div>
  );
}
