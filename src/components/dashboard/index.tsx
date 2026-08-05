/**
 * Dashboard — Role-based dashboard orchestration
 * Admin: Full company view
 * Manager: Department-only view
 * Employee: Personal learning view
 */
import * as React from 'react';
import { Course, Employee } from '../../types';
import { AdminDashboardView } from './AdminDashboard';
import { ManagerDashboardView } from './ManagerDashboard';
import { EmployeeDashboardView } from './EmployeeDashboard';
import { getAdminDashboardData, getManagerDashboardData, getRecentActivityOnly } from '../../services/dashboardDataService';
import { exportFilteredReportExcel } from '../../services/trainingProgressService';
import { getAllTrainingProgress } from '../../services/trainingProgressService';

// ── Employee Dashboard (default export for backward compat) ─────────────
interface DashboardProps {
  courses: Course[];
  summary?: any;
  onCourseClick: (course: Course) => void;
  employeeId?: string;
  employeeName?: string;
  department?: string;
}

export const Dashboard = ({ courses, onCourseClick, employeeId, employeeName, department }: DashboardProps) => {
  return (
    <EmployeeDashboardView
      courses={courses}
      onCourseClick={onCourseClick}
      employeeId={employeeId}
      employeeName={employeeName}
      department={department}
    />
  );
};

// ── Admin/Manager Dashboard ─────────────────────────────────────────────
interface AdminDashboardProps {
  employee?: Employee;
}

export const AdminDashboard = ({ employee }: AdminDashboardProps = {}) => {
  const isManager = employee?.role === 'manager';
  const managerDept = employee?.department || '';
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        if (isManager && managerDept) {
          const result = await getManagerDashboardData(managerDept);
          setData(result);
        } else {
          const result = await getAdminDashboardData();
          setData(result);
        }
      } catch (e) {
        console.error('Error fetching dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isManager, managerDept]);

  // Auto-refresh "Hoạt động gần đây" mỗi 60 giây
  React.useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const recent = await getRecentActivityOnly();
        setData((prev: any) => prev ? { ...prev, recentActivity: recent } : prev);
      } catch { }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const progressData = await getAllTrainingProgress();
      const filtered = isManager && managerDept
        ? progressData.filter((r: any) => r.employees?.department === managerDept)
        : progressData;
      await exportFilteredReportExcel(filtered, { filterGrade: 'all', searchQuery: '' });
    } catch (e) {
      console.error('Export error:', e);
      alert('Lỗi xuất báo cáo.');
    } finally {
      setExporting(false);
    }
  };

  const handleLarkSync = async (onProgress: (stage: string, pct: number) => void) => {
    const { syncToLarkBase } = await import('../../services/larkSyncService');

    // Fetch fresh data
    const progressData = await getAllTrainingProgress();
    const filtered = isManager && managerDept
      ? progressData.filter((r: any) => r.employees?.department === managerDept)
      : progressData;

    // Delete all + Create: xóa toàn bộ dữ liệu cũ trên Lark, rồi đẩy mới
    return await syncToLarkBase(filtered, onProgress);
  };

  if (isManager) {
    return (
      <ManagerDashboardView
        department={managerDept}
        data={data}
        loading={loading}
      />
    );
  }

  return (
    <AdminDashboardView
      data={data}
      loading={loading}
      onExport={handleExport}
      exporting={exporting}
      onLarkSync={handleLarkSync}
    />
  );
};

export default Dashboard;

