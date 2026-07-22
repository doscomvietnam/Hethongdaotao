import * as React from 'react';
import {
  Settings,
  Users,
  GraduationCap,
  Box,
  Wrench,
  ChevronRight,
  Brain,
  Rocket,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Employee } from '../../types';
import CourseManagement from './CourseManagement';
import ProductManagement from './ProductManagement';
import EmployeeManagement from './EmployeeManagement';
import SystemSettings from './SystemSettings';
import DailyTestManagement from './DailyTestManagement';
import OnboardingTestManagement from './OnboardingTestManagement';
import NomaRolloutReport from './NomaRolloutReport';

type AdminTab = 'employees' | 'courses' | 'products' | 'settings' | 'daily-test' | 'onboarding-test' | 'noma-rollout';

const ADMIN_TABS: { id: AdminTab; label: string; icon: React.ElementType; description: string; roles: string[] }[] = [
  { id: 'employees', label: 'Quản lý nhân viên', icon: Users, description: 'Thêm, sửa, xóa nhân viên và phân quyền', roles: ['admin', 'manager'] },
  { id: 'courses', label: 'Quản lý khóa học', icon: GraduationCap, description: 'Quản lý nội dung khóa học đào tạo', roles: ['admin', 'manager'] },
  { id: 'daily-test', label: 'Quiz hằng ngày', icon: Brain, description: 'Báo cáo và quản lý quiz kiến thức hằng ngày', roles: ['admin'] },
  { id: 'onboarding-test', label: 'Test Onboarding', icon: GraduationCap, description: 'Báo cáo và reset bài kiểm tra onboarding nhân viên mới', roles: ['admin'] },
  { id: 'noma-rollout', label: 'Tiến độ NOMA', icon: Rocket, description: 'Theo dõi tiến độ 9 khóa NOMA mới của Kinh doanh + Marketing', roles: ['admin'] },
  { id: 'products', label: 'Quản lý sản phẩm', icon: Box, description: 'Quản lý danh mục sản phẩm giới thiệu', roles: ['admin'] },
  { id: 'settings', label: 'Cài đặt hệ thống', icon: Wrench, description: 'Thiết lập cấu hình hệ thống', roles: ['admin'] },
];

interface AdminPageProps {
  onDataChanged?: () => void | Promise<void>;
  employee: Employee;
}

export default function AdminPage({ onDataChanged, employee }: AdminPageProps) {
  const visibleTabs = ADMIN_TABS.filter(tab => tab.roles.includes(employee.role));
  const [activeTab, setActiveTab] = React.useState<AdminTab>(visibleTabs[0]?.id || 'courses');

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col gap-4 border-l-4 border-emerald-500 pl-8 py-2">
        <div className="flex items-center gap-4">
          <Settings className="w-8 h-8 text-emerald-500" />
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase leading-none">
            QUẢN TRỊ HỆ THỐNG
          </h1>
        </div>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs pl-12">
          Quản lý toàn bộ dữ liệu và cấu hình hệ thống đào tạo
        </p>
      </header>

      <div className="flex items-center gap-2 bg-zinc-900/40 p-2 rounded-2xl border border-zinc-800 backdrop-blur-md overflow-x-auto scrollbar-hide">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2.5 px-5 py-3.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-emerald-500 text-white'
                : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && <ChevronRight className="w-3 h-3 opacity-50" />}
          </button>
        ))}
      </div>

      {activeTab === 'employees' && <EmployeeManagement onDataChanged={onDataChanged} currentEmployee={employee} />}
      {activeTab === 'courses' && <CourseManagement onDataChanged={onDataChanged} currentEmployee={employee} />}
      {activeTab === 'daily-test' && <DailyTestManagement currentEmployeeId={employee.id} />}
      {activeTab === 'onboarding-test' && <OnboardingTestManagement currentEmployeeId={employee.id} />}
      {activeTab === 'noma-rollout' && employee.role === 'admin' && <NomaRolloutReport />}
      {activeTab === 'products' && employee.role === 'admin' && <ProductManagement onDataChanged={onDataChanged} />}
      {activeTab === 'settings' && employee.role === 'admin' && <SystemSettings />}
    </div>
  );
}
