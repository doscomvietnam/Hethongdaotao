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
  ArrowUpRight
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

interface DashboardProps {
  courses: Course[];
  summary?: any;
  onCourseClick: (course: Course) => void;
}

export const Dashboard = ({ courses, onCourseClick }: DashboardProps) => {
  const ongoingCourses = courses.filter(c => c.progress > 0 && c.progress < 100);
  const completedCount = courses.filter(c => c.progress === 100).length;
  const overdueCount = 0; // Mocking

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col gap-4 border-l-4 border-emerald-500 pl-8 py-2">
        <h1 className="text-5xl font-black tracking-tighter text-white italic uppercase leading-none">TỔNG QUAN HỌC TẬP</h1>
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
                    <p className="text-[11px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-2 italic leading-none">{stat.label}</p>
                    <p className="text-5xl font-black text-white italic tracking-tighter tabular-nums leading-none">{stat.value}</p>
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
                        <h3 className="font-black text-white text-3xl uppercase italic tracking-wider leading-none">Khóa học đang học</h3>
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
                                        <Badge variant="default" className="text-[9px] bg-zinc-900 border-zinc-800 text-zinc-600 px-4 py-1 italic tracking-widest leading-none">{course.brand}</Badge>
                                        <h4 className="font-black text-lg text-zinc-100 uppercase italic tracking-tighter line-clamp-2 leading-tight group-hover:text-emerald-400 transition-colors">
                                            {course.title}
                                        </h4>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-[10px] font-black italic tracking-widest uppercase">
                                        <span className="text-zinc-600 italic leading-none">Hoàn thành</span>
                                        <span className="text-emerald-500 font-mono italic underline underline-offset-4 decoration-emerald-500/20">{course.progress}%</span>
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
                                <p className="text-lg font-black text-zinc-400 uppercase italic tracking-wider italic">Mục tiêu hằng ngày</p>
                                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] italic max-w-sm">Bạn chưa có khóa học nào đang học dở. Hãy bắt đầu khóa học mới trong danh mục đào tạo.</p>
                            </div>
                            <Button className="rounded-xl h-12 bg-zinc-900 border border-zinc-800 hover:text-white px-8 uppercase font-black italic text-[10px] tracking-widest border-none">Xem danh mục</Button>
                        </div>
                    )}
                </div>
            </section>
        </div>

        <aside className="space-y-16">
            {/* Achievement Board */}
            <section className="space-y-10">
                <div className="flex items-center gap-6 border-b border-zinc-900 pb-8 text-white italic">
                    <Trophy className="w-7 h-7 text-amber-500" />
                    <h3 className="font-black text-2xl uppercase tracking-wider leading-none">Thành tích học viên</h3>
                </div>
                <Card className="p-12 bg-gradient-to-br from-emerald-500/10 via-[#0C0C0E] to-zinc-950 border-emerald-500/10 shadow-[0_40px_80px_rgba(0,0,0,0.5)] relative overflow-hidden group ring-1 ring-emerald-500/10 rounded-[3rem]">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[100px] opacity-40 -mr-24 -mt-24 pointer-events-none group-hover:scale-125 transition-transform duration-1000" />
                    <div className="space-y-10 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-zinc-900 border border-emerald-500/20 rounded-2xl flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform duration-700">
                                <Trophy className="w-8 h-8 text-emerald-500" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg font-black text-white italic uppercase tracking-tighter leading-none">Cấp độ: Chuyên gia SP</p>
                                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest italic">THÁNG 04 • 2024</p>
                            </div>
                        </div>

                        <div className="p-8 bg-black/40 rounded-3xl border border-zinc-800 border-dashed backdrop-blur-xl group-hover:border-emerald-500/20 transition-all">
                            <div className="flex justify-between items-center mb-6">
                                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] italic leading-none">Điểm chuẩn PDS</p>
                                <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                            </div>
                            <div className="flex items-end gap-3 translate-y-1">
                                <span className="text-6xl font-black text-white italic font-mono tracking-tighter tabular-nums leading-none">94.2</span>
                                <span className="text-sm font-black text-emerald-500 uppercase italic mb-1 tracking-widest leading-none underline decoration-emerald-500/20 decoration-2">UNIT</span>
                            </div>
                        </div>

                        <Button className="w-full h-16 rounded-[2rem] bg-[#10B981] hover:bg-emerald-600 text-white font-black uppercase italic tracking-widest text-[11px] shadow-2xl shadow-emerald-500/10 flex items-center justify-center gap-3 border-none">
                            XEM BẢNG XẾP HẠNG
                            <ArrowUpRight className="w-4 h-4" />
                        </Button>
                    </div>
                </Card>
            </section>
        </aside>
      </div>
    </div>
  );
};

