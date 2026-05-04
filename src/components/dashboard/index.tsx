import * as React from 'react';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Clock, 
  Download, 
  Search,
  Filter,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Target,
  Zap,
  ArrowUpRight,
  Flame,
  Star,
  Award,
} from 'lucide-react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    AreaChart, 
    Area 
} from 'recharts';
import { Course } from '../../types';
import { Button, Card, Badge, Progress } from '../ui';

// ============================================================
// HELPER: Tính cấp độ từ completion rate
// ============================================================
function getLevelInfo(completionRate: number): { label: string; icon: React.ElementType; color: string } {
  if (completionRate >= 90) return { label: 'Bậc thầy sản phẩm', icon: Flame, color: 'text-amber-400' };
  if (completionRate >= 60) return { label: 'Chuyên gia SP', icon: Trophy, color: 'text-emerald-500' };
  if (completionRate >= 30) return { label: 'Học viên tích cực', icon: Star, color: 'text-blue-400' };
  return { label: 'Tân binh đào tạo', icon: Award, color: 'text-zinc-400' };
}

function getCurrentMonthYear(): string {
  const now = new Date();
  const months = [
    'THÁNG 01', 'THÁNG 02', 'THÁNG 03', 'THÁNG 04',
    'THÁNG 05', 'THÁNG 06', 'THÁNG 07', 'THÁNG 08',
    'THÁNG 09', 'THÁNG 10', 'THÁNG 11', 'THÁNG 12',
  ];
  return `${months[now.getMonth()]} • ${now.getFullYear()}`;
}

interface DashboardProps {
  courses: Course[];
  summary?: any;
  onCourseClick: (course: Course) => void;
}

