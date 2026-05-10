/**
 * Dashboard Data Service
 * Cung cấp dữ liệu dashboard cho 3 role: Admin, Manager, Employee
 */
import { supabase } from './supabaseClient';

// ── Types ───────────────────────────────────────────────────────────────
export interface DashboardKPI {
  totalEmployees: number;
  totalCourses: number;
  completionRate: number;
  notStartedCount: number;
  overdueCount: number;
  avgQuizScore: number;
  failedQuizCount: number;
  inProgressCount: number;
  completedCount: number;
  untouchedCoursesCount: number;   // Số khóa chưa ai bắt đầu (toàn bộ khóa hoàn toàn không có progress)
  inactiveEmployeesCount: number;  // Số NV chưa làm khóa nào (NV không có bất kỳ progress record nào)
}

export interface DeptStat {
  name: string;
  completion: number;
  avgScore: number;
  total: number;
  completed: number;
}

export interface LearningStatus {
  notStarted: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface CourseRanking {
  courseId: string;
  courseName: string;
  brand: string;
  rate: number; // completion rate or fail rate (%)
  total: number;
}

export interface OverdueItem {
  employeeName: string;
  department: string;
  courseName: string;
  endDate: string;
  daysOverdue: number;
}

export interface ActivityItem {
  employeeName: string;
  department: string;
  courseName: string;
  action: 'completed' | 'quiz_pass' | 'quiz_fail' | 'started';
  score?: number;
  timestamp: string;
}

export interface TeamMemberProgress {
  employeeId: string;
  employeeName: string;
  email: string;
  totalCourses: number;
  completedCourses: number;
  completionRate: number;
  avgScore: number;
  isOverdue: boolean;
  hasFailed: boolean;
  needsReminder: boolean; // chưa bắt đầu hoặc đang học lâu
}

// ── Helper: check if a progress record is "done" ────────────────────────
function isProgressDone(row: any): boolean {
  const hasVideo = Boolean(row.courses?.video_url);
  const hasQuiz = Boolean(row.courses?.quiz_id);
  const isSlide = !hasVideo && !hasQuiz;
  if (isSlide) return row.status === 'completed';
  if (hasQuiz) return Boolean(row.quiz_completed_at);
  return (row.video_progress || 0) >= 100;
}

function isOverdue(row: any): boolean {
  const endDate = row.courses?.end_date;
  if (!endDate) return false;
  return new Date(endDate) < new Date() && !isProgressDone(row);
}

function getDaysOverdue(endDate: string): number {
  const diff = Date.now() - new Date(endDate).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

// ── Fetch all raw data (used by admin & manager) ────────────────────────
async function fetchAllData() {
  const [progressRes, employeesRes, coursesRes] = await Promise.all([
    supabase.from('training_progress').select(`
      *, 
      employees!fk_employee(id, full_name, department, email),
      courses!fk_course(course_id, course_name, brand, category, video_url, quiz_id, end_date, department)
    `).order('updated_at', { ascending: false }),
    supabase.from('employees').select('id, full_name, department, email, role').eq('employment_status', 'active'),
    supabase.from('courses').select('course_id, course_name, brand, category, video_url, quiz_id, end_date, department, status').eq('status', 'active'),
  ]);
  return {
    progress: progressRes.data || [],
    employees: employeesRes.data || [],
    courses: coursesRes.data || [],
  };
}

// ══════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD DATA
// ══════════════════════════════════════════════════════════════════════════
export async function getAdminDashboardData() {
  const { progress, employees, courses } = await fetchAllData();
  const now = new Date();

  // KPI
  const totalEmployees = employees.length;
  const totalCourses = courses.length;

  // Build a set of all employee-course pairs that have progress
  const progressMap = new Map<string, any>();
  for (const p of progress) {
    progressMap.set(`${p.employee_id}__${p.course_id}`, p);
  }

  let completedCount = 0, inProgressCount = 0, notStartedCount = 0, overdueCount = 0;
  let failedQuizCount = 0;
  const scores: number[] = [];
  const overdueItems: OverdueItem[] = [];

  // For each employee × course, determine status
  const courseEndDates = new Map(courses.map((c: any) => [c.course_id, c.end_date]));
  const courseNames = new Map(courses.map((c: any) => [c.course_id, c]));

  // Track course stats for rankings
  const courseCompletionMap: Record<string, { total: number; completed: number; failed: number; name: string; brand: string }> = {};
  for (const c of courses) {
    courseCompletionMap[c.course_id] = { total: 0, completed: 0, failed: 0, name: c.course_name, brand: c.brand };
  }

  for (const emp of employees) {
    for (const course of courses) {
      const key = `${emp.id}__${course.course_id}`;
      const p = progressMap.get(key);
      const endDate = course.end_date;
      const isOverdueNow = endDate && new Date(endDate) < now;

      if (courseCompletionMap[course.course_id]) {
        courseCompletionMap[course.course_id].total++;
      }

      if (!p) {
        // No progress record
        if (isOverdueNow) {
          overdueCount++;
          overdueItems.push({
            employeeName: emp.full_name,
            department: emp.department || '—',
            courseName: course.course_name,
            endDate: endDate,
            daysOverdue: getDaysOverdue(endDate),
          });
        } else {
          notStartedCount++;
        }
      } else {
        const done = isProgressDone(p);
        if (done) {
          completedCount++;
          if (courseCompletionMap[course.course_id]) courseCompletionMap[course.course_id].completed++;
        } else if (isOverdueNow) {
          overdueCount++;
          overdueItems.push({
            employeeName: emp.full_name,
            department: emp.department || '—',
            courseName: course.course_name,
            endDate: endDate,
            daysOverdue: getDaysOverdue(endDate),
          });
        } else {
          inProgressCount++;
        }
        if (p.quiz_score != null) {
          scores.push(p.quiz_score);
          if (!p.quiz_passed) {
            failedQuizCount++;
            if (courseCompletionMap[course.course_id]) courseCompletionMap[course.course_id].failed++;
          }
        }
      }
    }
  }

  const totalPairs = totalEmployees * totalCourses;
  const completionRate = totalPairs > 0 ? Math.round((completedCount / totalPairs) * 1000) / 10 : 0;
  const avgQuizScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0;

  // Khóa chưa ai động + NV chưa làm khóa nào
  const coursesWithProgress = new Set<string>();
  const employeesWithProgress = new Set<string>();
  for (const p of progress) {
    if (p.course_id) coursesWithProgress.add(String(p.course_id));
    if (p.employee_id) employeesWithProgress.add(String(p.employee_id));
  }
  let untouchedCoursesCount = 0;
  for (const c of courses) {
    if (!coursesWithProgress.has(String(c.course_id))) untouchedCoursesCount++;
  }
  let inactiveEmployeesCount = 0;
  for (const e of employees) {
    if (!employeesWithProgress.has(String(e.id))) inactiveEmployeesCount++;
  }

  const kpi: DashboardKPI = {
    totalEmployees, totalCourses, completionRate,
    notStartedCount, overdueCount, avgQuizScore, failedQuizCount,
    inProgressCount, completedCount,
    untouchedCoursesCount, inactiveEmployeesCount,
  };

  // Department stats
  const deptMap: Record<string, { total: number; completed: number; scores: number[] }> = {};
  for (const p of progress) {
    const dept = p.employees?.department || 'Khác';
    if (!deptMap[dept]) deptMap[dept] = { total: 0, completed: 0, scores: [] };
    deptMap[dept].total++;
    if (isProgressDone(p)) deptMap[dept].completed++;
    if (p.quiz_score != null) deptMap[dept].scores.push(p.quiz_score);
  }
  const deptStats: DeptStat[] = Object.entries(deptMap).map(([name, d]) => ({
    name,
    completion: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
    avgScore: d.scores.length > 0 ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0,
    total: d.total,
    completed: d.completed,
  })).sort((a, b) => b.completion - a.completion);

  // Learning status
  const learningStatus: LearningStatus = { notStarted: notStartedCount, inProgress: inProgressCount, completed: completedCount, overdue: overdueCount };

  // Top courses by completion
  const topCompleted: CourseRanking[] = Object.entries(courseCompletionMap)
    .filter(([, v]) => v.total > 0)
    .map(([id, v]) => ({ courseId: id, courseName: v.name, brand: v.brand, rate: Math.round((v.completed / v.total) * 100), total: v.total }))
    .sort((a, b) => b.rate - a.rate).slice(0, 5);

  // Top courses by fail rate
  const topFailed: CourseRanking[] = Object.entries(courseCompletionMap)
    .filter(([, v]) => v.failed > 0)
    .map(([id, v]) => ({ courseId: id, courseName: v.name, brand: v.brand, rate: Math.round((v.failed / v.total) * 100), total: v.failed }))
    .sort((a, b) => b.rate - a.rate).slice(0, 5);

  // Overdue list (sorted by days overdue)
  overdueItems.sort((a, b) => b.daysOverdue - a.daysOverdue);

  // Recent activity
  const recentActivity: ActivityItem[] = progress.slice(0, 20).map((p: any) => {
    let action: ActivityItem['action'] = 'started';
    if (isProgressDone(p)) action = 'completed';
    else if (p.quiz_score != null && !p.quiz_passed) action = 'quiz_fail';
    else if (p.quiz_passed) action = 'quiz_pass';
    return {
      employeeName: p.employees?.full_name || '—',
      department: p.employees?.department || '—',
      courseName: p.courses?.course_name || '—',
      action,
      score: p.quiz_score ?? undefined,
      timestamp: p.updated_at || p.quiz_completed_at || '',
    };
  });

  return { kpi, deptStats, learningStatus, topCompleted, topFailed, overdueItems: overdueItems.slice(0, 20), recentActivity };
}

// ══════════════════════════════════════════════════════════════════════════
// MANAGER DASHBOARD DATA
// ══════════════════════════════════════════════════════════════════════════
export async function getManagerDashboardData(department: string) {
  const { progress, employees, courses } = await fetchAllData();
  const now = new Date();

  // Filter employees to this department
  const deptEmployees = employees.filter((e: any) => e.department === department);
  const deptEmployeeIds = new Set(deptEmployees.map((e: any) => e.id));
  const deptProgress = progress.filter((p: any) => deptEmployeeIds.has(p.employee_id));

  const totalEmployees = deptEmployees.length;
  const totalCourses = courses.length;

  let completedCount = 0, inProgressCount = 0, notStartedCount = 0, overdueCount = 0, failedQuizCount = 0;
  const scores: number[] = [];
  const overdueItems: OverdueItem[] = [];

  const progressMap = new Map<string, any>();
  for (const p of deptProgress) {
    progressMap.set(`${p.employee_id}__${p.course_id}`, p);
  }

  // Team member tracking
  const memberMap: Record<string, { total: number; completed: number; scores: number[]; isOverdue: boolean; hasFailed: boolean; hasNotStarted: boolean }> = {};
  for (const emp of deptEmployees) {
    memberMap[emp.id] = { total: totalCourses, completed: 0, scores: [], isOverdue: false, hasFailed: false, hasNotStarted: false };
  }

  for (const emp of deptEmployees) {
    for (const course of courses) {
      const key = `${emp.id}__${course.course_id}`;
      const p = progressMap.get(key);
      const endDate = course.end_date;
      const isOverdueNow = endDate && new Date(endDate) < now;

      if (!p) {
        if (isOverdueNow) {
          overdueCount++;
          memberMap[emp.id].isOverdue = true;
          overdueItems.push({ employeeName: emp.full_name, department, courseName: course.course_name, endDate, daysOverdue: getDaysOverdue(endDate) });
        } else {
          notStartedCount++;
          memberMap[emp.id].hasNotStarted = true;
        }
      } else {
        const done = isProgressDone(p);
        if (done) {
          completedCount++;
          memberMap[emp.id].completed++;
        } else if (isOverdueNow) {
          overdueCount++;
          memberMap[emp.id].isOverdue = true;
          overdueItems.push({ employeeName: emp.full_name, department, courseName: course.course_name, endDate, daysOverdue: getDaysOverdue(endDate) });
        } else {
          inProgressCount++;
        }
        if (p.quiz_score != null) {
          scores.push(p.quiz_score);
          memberMap[emp.id].scores.push(p.quiz_score);
          if (!p.quiz_passed) { failedQuizCount++; memberMap[emp.id].hasFailed = true; }
        }
      }
    }
  }

  const totalPairs = totalEmployees * totalCourses;
  const completionRate = totalPairs > 0 ? Math.round((completedCount / totalPairs) * 1000) / 10 : 0;
  const avgQuizScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0;

  // Khóa chưa ai trong phòng ban này động + NV phòng ban chưa làm khóa nào
  const coursesWithProgress = new Set<string>();
  const employeesWithProgress = new Set<string>();
  for (const p of deptProgress) {
    if (p.course_id) coursesWithProgress.add(String(p.course_id));
    if (p.employee_id) employeesWithProgress.add(String(p.employee_id));
  }
  let untouchedCoursesCount = 0;
  for (const c of courses) {
    if (!coursesWithProgress.has(String(c.course_id))) untouchedCoursesCount++;
  }
  let inactiveEmployeesCount = 0;
  for (const e of deptEmployees) {
    if (!employeesWithProgress.has(String(e.id))) inactiveEmployeesCount++;
  }

  const kpi: DashboardKPI = {
    totalEmployees, totalCourses, completionRate,
    notStartedCount, overdueCount, avgQuizScore, failedQuizCount,
    inProgressCount, completedCount,
    untouchedCoursesCount, inactiveEmployeesCount,
  };

  // Team members progress
  const teamMembers: TeamMemberProgress[] = deptEmployees.map((emp: any) => {
    const m = memberMap[emp.id];
    return {
      employeeId: emp.id,
      employeeName: emp.full_name,
      email: emp.email || '',
      totalCourses: m.total,
      completedCourses: m.completed,
      completionRate: m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0,
      avgScore: m.scores.length > 0 ? Math.round(m.scores.reduce((a: number, b: number) => a + b, 0) / m.scores.length) : 0,
      isOverdue: m.isOverdue,
      hasFailed: m.hasFailed,
      needsReminder: m.hasNotStarted || m.completed === 0,
    };
  }).sort((a, b) => a.completionRate - b.completionRate);

  // Department courses
  const deptCourses = courses.filter((c: any) => c.department === department || !c.department);

  // Quiz results by course
  const quizByCourse: { courseName: string; passed: number; failed: number; avg: number }[] = [];
  const courseQuizMap: Record<string, { passed: number; failed: number; scores: number[]; name: string }> = {};
  for (const p of deptProgress) {
    if (p.quiz_score == null) continue;
    const cid = p.course_id;
    const cname = p.courses?.course_name || '—';
    if (!courseQuizMap[cid]) courseQuizMap[cid] = { passed: 0, failed: 0, scores: [], name: cname };
    courseQuizMap[cid].scores.push(p.quiz_score);
    if (p.quiz_passed) courseQuizMap[cid].passed++;
    else courseQuizMap[cid].failed++;
  }
  for (const [, v] of Object.entries(courseQuizMap)) {
    quizByCourse.push({
      courseName: v.name,
      passed: v.passed,
      failed: v.failed,
      avg: Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length),
    });
  }

  // Recent activity
  const recentActivity: ActivityItem[] = deptProgress.slice(0, 15).map((p: any) => {
    let action: ActivityItem['action'] = 'started';
    if (isProgressDone(p)) action = 'completed';
    else if (p.quiz_score != null && !p.quiz_passed) action = 'quiz_fail';
    else if (p.quiz_passed) action = 'quiz_pass';
    return {
      employeeName: p.employees?.full_name || '—',
      department,
      courseName: p.courses?.course_name || '—',
      action,
      score: p.quiz_score ?? undefined,
      timestamp: p.updated_at || '',
    };
  });

  overdueItems.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return { kpi, teamMembers, overdueItems: overdueItems.slice(0, 20), recentActivity, quizByCourse, deptCourses };
}
