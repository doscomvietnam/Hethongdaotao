import * as React from 'react';
import {
  Settings,
  Users,
  GraduationCap,
  Box,
  HelpCircle,
  Wrench,
  ChevronRight,
  Search,
  Plus,
  Shield,
} from 'lucide-react';
import { cn } from '../../lib/utils';

type AdminTab = 'employees' | 'courses' | 'products' | 'quiz' | 'settings';

const ADMIN_TABS: { id: AdminTab; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'employees', label: 'Quản lý nhân viên', icon: Users, description: 'Thêm, sửa, xóa nhân viên và phân quyền' },
  { id: 'courses', label: 'Quản lý khóa học', icon: GraduationCap, description: 'Quản lý nội dung khóa học đào tạo' },
  { id: 'products', label: 'Quản lý sản phẩm', icon: Box, description: 'Quản lý danh mục sản phẩm giới thiệu' },
  { id: 'quiz', label: 'Quản lý quiz', icon: HelpCircle, description: 'Quản lý bài kiểm tra và câu hỏi' },
  { id: 'settings', label: 'Cài đặt hệ thống', icon: Wrench, description: 'Thiết lập cấu hình hệ thống' },
];

function TabPlaceholder({ tab }: { tab: typeof ADMIN_TABS[number] }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 bg-zinc-900/50 px-5 py-3 rounded-2xl border border-zinc-800/50 w-full sm:w-[400px] group focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-inner">
          <Search className="w-5 h-5 text-zinc-600 group-focus-within:text-emerald-500 transition-colors flex-shrink-0" />
          <input
            type="text"
            placeholder={`Tìm kiếm ${tab.label.toLowerCase()}...`}
            className="bg-transparent border-none outline-none text-[11px] w-full text-zinc-200 placeholder:text-zinc-700 font-bold uppercase italic tracking-[0.05em]"
          />
        </div>
        <button className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest italic transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30">
          <Plus className="w-4 h-4" />
          Thêm mới
        </button>
      </div>

      {/* Placeholder content */}
      <div className="rounded-[2.5rem] border-2 border-dashed border-zinc-800 p-16 flex flex-col items-center justify-center text-center gap-6 hover:border-emerald-500/20 transition-all group min-h-[400px]">
        <div className="w-20 h-20 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl">
          <tab.icon className="w-10 h-10 text-zinc-700 group-hover:text-emerald-500 transition-colors" />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-black text-zinc-400 uppercase italic tracking-tight">
            {tab.label}
          </h3>
          <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-widest italic max-w-md leading-relaxed">
            {tab.description}. Module này đang được phát triển và sẽ sớm được hoàn thiện.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 opacity-50">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest italic">
            Dành cho quản trị viên
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = React.useState<AdminTab>('employees');
  const currentTab = ADMIN_TABS.find(t => t.id === activeTab)!;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <header className="flex flex-col gap-4 border-l-4 border-emerald-500 pl-8 py-2">
        <div className="flex items-center gap-4">
          <Settings className="w-8 h-8 text-emerald-500" />
          <h1 className="text-5xl font-black tracking-tighter text-white italic uppercase leading-none">
            QUẢN TRỊ HỆ THỐNG
          </h1>
        </div>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs pl-12">
          Quản lý toàn bộ dữ liệu và cấu hình hệ thống đào tạo
        </p>
      </header>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 bg-zinc-900/40 p-2 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md overflow-x-auto scrollbar-hide">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2.5 px-5 py-3.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest italic whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20'
                : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && <ChevronRight className="w-3 h-3 opacity-50" />}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <TabPlaceholder key={activeTab} tab={currentTab} />
    </div>
  );
}
