import * as React from 'react';
import { Building2, UserCircle } from 'lucide-react';
import type { Course, Employee } from '../../types';
import { AdminDashboard } from './index';
import { EmployeeDashboardView } from './EmployeeDashboard';

interface OverviewTabsProps {
  employee: Employee;
  courses: Course[];
  onCourseClick: (course: Course) => void;
}

// Gộp "Tổng quan tổ chức/phòng ban" + "Tổng quan cá nhân" vào 1 trang, chuyển bằng tab.
export default function OverviewTabs({ employee, courses, onCourseClick }: OverviewTabsProps) {
  const [tab, setTab] = React.useState<'org' | 'me'>('org');
  const orgLabel = employee.role === 'manager' ? 'Phòng ban' : 'Tổ chức';

  const tabBtn = (active: boolean) =>
    `flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all ${
      active
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
    }`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button className={tabBtn(tab === 'org')} onClick={() => setTab('org')}>
          <Building2 className="w-4 h-4" /> {orgLabel}
        </button>
        <button className={tabBtn(tab === 'me')} onClick={() => setTab('me')}>
          <UserCircle className="w-4 h-4" /> Cá nhân
        </button>
      </div>

      {tab === 'org' ? (
        <AdminDashboard employee={employee} />
      ) : (
        <EmployeeDashboardView
          courses={courses}
          onCourseClick={onCourseClick}
          employeeId={employee.id}
          employeeName={employee.full_name}
          department={employee.department || ''}
        />
      )}
    </div>
  );
}