export const AdminDashboard = () => {
    const DATA_PHONG_BAN = [
        { name: 'Kỹ Thuật', hoanthanh: 85, hieusuat: 92 },
        { name: 'Kinh Doanh', hoanthanh: 64, hieusuat: 78 },
        { name: 'CSKH', hoanthanh: 78, hieusuat: 88 },
        { name: 'Nhân Sự', hoanthanh: 96, hieusuat: 95 },
    ];

    return (
        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                <div className="space-y-3">
                    <h1 className="text-5xl font-black tracking-tighter text-white italic uppercase leading-none">BẢNG QUẢN TRỊ ĐÀO TẠO</h1>
                    <p className="text-zinc-600 font-bold uppercase tracking-[0.3em] text-[10px] italic">Báo cáo hiệu suất & Tiến độ vận hành Doscom Enterprise</p>
                </div>
                <div className="flex gap-6">
                    <Button variant="outline" className="h-14 gap-4 text-[10px] font-black uppercase tracking-widest border-zinc-800 rounded-2xl px-8 hover:bg-zinc-900 italic">
                        <Download className="w-4 h-4 text-emerald-500" />
                        XUẤT BÁO CÁO LARK
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { label: 'TỔNG NHÂN VIÊN', value: '1,240', icon: Users, color: 'text-zinc-400' },
                    { label: 'TỔNG KHÓA ĐÀO TẠO', value: '58', icon: BarChart3, color: 'text-emerald-500' },
                    { label: 'TỶ LỆ HOÀN THÀNH', value: '94.2%', icon: TrendingUp, color: 'text-emerald-500' },
                    { label: 'CẢNH BÁO FAIL TEST', value: '12', icon: AlertCircle, color: 'text-red-500' },
                ].map((stat, i) => (
                    <Card key={i} className="p-10 flex flex-col gap-8 bg-[#0C0C0E] border-zinc-900 shadow-2xl relative overflow-hidden group hover:border-emerald-500/20 transition-all rounded-[2.5rem]">
                        <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center shadow-inner">
                            <stat.icon className={stat.color} size={28} />
                        </div>
                        <div>
                            <p className="text-[11px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-2 italic leading-none">{stat.label}</p>
                            <p className="text-4xl font-black text-white italic tracking-tighter tabular-nums leading-none">{stat.value}</p>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <Card className="p-12 bg-[#0C0C0E] border-zinc-900 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-16">
                        <div className="space-y-2">
                            <h3 className="font-black text-white text-3xl uppercase italic tracking-wider leading-none">Tiến độ Phòng ban</h3>
                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest italic">Tỷ lệ % hoàn thành đào tạo mặc định</p>
                        </div>
                        <Search className="w-6 h-6 text-zinc-800" />
                    </div>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={DATA_PHONG_BAN}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181B" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525B', fontWeight: 800 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525B', fontWeight: 800 }} dx={-10} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#09090B', borderRadius: '24px', border: '1px solid #18181B', fontSize: '12px', padding: '16px' }}
                                    cursor={{ fill: 'rgba(16, 185, 129, 0.03)' }}
                                />
                                <Bar dataKey="hoanthanh" fill="#10B981" radius={[12, 12, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-12 bg-[#0C0C0E] border-zinc-900 rounded-[3rem] shadow-2xl overflow-hidden group">
                     <div className="flex items-center justify-between mb-16">
                        <div className="space-y-2">
                            <h3 className="font-black text-white text-3xl uppercase italic tracking-wider leading-none">Hiệu suất học tập</h3>
                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest italic">Lưu lượng truy cập hệ thống 7 ngày qua</p>
                        </div>
                        <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center">
                            <Clock className="w-5 h-5 text-emerald-500 animate-pulse" />
                        </div>
                    </div>
                    <div className="h-[400px] w-full uppercase">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={DATA_PHONG_BAN}>
                                <defs>
                                    <linearGradient id="colorIndex" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181B" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525B', fontWeight: 800 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525B', fontWeight: 800 }} dx={-10} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#09090B', borderRadius: '24px', border: '1px solid #18181B', fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="hieusuat" stroke="#10B981" strokeWidth={4} fillOpacity={1} fill="url(#colorIndex)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
