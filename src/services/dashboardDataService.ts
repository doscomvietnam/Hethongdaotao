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

// ══════════════════════════════════════════════════════════════════════════
// LEADERBOARD DATA (Daily Test based)
// ══════════════════════════════════════════════════════════════════════════
export interface LeaderboardEmployee {
  employeeId: string;
  employeeName: string;
  department: string;
  value: number;
  extra?: number;
}

export interface LeaderboardInactiveEmployee extends LeaderboardEmployee {
  lastTestDate: string | null;
}

export interface LeaderboardData {
  topScorers: LeaderboardEmployee[];
  topConsistent: LeaderboardEmployee[];
  topInactive: LeaderboardInactiveEmployee[];
}

const LEADERBOARD_START_DATE = '2026-05-20'; // ngày ra mắt hệ thống

// Trả về {startDate, endDate} YYYY-MM-DD cho tháng đã chọn, hoặc từ launch đến hôm nay
export function getLeaderboardDateRange(month: string | null): { startDate: string; endDate: string; label: string } {
  if (!month) {
    const todayStr = normDate(new Date(Date.now() + 7 * 3600 * 1000).toISOString());
    return { startDate: LEADERBOARD_START_DATE, endDate: todayStr, label: `Từ 20/05/2026` };
  }
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const lastDay = new Date(y, m, 0).getDate(); // ngày cuối tháng
  const end = `${month}-${String(lastDay).padStart(2, '0')}`;
  const label = `Tháng ${m}/${y}`;
  return { startDate: start, endDate: end, label };
}

// Helper normalise ở module scope để dùng trong getLeaderboardDateRange
function normDate(d: string) { return String(d).slice(0, 10); }

