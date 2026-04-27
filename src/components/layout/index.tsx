import * as React from 'react';
import { 
  LayoutDashboard, 
  GraduationCap, 
  BarChart3, 
  Search, 
  Bell, 
  ShieldCheck,
  Building2,
  Box,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { ViewType, Employee } from '../../types';
import { cn } from '../../lib/utils';

interface SidebarProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  employee: Employee;
}

export const Sidebar = ({ currentView, setView, employee }: SidebarProps) => {
  const allMenuItems = [
    { id: ViewType.DASHBOARD, icon: LayoutDashboard, label: 'Tổng quan học tập', roles: ['admin', 'manager', 'employee'] },
    { id: ViewType.PRODUCT_LIBRARY, icon: Box, label: 'Giới thiệu sản phẩm', roles: ['admin', 'manager', 'employee'] },
    { id: ViewType.COURSE_CATALOG, icon: GraduationCap, label: 'Khóa học đào tạo', roles: ['admin', 'manager', 'employee'] },
    { id: ViewType.REPORT, icon: BarChart3, label: 'Báo cáo', roles: ['admin', 'manager'] },
    { id: ViewType.ADMIN, icon: Settings, label: 'Quản trị hệ thống', roles: ['admin', 'manager'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(employee.role));

  const roleLabels: Record<string, string> = {
    admin: 'Quản trị viên',
    manager: 'Quản lý',
    employee: 'Nhân viên',
  };

  const roleColors: Record<string, string> = {
    admin: 'text-emerald-500',
    manager: 'text-blue-400',
    employee: 'text-zinc-400',
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <aside className="w-72 border-r border-zinc-900 bg-[#0C0C0E] h-screen sticky top-0 flex flex-col z-20 overflow-hidden">
      <div className="p-10 flex items-center gap-4 border-b border-zinc-900/50">
        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/20">
          <ShieldCheck className="text-white w-7 h-7" />
        </div>
        <div className="flex flex-col">
            <span className="font-black text-xl tracking-tight text-white leading-none italic uppercase">DOSCOM</span>
            <span className="text-[10px] text-emerald-500 font-black tracking-widest uppercase mt-1">Academy</span>
        </div>
      </div>

      <nav className="flex-1 px-6 space-y-4 py-10 overflow-y-auto scrollbar-hide">
        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] px-4 mb-6 italic">Hệ thống nội bộ</div>
        
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              'w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-xs font-black transition-all group relative uppercase tracking-widest italic',
              currentView.startsWith(item.id.split('-')[0]) 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200'
            )}
          >
            {currentView.startsWith(item.id.split('-')[0]) && (
                <div className="absolute left-0 w-1.5 h-6 bg-emerald-500 rounded-r-full shadow-[0_0_15px_#10B981]" />
            )}
            <item.icon className={cn('w-5 h-5', currentView.startsWith(item.id.split('-')[0]) ? 'text-emerald-500' : 'text-zinc-600 group-hover:text-zinc-300')} />
            {item.label}
            {currentView.startsWith(item.id.split('-')[0]) && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
          </button>
        ))}
      </nav>

      {/* User card — bấm vào mở trang Profile */}
      <div className="p-8 border-t border-zinc-900 bg-black/20">
        <div
          onClick={() => setView(ViewType.PROFILE)}
          className={cn(
            "rounded-2xl p-5 border flex items-center gap-4 group cursor-pointer transition-all",
            currentView === ViewType.PROFILE
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800"
          )}
        >
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex-shrink-0 flex items-center justify-center overflow-hidden ring-1 ring-zinc-700/50 shadow-inner">
                 <div className="w-full h-full bg-emerald-500/10 flex items-center justify-center">
                    <span className="text-emerald-500 font-black italic text-xs uppercase">
                      {getInitials(employee.full_name)}
                    </span>
                 </div>
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="text-xs font-black text-white truncate italic uppercase tracking-tighter">
                  {employee.full_name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className={`text-[9px] truncate uppercase font-black tracking-widest italic ${roleColors[employee.role]}`}>
                      {roleLabels[employee.role]}
                    </p>
                </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
        </div>
      </div>
    </aside>
  );
};

interface NavbarProps {
  employee: Employee;
}

export const Navbar = ({ employee }: NavbarProps) => {
  return (
    <header className="h-24 border-b border-zinc-900 bg-[#09090B]/80 backdrop-blur-3xl sticky top-0 z-10 px-12 flex items-center justify-between">
      <div className="flex items-center gap-12">
        <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-emerald-500 opacity-50" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">DoScom Enterprise • Ha Noi Hub</span>
        </div>
        
        <div className="hidden md:flex items-center text-sm text-zinc-500 bg-zinc-900/50 px-6 py-3 rounded-2xl border border-zinc-800/50 w-[450px] group focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-inner">
          <Search className="w-5 h-5 mr-4 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Tìm mã sản phẩm, bài giảng quy trình..." 
            className="bg-transparent border-none outline-none text-[11px] w-full text-zinc-200 placeholder:text-zinc-700 font-bold uppercase italic tracking-[0.05em]"
          />
        </div>
      </div>

      <div className="flex items-center gap-10">
        <div className="flex flex-col items-end">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1.5 italic">Xin chào</p>
            <p className="text-sm font-black text-white leading-none tracking-tight italic">
              {employee.full_name}
            </p>
        </div>
        
        <div className="h-10 w-[2px] bg-zinc-900" />
        
        <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group cursor-pointer hover:bg-zinc-800 transition-all shadow-xl">
                <Bell className="w-6 h-6 text-zinc-500 group-hover:text-emerald-500 transition-colors" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-[3px] border-[#09090B] text-[9px] flex items-center justify-center font-black text-white shadow-lg">4</span>
            </div>
        </div>
      </div>
    </header>
  );
};

interface LayoutProps {
  currentView: ViewType;
  onNavigate: (view: string) => void;
  employee: Employee;
  onLogout: () => void;
  onChangePassword: () => void;
  children: React.ReactNode;
}

export default function Layout({ currentView, onNavigate, employee, children }: LayoutProps) {
  const handleSetView = (view: ViewType) => {
    const viewMap: Record<ViewType, string> = {
      [ViewType.DASHBOARD]: 'dashboard',
      [ViewType.PRODUCT_LIBRARY]: 'products',
      [ViewType.PRODUCT_DETAIL]: 'products',
      [ViewType.COURSE_CATALOG]: 'courses',
      [ViewType.COURSE_DETAIL]: 'courses',
      [ViewType.QUIZ]: 'courses',
      [ViewType.REPORT]: 'report',
      [ViewType.ADMIN]: 'admin',
      [ViewType.PROFILE]: 'profile',
      [ViewType.LOGIN]: 'dashboard',
      [ViewType.FORGOT_PASSWORD]: 'dashboard',
      [ViewType.RESET_PASSWORD]: 'dashboard',
    };
    onNavigate(viewMap[view] || 'dashboard');
  };

  return (
    <div className="flex min-h-screen bg-[#09090B] text-white">
      <Sidebar
        currentView={currentView}
        setView={handleSetView}
        employee={employee}
      />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Navbar employee={employee} />
        <main className="flex-1 overflow-y-auto p-12">
          {children}
        </main>
      </div>
    </div>
  );
}