export const Dashboard = ({ courses, onCourseClick }: DashboardProps) => {
  const ongoingCourses = courses.filter(c => c.progress > 0 && c.progress < 100);
  const completedCount = courses.filter(c => c.progress === 100 || c.isCompleted).length;
  const overdueCount = 0; // Chưa có deadline trong DB

  // Tính completion rate thực
  const completionRate = courses.length > 0 ? Math.round((completedCount / courses.length) * 100) : 0;

  // Tính điểm trung bình quiz thực
  const coursesWithScores = courses.filter(c => c.lastQuizScore != null && c.lastQuizScore > 0);
  const avgQuizScore = coursesWithScores.length > 0
    ? Math.round((coursesWithScores.reduce((sum, c) => sum + (c.lastQuizScore || 0), 0) / coursesWithScores.length) * 10) / 10
    : 0;

  // Tính tổng tiến độ trung bình
  const avgProgress = courses.length > 0
    ? Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / courses.length)
    : 0;

  const levelInfo = getLevelInfo(completionRate);

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col gap-4 border-l-4 border-emerald-500 pl-8 py-2">
        <h1 className="text-5xl font-black tracking-tighter text-white  uppercase leading-none">TỔNG QUAN HỌC TẬP</h1>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Phát triển năng lực cốt lõi cùng Doscom Academy</p>
      </header>

      {/* Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
            { label: 'KHÓA HỌC ĐƯỢC GIAO', value: courses.length, icon: BookOpen, color: 'text-zinc-400' },
            { label: 'ĐÃ HOÀN THÀNH', value: completedCount, icon: CheckCircle2, color: 'text-emerald-500' },
            { label: 'ĐANG THỰC HIỆN', value: ongoingCourses.length, icon: Zap, color: 'text-amber-500' },
            { label: 'QUÁ HẠN ĐÀO TẠO', value: overdueCount, icon: AlertCircle, color: 'text-red-500' },
        ].map((stat, i) => (
            <Card key={i} className="p-10 flex flex-col gap-8 bg-[#0C0C0E] border-zinc-900 shadow-2xl relative overflow-hidden group hover:border-emerald-500/20 transition-all rounded-[2.5rem]">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full -mr-12 -mt-12 group-hover:bg-emerald-500/10 transition-all" />
                <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-105 group-hover:rotate-6 transition-all duration-500">
                    <stat.icon className={stat.color} size={28} />
                </div>
                <div>
                    <p className="text-[11px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-2  leading-none">{stat.label}</p>
                    <p className="text-5xl font-black text-white  tracking-tighter tabular-nums leading-none">{stat.value}</p>
                </div>
            </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-start">
        <div className="lg:col-span-2 space-y-16">
            {/* Ongoing Section */}
            <section className="space-y-10">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-8">
                    <div className="flex items-center gap-6">
                        <div className="w-1.5 h-8 bg-amber-500 rounded-full" />
                        <h3 className="font-black text-white text-3xl uppercase  tracking-wider leading-none">Khóa học đang học</h3>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {ongoingCourses.length > 0 ? ongoingCourses.map((course) => (
                        <Card key={course.id} className="p-8 bg-[#0C0C0E] border-zinc-900 group hover:border-[#10B981]/40 cursor-pointer transition-all duration-700 rounded-[2.5rem] shadow-2xl" onClick={() => onCourseClick(course)}>
                            <div className="space-y-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-zinc-900 shadow-2xl group-hover:scale-105 transition-transform duration-700 bg-zinc-950">
                                        <img src={course.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Badge variant="default" className="text-[9px] bg-zinc-900 border-zinc-800 text-zinc-600 px-4 py-1  tracking-widest leading-none">{course.brand}</Badge>
                                        <h4 className="font-black text-lg text-zinc-100 uppercase  tracking-tighter line-clamp-2 leading-tight group-hover:text-emerald-400 transition-colors">
                                            {course.title}
                                        </h4>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-[10px] font-black  tracking-widest uppercase">
                                        <span className="text-zinc-600  leading-none">Hoàn thành</span>
                                        <span className="text-emerald-500 font-mono  underline underline-offset-4 decoration-emerald-500/20">{course.progress}%</span>
                                    </div>
                                    <Progress value={course.progress} className="h-2 bg-zinc-950 shadow-inner" />
                                </div>
                            </div>
                        </Card>
                    )) : (
                        <div className="col-span-full p-20 border-2 border-dashed border-zinc-900 rounded-[3rem] flex flex-col items-center justify-center text-center gap-8 group hover:border-emerald-500/20 transition-all cursor-pointer">
                            <div className="w-20 h-20 bg-zinc-950 rounded-3xl flex items-center justify-center text-zinc-800 ring-1 ring-zinc-900 shadow-2xl">
                                <Target className="w-10 h-10 group-hover:text-emerald-500 transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-lg font-black text-zinc-400 uppercase  tracking-wider ">Mục tiêu hằng ngày</p>
                                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]  max-w-sm">Bạn chưa có khóa học nào đang học dở. Hãy bắt đầu khóa học mới trong danh mục đào tạo.</p>
                            </div>
                            <Button className="rounded-xl h-12 bg-zinc-900 border border-zinc-800 hover:text-white px-8 uppercase font-black  text-[10px] tracking-widest border-none">Xem danh mục</Button>
                        </div>
                    )}
                </div>
            </section>
        </div>

        <aside className="space-y-16">
            {/* Achievement Board — LIGHT THEME */}
            <section className="space-y-10">
                <div className="flex items-center gap-6 border-b border-zinc-900 pb-8 text-white ">
                    <Trophy className="w-7 h-7 text-amber-500" />
                    <h3 className="font-black text-2xl uppercase tracking-wider leading-none">Thành tích học viên</h3>
                </div>
                <Card className="p-0 bg-white border-zinc-200 shadow-[0_20px_60px_rgba(0,0,0,0.08)] relative overflow-hidden rounded-[2rem]">
                    {/* Header gradient band */}
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-8 pt-8 pb-10 relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                                <levelInfo.icon className="w-7 h-7 text-white" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-base font-black text-white uppercase tracking-tight leading-none">{levelInfo.label}</p>
                                <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">{getCurrentMonthYear()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 pb-8 -mt-4 space-y-5 relative z-10">
                        {/* Điểm quiz trung bình */}
                        <div className="p-6 bg-white rounded-2xl border border-zinc-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.3em] leading-none">Điểm quiz TB</p>
                                <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                                    <Zap className="w-4 h-4 text-emerald-500" />
                                </div>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-5xl font-black text-zinc-800 font-mono tracking-tighter tabular-nums leading-none">
                                  {coursesWithScores.length > 0 ? avgQuizScore : '—'}
                                </span>
                                <span className="text-xs font-black text-emerald-500 uppercase mb-1 tracking-widest leading-none">
                                  {coursesWithScores.length > 0 ? 'ĐIỂM' : ''}
                                </span>
                            </div>
                            {coursesWithScores.length === 0 && (
                              <p className="text-[9px] text-zinc-300 mt-3 font-bold uppercase tracking-widest">Chưa có kết quả kiểm tra</p>
                            )}
                        </div>

                        {/* Tiến độ tổng quát */}
                        <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <div className="flex justify-between items-center mb-4">
                            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.3em] leading-none">Tiến độ tổng quát</p>
                            <span className="text-sm font-black text-emerald-500 font-mono tracking-tight">{completionRate}%</span>
                          </div>
                          <div className="w-full bg-zinc-200 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-3">
                            <span>{completedCount} hoàn thành</span>
                            <span>{courses.length} tổng cộng</span>
                          </div>
                        </div>

                        {/* Tiến độ trung bình */}
                        <div className="p-5 bg-white rounded-2xl border border-zinc-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.3em] leading-none mb-2">Tiến độ TB các khóa</p>
                              <p className="text-2xl font-black text-zinc-800 font-mono tracking-tighter tabular-nums">{avgProgress}%</p>
                            </div>
                            <div className="w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center">
                              <TrendingUp className="w-5 h-5 text-emerald-500" />
                            </div>
                          </div>
                        </div>
                    </div>
                </Card>
            </section>
        </aside>
      </div>
    </div>
  );
};