export async function getLeaderboardData(startDate: string, endDate: string): Promise<LeaderboardData> {
  const [progressRes, employeesRes, dailyTestRes] = await Promise.all([
    supabase
      .from('training_progress')
      .select('employee_id, quiz_score, quiz_completed_at, updated_at, status, video_progress'),
    supabase
      .from('employees')
      .select('id, full_name, department')
      .eq('employment_status', 'active'),
    supabase
      .from('daily_tests')
      .select('employee_id, score_percent, test_date')
      .eq('status', 'submitted')
      .gte('test_date', startDate)
      .lte('test_date', endDate),
  ]);

  const allProgress = progressRes.data || [];
  const employees = employeesRes.data || [];
  const dailyTests = dailyTestRes.data || [];

  // Lọc theo khoảng ngày (dùng VN timezone UTC+7)
  function normDateVN(ts: string): string {
    if (!ts) return '';
    return new Date(new Date(ts).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  }
  const progress = allProgress.filter(p => {
    const d = normDateVN(p.updated_at || '');
    return d >= startDate && d <= endDate;
  });

  // Build per-employee stats từ training_progress trong khoảng thời gian đã chọn
  const empMap = new Map<string, { scores: number[]; completedCount: number; activeDays: Set<string>; lastDate: string | null }>();
  for (const p of progress) {
    if (!empMap.has(p.employee_id)) {
      empMap.set(p.employee_id, { scores: [], completedCount: 0, activeDays: new Set(), lastDate: null });
    }
    const em = empMap.get(p.employee_id)!;
    if (p.quiz_score != null) em.scores.push(p.quiz_score);
    const isDone = p.quiz_completed_at != null || (p.video_progress || 0) >= 100 || p.status === 'completed';
    if (isDone) em.completedCount++;
    const d = normDateVN(p.updated_at || '');
    if (d) {
      em.activeDays.add(d);
      if (!em.lastDate || d > em.lastDate) em.lastDate = d;
    }
  }

  // Build per-employee stats từ daily_tests (test_date đã là VN date, không cần convert)
  const dailyMap = new Map<string, { scores: number[]; lastDate: string | null }>();
  for (const dt of dailyTests) {
    if (!dailyMap.has(dt.employee_id)) dailyMap.set(dt.employee_id, { scores: [], lastDate: null });
    const dm = dailyMap.get(dt.employee_id)!;
    if (dt.score_percent != null) dm.scores.push(dt.score_percent);
    if (dt.test_date && (!dm.lastDate || dt.test_date > dm.lastDate)) dm.lastDate = dt.test_date;
  }

  // Top 10 điểm cao — avg của cả quiz khóa học + daily test trong kỳ
  const scorers: LeaderboardEmployee[] = [];
  for (const emp of employees) {
    const em = empMap.get(emp.id);
    const dm = dailyMap.get(emp.id);
    const allScores = [...(em?.scores || []), ...(dm?.scores || [])];
    if (allScores.length === 0) continue;
    const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    scorers.push({
      employeeId: emp.id,
      employeeName: emp.full_name,
      department: emp.department || '—',
      value: Math.round(avg * 10) / 10,
      extra: allScores.length, // tổng số bài (quiz + daily test)
    });
  }
  const topScorers = scorers.sort((a, b) => b.value - a.value).slice(0, 10);

  // Top 10 chuyên cần — tổng số bài quiz khóa học + daily test đã làm trong kỳ
  const consistent: LeaderboardEmployee[] = [];
  for (const emp of employees) {
    const em = empMap.get(emp.id);
    const dm = dailyMap.get(emp.id);
    const count = (em?.scores.length || 0) + (dm?.scores.length || 0);
    if (count === 0) continue;
    consistent.push({
      employeeId: emp.id,
      employeeName: emp.full_name,
      department: emp.department || '—',
      value: count,
    });
  }
  const topConsistent = consistent.sort((a, b) => b.value - a.value).slice(0, 10);

  // Top 10 không làm bài — ít bài quiz + daily test nhất trong kỳ
  const inactive: LeaderboardInactiveEmployee[] = [];
  for (const emp of employees) {
    const em = empMap.get(emp.id);
    const dm = dailyMap.get(emp.id);
    const totalDone = (em?.scores.length || 0) + (dm?.scores.length || 0);
    // Lấy ngày làm bài gần nhất từ cả 2 nguồn
    const dates = [em?.lastDate || null, dm?.lastDate || null].filter(Boolean) as string[];
    const lastDate = dates.length > 0 ? dates.sort().reverse()[0] : null;
    inactive.push({
      employeeId: emp.id,
      employeeName: emp.full_name,
      department: emp.department || '—',
      value: totalDone,
      lastTestDate: lastDate,
    });
  }
  const topInactive = inactive
    .sort((a, b) => a.value - b.value)
    .slice(0, 10);

  return { topScorers, topConsistent, topInactive };
}

// ── Onboarding Leaderboard ────────────────────────────────────────────────
export interface OnboardingLeaderboardEntry {
  employeeId: string;
  employeeName: string;
  department: string;
  correctCount: number;
  scorePercent: number;
  passed: boolean;
  timeSeconds: number;
  submittedAt: string;
}

export async function getOnboardingLeaderboard(): Promise<OnboardingLeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('onboarding_tests')
    .select(`
      employee_id,
      correct_count,
      score_percent,
      passed,
      time_seconds,
      submitted_at,
      employees(full_name, department)
    `)
    .eq('status', 'submitted')
    .order('score_percent', { ascending: false })
    .order('time_seconds', { ascending: true })
    .limit(10);

  if (error) throw error;
  return (data || []).map((row: any) => ({
    employeeId: row.employee_id,
    employeeName: row.employees?.full_name || '—',
    department: row.employees?.department || '—',
    correctCount: row.correct_count ?? 0,
    scorePercent: Number(row.score_percent ?? 0),
    passed: row.passed ?? false,
    timeSeconds: row.time_seconds ?? 0,
    submittedAt: row.submitted_at,
  }));
}

// ── Quiz Activity — 3 tháng ───────────────────────────────────────────────
export interface MonthStat {
  month: string;
  label: string;
  // Bài kiểm tra hằng ngày
  done: number;
  passed: number;
  // Bài kiểm tra khóa học
  courseCount: number;
  coursePassed: number;
  // Điểm TB tổng hợp tháng (daily + course)
  monthAvgScore: number | null;
  monthScorePassed: boolean; // avgScore >= 80
}

export interface EmployeeQuizActivity {
  employeeId: string;
  employeeName: string;
  department: string;
  months: MonthStat[];
  totalDone: number;
  totalPassed: number;
  totalCourseCount: number;
  totalCoursePassed: number;
}

function countWorkdays(yearMonth: string, upToDay?: number): number {
  const [y, m] = yearMonth.split('-').map(Number);
  const last = upToDay ?? new Date(y, m, 0).getDate();
  let count = 0;
  for (let d = 1; d <= last; d++) {
    if (new Date(y, m - 1, d).getDay() !== 0) count++;
  }
  return count;
}