// ── Helper: normalize Vietnamese text for search ─────────────────────────
function normalizeVietnamese(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

export const AdminDashboard = () => {
    const [stats, setStats] = React.useState({ employeeCount: 0, courseCount: 0, completionRate: 0, failedCount: 0 });
    const [deptData, setDeptData] = React.useState<{ name: string; hoanthanh: number; hieusuat: number }[]>([]);
    const [reportData, setReportData] = React.useState<any[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [filterGrade, setFilterGrade] = React.useState<'all' | 'pass' | 'fail' | 'pending'>('all');
    const [exporting, setExporting] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      const fetchData = async () => {
        try {
          const { getAdminStats, getDepartmentStats, getAllTrainingProgress } = await import('../../services/trainingProgressService');
          const [adminStats, deptStats, progressData] = await Promise.all([
            getAdminStats(), getDepartmentStats(), getAllTrainingProgress()
          ]);
          setStats(adminStats);
          setDeptData(deptStats.length > 0 ? deptStats : [{ name: 'Chưa có dữ liệu', hoanthanh: 0, hieusuat: 0 }]);
          setReportData(progressData);
        } catch (e) { console.error('Error fetching admin stats:', e); }
        finally { setLoading(false); }
      };
      fetchData();
    }, []);

    const handleExport = async () => {
      setExporting(true);
      try {
        const { exportTrainingReportExcel } = await import('../../services/trainingProgressService');
        await exportTrainingReportExcel();
      } catch (e) { console.error('Export error:', e); alert('Lỗi xuất báo cáo.'); }
      finally { setExporting(false); }
    };

    // Filter & search report data — supports Vietnamese diacritics
    const filteredReport = React.useMemo(() => {
      const q = normalizeVietnamese(searchQuery.trim());
      return reportData.filter(row => {
        const name = normalizeVietnamese(row.employees?.full_name || '');
        const dept = normalizeVietnamese(row.employees?.department || '');
        const email = normalizeVietnamese(row.employees?.email || '');
        const course = normalizeVietnamese(row.courses?.course_name || '');
        const matchesSearch = !q || name.includes(q) || dept.includes(q) || course.includes(q) || email.includes(q);

        if (!matchesSearch) return false;
        if (filterGrade === 'all') return true;
        if (filterGrade === 'pass') return row.quiz_passed === true;
        if (filterGrade === 'fail') return row.quiz_score != null && !row.quiz_passed;
        if (filterGrade === 'pending') return row.quiz_score == null;
        return true;
      });
    }, [reportData, searchQuery, filterGrade]);

    return (
        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <header className="flex flex-col gap-4">
                <div className="space-y-3">
                    <h1 className="text-5xl font-black tracking-tighter text-white  uppercase leading-none">BẢNG QUẢN TRỊ ĐÀO TẠO</h1>
                    <p className="text-zinc-600 font-bold uppercase tracking-[0.3em] text-[10px] ">Báo cáo hiệu suất & Tiến độ vận hành Doscom Enterprise</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { label: 'TỔNG NHÂN VIÊN', value: loading ? '...' : stats.employeeCount.toLocaleString(), icon: Users, color: 'text-zinc-400' },
                    { label: 'TỔNG KHÓA ĐÀO TẠO', value: loading ? '...' : String(stats.courseCount), icon: BarChart3, color: 'text-emerald-500' },
                    { label: 'TỶ LỆ HOÀN THÀNH', value: loading ? '...' : `${stats.completionRate}%`, icon: TrendingUp, color: 'text-emerald-500' },
                    { label: 'CẢNH BÁO FAIL TEST', value: loading ? '...' : String(stats.failedCount), icon: AlertCircle, color: 'text-red-500' },
                ].map((stat, i) => (
                    <Card key={i} className="p-10 flex flex-col gap-8 bg-[#0C0C0E] border-zinc-900 shadow-2xl relative overflow-hidden group hover:border-emerald-500/20 transition-all rounded-[2.5rem]">
                        <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center shadow-inner">
                            <stat.icon className={stat.color} size={28} />
                        </div>
                        <div>
                            <p className="text-[11px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-2  leading-none">{stat.label}</p>
                            <p className="text-4xl font-black text-white  tracking-tighter tabular-nums leading-none">{stat.value}</p>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <Card className="p-12 bg-[#0C0C0E] border-zinc-900 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-16">
                        <div className="space-y-2">
                            <h3 className="font-black text-white text-3xl uppercase  tracking-wider leading-none">Tiến độ Phòng ban</h3>
                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest ">Tỷ lệ % hoàn thành đào tạo</p>
                        </div>
                        <Search className="w-6 h-6 text-zinc-800" />
                    </div>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={deptData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181B" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525B', fontWeight: 800 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525B', fontWeight: 800 }} dx={-10} />
                                <Tooltip contentStyle={{ backgroundColor: '#09090B', borderRadius: '24px', border: '1px solid #18181B', fontSize: '12px', padding: '16px' }} cursor={{ fill: 'rgba(16, 185, 129, 0.03)' }} />
                                <Bar dataKey="hoanthanh" fill="#10B981" radius={[12, 12, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-12 bg-[#0C0C0E] border-zinc-900 rounded-[3rem] shadow-2xl overflow-hidden group">
                     <div className="flex items-center justify-between mb-16">
                        <div className="space-y-2">
                            <h3 className="font-black text-white text-3xl uppercase  tracking-wider leading-none">Hiệu suất học tập</h3>
                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest ">Điểm trung bình theo phòng ban</p>
                        </div>
                        <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center">
                            <Clock className="w-5 h-5 text-emerald-500 animate-pulse" />
                        </div>
                    </div>
                    <div className="h-[400px] w-full uppercase">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={deptData}>
                                <defs>
                                    <linearGradient id="colorIndex" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181B" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525B', fontWeight: 800 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525B', fontWeight: 800 }} dx={-10} />
                                <Tooltip contentStyle={{ backgroundColor: '#09090B', borderRadius: '24px', border: '1px solid #18181B', fontSize: '12px' }} />
                                <Area type="monotone" dataKey="hieusuat" stroke="#10B981" strokeWidth={4} fillOpacity={1} fill="url(#colorIndex)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* ── BẢNG BÁO CÁO KẾT QUẢ HỌC TẬP ──────────────────────────── */}
            <Card className="bg-[#0C0C0E] border-zinc-900 rounded-[3rem] shadow-2xl overflow-hidden">
                <div className="p-10 border-b border-zinc-900 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h3 className="font-black text-white text-3xl uppercase tracking-wider leading-none">Báo cáo kết quả học tập</h3>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                          {filteredReport.length} kết quả {searchQuery || filterGrade !== 'all' ? '(đã lọc)' : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                            <input
                                type="text"
                                placeholder="Tìm tên, phòng ban, khóa học..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="bg-zinc-900 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/40 w-64 font-bold"
                            />
                        </div>
                        {/* Filter */}
                        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                            {([
                              ['all', 'Tất cả'],
                              ['pass', 'Đạt'],
                              ['fail', 'Không đạt'],
                              ['pending', 'Chưa làm'],
                            ] as const).map(([key, label]) => (
                              <button
                                key={key}
                                onClick={() => setFilterGrade(key)}
                                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                                  filterGrade === key
                                    ? 'bg-emerald-500 text-white'
                                    : 'text-zinc-600 hover:text-zinc-300'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                        </div>
                        {/* Export */}
                        <Button variant="outline" className="h-10 gap-2 text-[10px] font-black uppercase tracking-widest border-zinc-800 rounded-xl px-6 hover:bg-zinc-900" onClick={handleExport} disabled={exporting}>
                            <Download className="w-3.5 h-3.5 text-emerald-500" />
                            {exporting ? 'ĐANG XUẤT...' : 'XUẤT EXCEL'}
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-zinc-900">
                                {['STT', 'Họ tên nhân viên', 'Phòng ban', 'Khóa học', 'Thời gian làm bài', 'Điểm số', 'Xếp loại', 'Tiến độ video', 'Trạng thái'].map(h => (
                                    <th key={h} className="px-6 py-5 text-[10px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} className="px-6 py-20 text-center text-zinc-600 text-sm font-bold uppercase tracking-widest">Đang tải dữ liệu...</td></tr>
                            ) : filteredReport.length === 0 ? (
                                <tr><td colSpan={9} className="px-6 py-20 text-center text-zinc-700 text-sm font-bold uppercase tracking-widest">Chưa có dữ liệu báo cáo</td></tr>
                            ) : filteredReport.map((row, i) => {
                                const name = row.employees?.full_name || '—';
                                const dept = row.employees?.department || '—';
                                const course = row.courses?.course_name || '—';
                                const time = row.quiz_time_seconds != null ? `${Math.floor(row.quiz_time_seconds / 60)}p ${row.quiz_time_seconds % 60}s` : '—';
                                const score = row.quiz_score != null ? row.quiz_score : '—';
                                const passed = row.quiz_passed;
                                const grade = row.quiz_score != null ? (passed ? 'Đạt' : 'Không đạt') : 'Chưa làm';
                                const gradeColor = row.quiz_score != null ? (passed ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-400 bg-red-500/10') : 'text-zinc-600 bg-zinc-800';
                                const videoProg = row.video_progress || 0;
                                const status = row.quiz_completed_at ? 'Hoàn thành' : row.video_progress > 0 ? 'Đang học' : 'Chưa bắt đầu';
                                const statusColor = row.quiz_completed_at ? 'text-emerald-500' : row.video_progress > 0 ? 'text-amber-500' : 'text-zinc-600';

                                return (
                                    <tr key={row.id || i} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-zinc-600 tabular-nums">{i + 1}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-zinc-200 whitespace-nowrap">{name}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-zinc-400 whitespace-nowrap">{dept}</td>
                                        <td className="px-6 py-4 text-xs font-bold text-zinc-300 max-w-[200px] truncate">{course}</td>
                                        <td className="px-6 py-4 text-xs font-mono font-bold text-zinc-400 tabular-nums">{time}</td>
                                        <td className="px-6 py-4 text-sm font-black text-white tabular-nums font-mono">{score}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${gradeColor}`}>{grade}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-16 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                                    <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${videoProg}%` }} />
                                                </div>
                                                <span className="text-[10px] font-bold text-cyan-400 font-mono tabular-nums">{videoProg}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${statusColor}`}>{status}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;