export async function getQuizActivity3Months(): Promise<{
  activities: EmployeeQuizActivity[];
  monthLabels: { key: string; label: string; workdays: number }[];
}> {
  // Dùng toISOString() để lấy ngày/tháng Việt Nam chính xác (tránh .getMonth() bị lệch timezone)
  const vnNow = new Date(Date.now() + 7 * 3600 * 1000);
  const todayStr = vnNow.toISOString().slice(0, 10); // "2026-06-30"
  const todayDay = Number(todayStr.slice(8, 10));
  const cy = Number(todayStr.slice(0, 4));
  const cm = Number(todayStr.slice(5, 7));

  const monthKeys: { key: string; label: string; workdays: number }[] = [];
  for (let i = 2; i >= 0; i--) {
    let m = cm - i;
    let y = cy;
    if (m <= 0) { m += 12; y -= 1; }
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const isCurrent = i === 0;
    const workdays = isCurrent ? countWorkdays(key, todayDay) : countWorkdays(key);
    monthKeys.push({ key, label: `Tháng ${m}`, workdays });
  }

  const startDate = monthKeys[0].key + '-01';

  const [testsRes, coursesRes, empsRes] = await Promise.all([
    supabase
      .from('daily_tests')
      .select('employee_id, test_date, score_percent, passed')
      .eq('status', 'submitted')
      .gte('test_date', startDate)
      .lte('test_date', todayStr),
    supabase
      .from('training_progress')
      .select('employee_id, quiz_score, quiz_passed, quiz_completed_at')
      .not('quiz_completed_at', 'is', null)
      .gte('quiz_completed_at', startDate),
    supabase
      .from('employees')
      .select('id, full_name, department, skip_daily_quiz')
      .eq('employment_status', 'active'),
  ]);

  const tests = testsRes.data || [];
  const courseTests = coursesRes.data || [];
  const employees = (empsRes.data || []).filter((e: any) => !e.skip_daily_quiz);

  type MonthBucket = { done: number; passed: number; scores: number[]; courseCount: number; coursePassed: number; courseScores: number[] };

  // Group daily tests by employee → month
  const byEmp = new Map<string, Map<string, MonthBucket>>();
  const initBucket = (): MonthBucket => ({ done: 0, passed: 0, scores: [], courseCount: 0, coursePassed: 0, courseScores: [] });

  for (const t of tests) {
    const mo = (t.test_date as string).slice(0, 7);
    if (!byEmp.has(t.employee_id)) byEmp.set(t.employee_id, new Map());
    const em = byEmp.get(t.employee_id)!;
    if (!em.has(mo)) em.set(mo, initBucket());
    const s = em.get(mo)!;
    s.done++;
    if (t.passed) s.passed++;
    if (t.score_percent != null) s.scores.push(Number(t.score_percent));
  }

  // Group course quiz results by employee → Vietnam month
  for (const p of courseTests) {
    if (!p.quiz_completed_at) continue;
    // Convert UTC timestamp → Vietnam date (UTC+7)
    const mo = new Date(new Date(p.quiz_completed_at).getTime() + 7 * 3600 * 1000)
      .toISOString().slice(0, 7);
    if (!byEmp.has(p.employee_id)) byEmp.set(p.employee_id, new Map());
    const em = byEmp.get(p.employee_id)!;
    if (!em.has(mo)) em.set(mo, initBucket());
    const s = em.get(mo)!;
    s.courseCount++;
    if (p.quiz_passed) s.coursePassed++;
    if (p.quiz_score != null) s.courseScores.push(Number(p.quiz_score));
  }

  const activities: EmployeeQuizActivity[] = employees.map((emp: any) => {
    const empTests = byEmp.get(emp.id);
    const months: MonthStat[] = monthKeys.map(({ key, label }) => {
      const s = empTests?.get(key) ?? initBucket();
      const allScores = [...s.scores, ...s.courseScores];
      const monthAvgScore = allScores.length
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : null;
      return {
        month: key,
        label,
        done: s.done,
        passed: s.passed,
        courseCount: s.courseCount,
        coursePassed: s.coursePassed,
        monthAvgScore,
        monthScorePassed: monthAvgScore != null && monthAvgScore >= 80,
      };
    });
    return {
      employeeId: emp.id,
      employeeName: emp.full_name || '—',
      department: emp.department || '—',
      months,
      totalDone: months.reduce((a, m) => a + m.done, 0),
      totalPassed: months.reduce((a, m) => a + m.passed, 0),
      totalCourseCount: months.reduce((a, m) => a + m.courseCount, 0),
      totalCoursePassed: months.reduce((a, m) => a + m.coursePassed, 0),
    };
  });

  activities.sort((a, b) =>
    a.department.localeCompare(b.department, 'vi') || b.totalDone - a.totalDone,
  );

  return { activities, monthLabels: monthKeys };
}
