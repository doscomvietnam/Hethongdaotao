import { supabase } from './supabaseClient';
import { SEQUENTIAL_PATH_BRANDS } from './sequentialCourseHelpers';

const SALE_PATH_BRAND = SEQUENTIAL_PATH_BRANDS[0]; // 'Khóa học sale thực chiến'

// ─── XP Constants ─────────────────────────────────────────────────────────────
const XP_CORRECT = 10;          // XP per correct answer in daily quiz
const XP_PERFECT = 30;          // bonus when score_percent = 100
const XP_COURSE = 1;            // quiz_score (0-100) × this = XP per course
const XP_ONBOARDING_PASS = 200;
const XP_ONBOARDING_TRY = 50;

// ─── Levels ───────────────────────────────────────────────────────────────────
export const LEVEL_DEFS = [
  { level: 1, label: 'Tân binh',   minXP: 0,     color: 'text-zinc-400',    bg: 'bg-zinc-500/10',    ring: 'ring-zinc-500/30',    barColor: 'bg-zinc-500'    },
  { level: 2, label: 'Học viên',   minXP: 500,   color: 'text-blue-400',    bg: 'bg-blue-500/10',    ring: 'ring-blue-500/30',    barColor: 'bg-blue-500'    },
  { level: 3, label: 'Tiến bộ',    minXP: 2000,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/30', barColor: 'bg-emerald-500' },
  { level: 4, label: 'Thành thạo', minXP: 5000,  color: 'text-amber-400',   bg: 'bg-amber-500/10',   ring: 'ring-amber-500/30',   barColor: 'bg-amber-500'   },
  { level: 5, label: 'Chuyên gia', minXP: 10000, color: 'text-orange-400',  bg: 'bg-orange-500/10',  ring: 'ring-orange-500/30',  barColor: 'bg-orange-500'  },
];

export interface LevelInfo {
  level: number;
  label: string;
  color: string;
  bg: string;
  ring: string;
  barColor: string;
  xpForNext: number | null;
  xpBase: number;
  progress: number;
}

export function getLevelInfo(totalXP: number): LevelInfo {
  let def = LEVEL_DEFS[0];
  for (const d of LEVEL_DEFS) {
    if (totalXP >= d.minXP) def = d;
  }
  const idx = LEVEL_DEFS.indexOf(def);
  const next = LEVEL_DEFS[idx + 1] ?? null;
  const xpForNext = next ? next.minXP : null;
  const xpBase = def.minXP;
  const progress = xpForNext
    ? Math.min(100, Math.round(((totalXP - xpBase) / (xpForNext - xpBase)) * 100))
    : 100;
  return { ...def, xpForNext, xpBase, progress };
}

// ─── Badges ───────────────────────────────────────────────────────────────────
export interface BadgeDef {
  id: string;
  icon: string;
  label: string;
  desc: string;
}

export interface EarnedBadge extends BadgeDef {
  earned: boolean;
}

// Chứng nhận hoàn thành khóa nhỏ: đạt bài kiểm tra "hộp quà" cuối lộ trình.
// Thêm khóa nhỏ mới có kiểm tra → thêm 1 dòng ở đây (badgeId bắt đầu bằng "cert_").
export const CHEST_CERTIFICATES: {
  courseId: string; badgeId: string; minScore: number; courseName: string; badgeLabel: string;
}[] = [
  {
    courseId: 'C_CEO_TG_03',
    badgeId: 'cert_ceo_business_system',
    minScore: 80,
    courseName: 'Các bước triển khai hệ thống kinh doanh chuyên nghiệp và hiệu quả',
    badgeLabel: 'Chứng nhận: Triển khai HTKD',
  },
  {
    courseId: 'C_CEO_KN_B7',
    badgeId: 'cert_ceo_startup',
    minScore: 80,
    courseName: 'Để Khởi Nghiệp Thành Công',
    badgeLabel: 'Chứng nhận: Khởi nghiệp thành công',
  },
];

// Tra chứng nhận theo courseId (dùng khi mở giấy chứng nhận lúc đạt quiz)
export function getCertificateForCourse(courseId: string) {
  return CHEST_CERTIFICATES.find((c) => c.courseId === courseId) || null;
}

export const BADGE_DEFS: BadgeDef[] = [
  { id: 'streak_3',     icon: '🔥', label: '3 ngày lửa',          desc: 'Làm quiz 3 ngày liên tiếp' },
  { id: 'streak_7',     icon: '⚡', label: '7 ngày sấm sét',       desc: 'Làm quiz 7 ngày liên tiếp' },
  { id: 'streak_30',    icon: '🌟', label: '30 ngày huyền thoại',  desc: 'Làm quiz 30 ngày liên tiếp không nghỉ' },
  { id: 'perfect_quiz', icon: '💯', label: 'Điểm tuyệt đối',       desc: 'Đạt 100% trong ít nhất một bài quiz hàng ngày' },
  { id: 'first_course', icon: '📚', label: 'Học viên',             desc: 'Hoàn thành quiz khóa học đầu tiên' },
  { id: 'five_courses', icon: '🎯', label: 'Siêng năng',           desc: 'Hoàn thành quiz 5 khóa học' },
  { id: 'path_sale',    icon: '🏅', label: 'Chinh phục Sale thực chiến', desc: 'Hoàn thành cả lộ trình Sale thực chiến' },
  { id: 'onboarding',   icon: '🎓', label: 'Nhân viên chính thức', desc: 'Vượt qua bài kiểm tra onboarding' },
  { id: 'xp_1000',      icon: '⭐', label: '1,000 XP',             desc: 'Tích lũy 1,000 XP' },
  { id: 'xp_5000',      icon: '🏆', label: '5,000 XP',             desc: 'Tích lũy 5,000 XP' },
  ...CHEST_CERTIFICATES.map((c) => ({
    id: c.badgeId, icon: '📜', label: c.badgeLabel,
    desc: `Đạt bài kiểm tra cuối khóa ${c.courseName}`,
  })),
];

interface BadgeStats {
  streak: number;
  hasPerfectQuiz: boolean;
  coursesCompleted: number;
  passedOnboarding: boolean;
  totalXP: number;
  salePathComplete?: boolean;
  certificateBadgeIds?: Set<string>;   // các huy hiệu chứng nhận đã đạt
}

function computeBadges(stats: BadgeStats): EarnedBadge[] {
  return BADGE_DEFS.map(def => {
    let earned = false;
    switch (def.id) {
      case 'streak_3':     earned = stats.streak >= 3; break;
      case 'streak_7':     earned = stats.streak >= 7; break;
      case 'streak_30':    earned = stats.streak >= 30; break;
      case 'perfect_quiz': earned = stats.hasPerfectQuiz; break;
      case 'first_course': earned = stats.coursesCompleted >= 1; break;
      case 'five_courses': earned = stats.coursesCompleted >= 5; break;
      case 'path_sale':    earned = stats.salePathComplete === true; break;
      case 'onboarding':   earned = stats.passedOnboarding; break;
      case 'xp_1000':      earned = stats.totalXP >= 1000; break;
      case 'xp_5000':      earned = stats.totalXP >= 5000; break;
      default:             earned = stats.certificateBadgeIds?.has(def.id) ?? false; break;
    }
    return { ...def, earned };
  });
}

// Dùng local date (không dùng toISOString vì sẽ bị UTC lệch múi giờ +7)
function localDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Đếm streak: số ngày liên tiếp có nộp bài, bỏ qua Chủ nhật
function calcStreak(dates: Set<string>, todayVN: string): number {
  const cur = new Date(todayVN + 'T00:00:00');
  if (!dates.has(todayVN)) {
    cur.setDate(cur.getDate() - 1); // chưa làm hôm nay → bắt đầu từ hôm qua
  }
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const dow = cur.getDay();
    const dateStr = localDateStr(cur); // local date, không dùng toISOString
    if (dow === 0) {
      cur.setDate(cur.getDate() - 1);
      continue;
    }
    if (dates.has(dateStr)) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ─── Single employee ──────────────────────────────────────────────────────────

export interface EmployeeGamificationData {
  totalXP: number;
  monthXP: number;
  streak: number;
  level: LevelInfo;
  badges: EarnedBadge[];
  passedOnboarding: boolean;
  coursesCompleted: number;
  hasPerfectQuiz: boolean;
  certificates: { badgeId: string; courseName: string; score: number; date: string }[];
}

export async function getEmployeeGamificationData(employeeId: string): Promise<EmployeeGamificationData> {
  const todayVN = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const currentYM = todayVN.slice(0, 7);
  const monthStart = currentYM + '-01';

  const [dailyRes, courseRes, onboardingRes, saleRes] = await Promise.all([
    supabase.from('daily_tests').select('test_date, correct_count, score_percent').eq('employee_id', employeeId).eq('status', 'submitted'),
    supabase.from('training_progress').select('quiz_score, quiz_completed_at, video_progress, course_id').eq('employee_id', employeeId).not('quiz_score', 'is', null),
    supabase.from('onboarding_tests').select('passed, correct_count, status').eq('employee_id', employeeId).maybeSingle(),
    supabase.from('courses').select('course_id').eq('brand', SALE_PATH_BRAND).eq('status', 'active'),
  ]);

  const dailyRows = dailyRes.data || [];
  const courseRows = courseRes.data || [];
  const onboarding = onboardingRes.data;

  // Huy hiệu lộ trình: hoàn thành đủ TẤT CẢ khóa Sale thực chiến.
  // "Hoàn thành" = xem hết video (>=100%) VÀ đã nộp quiz — khớp đúng Course.isCompleted mà lộ trình/App dùng
  // (không chỉ dựa vào việc đã nộp quiz), để huy hiệu và rương/màn chúc mừng mở cùng lúc.
  const completedCourseIds = new Set(
    courseRows
      .filter((r: any) => (r.video_progress ?? 0) >= 100 && r.quiz_completed_at)
      .map((r: any) => r.course_id)
      .filter(Boolean),
  );
  const saleCourseIds = (saleRes.data || []).map((r: any) => r.course_id);
  const salePathComplete = saleCourseIds.length > 0 && saleCourseIds.every((id: string) => completedCourseIds.has(id));

  const dateSet = new Set<string>();
  let dailyXP = 0;
  let monthDailyXP = 0;
  let hasPerfectQuiz = false;

  for (const r of dailyRows) {
    const dateStr = (r.test_date as string).slice(0, 10);
    dateSet.add(dateStr);
    const xp = (r.correct_count ?? 0) * XP_CORRECT + ((r.score_percent ?? 0) >= 100 ? XP_PERFECT : 0);
    dailyXP += xp;
    if ((r.score_percent ?? 0) >= 100) hasPerfectQuiz = true;
    if (dateStr >= monthStart) monthDailyXP += xp;
  }

  let courseXP = 0;
  let monthCourseXP = 0;
  let coursesCompleted = 0;

  for (const r of courseRows) {
    const xp = Math.round((r.quiz_score ?? 0) * XP_COURSE);
    courseXP += xp;
    coursesCompleted++;
    if (r.quiz_completed_at && (r.quiz_completed_at as string).startsWith(currentYM)) {
      monthCourseXP += xp;
    }
  }

  let onboardingXP = 0;
  let passedOnboarding = false;
  if (onboarding) {
    const effective = onboarding.status === 'submitted' || (onboarding.status === 'pending' && onboarding.correct_count != null);
    if (effective) {
      if (onboarding.passed) { onboardingXP = XP_ONBOARDING_PASS; passedOnboarding = true; }
      else onboardingXP = XP_ONBOARDING_TRY;
    }
  }

  const totalXP = dailyXP + courseXP + onboardingXP;
  const monthXP = monthDailyXP + monthCourseXP;
  const streak = calcStreak(dateSet, todayVN);
  const level = getLevelInfo(totalXP);
  // Chứng nhận khóa nhỏ: đạt bài kiểm tra "hộp quà" (quiz_score >= ngưỡng của khóa đó)
  const certificateBadgeIds = new Set<string>();
  const certificates: EmployeeGamificationData['certificates'] = [];
  for (const cert of CHEST_CERTIFICATES) {
    const row: any = courseRows.find((r: any) => r.course_id === cert.courseId && (r.quiz_score ?? 0) >= cert.minScore);
    if (row) {
      certificateBadgeIds.add(cert.badgeId);
      certificates.push({
        badgeId: cert.badgeId,
        courseName: cert.courseName,
        score: Math.round(row.quiz_score ?? 0),
        date: row.quiz_completed_at ? new Date(row.quiz_completed_at).toLocaleDateString('vi-VN') : '',
      });
    }
  }

  const badges = computeBadges({ streak, hasPerfectQuiz, coursesCompleted, passedOnboarding, totalXP, salePathComplete, certificateBadgeIds });

  return { totalXP, monthXP, streak, level, badges, passedOnboarding, coursesCompleted, hasPerfectQuiz, certificates };
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  employeeId: string;
  fullName: string;
  department: string;
  totalXP: number;
  monthXP: number;
  streak: number;
  level: number;
  levelLabel: string;
  levelColor: string;
  barColor: string;
  earnedBadgeCount: number;
  rank: number;
}

export async function getLeaderboard(): Promise<{ monthly: LeaderboardEntry[]; allTime: LeaderboardEntry[] }> {
  const todayVN = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const currentYM = todayVN.slice(0, 7);
  const monthStart = currentYM + '-01';

  const [empsRes, dailyRes, courseRes, onboardingRes] = await Promise.all([
    supabase.from('employees').select('id, full_name, department').eq('employment_status', 'active').order('full_name'),
    supabase.from('daily_tests').select('employee_id, test_date, correct_count, score_percent').eq('status', 'submitted'),
    supabase.from('training_progress').select('employee_id, quiz_score, quiz_completed_at').not('quiz_score', 'is', null),
    supabase.from('onboarding_tests').select('employee_id, passed, correct_count, status'),
  ]);

  const employees = empsRes.data || [];
  const allDaily = dailyRes.data || [];
  const allCourses = courseRes.data || [];
  const allOnboarding = onboardingRes.data || [];

  // Group by employee
  const dailyByEmp = new Map<string, typeof allDaily>();
  for (const r of allDaily) {
    const arr = dailyByEmp.get(r.employee_id) ?? [];
    arr.push(r);
    dailyByEmp.set(r.employee_id, arr);
  }
  const coursesByEmp = new Map<string, typeof allCourses>();
  for (const r of allCourses) {
    const arr = coursesByEmp.get(r.employee_id) ?? [];
    arr.push(r);
    coursesByEmp.set(r.employee_id, arr);
  }
  const onboardingByEmp = new Map<string, any>();
  for (const r of allOnboarding) onboardingByEmp.set(r.employee_id, r);

  const entries = employees.map((emp: any) => {
    const daily = dailyByEmp.get(emp.id) ?? [];
    const courses = coursesByEmp.get(emp.id) ?? [];
    const onboarding = onboardingByEmp.get(emp.id);

    const dateSet = new Set<string>();
    let totalDailyXP = 0;
    let monthDailyXP = 0;
    let hasPerfect = false;

    for (const r of daily) {
      const dateStr = (r.test_date as string).slice(0, 10);
      dateSet.add(dateStr);
      const xp = (r.correct_count ?? 0) * XP_CORRECT + ((r.score_percent ?? 0) >= 100 ? XP_PERFECT : 0);
      totalDailyXP += xp;
      if ((r.score_percent ?? 0) >= 100) hasPerfect = true;
      if (dateStr >= monthStart) monthDailyXP += xp;
    }

    let totalCourseXP = 0;
    let monthCourseXP = 0;
    let coursesCompleted = 0;
    for (const r of courses) {
      const xp = Math.round((r.quiz_score ?? 0) * XP_COURSE);
      totalCourseXP += xp;
      coursesCompleted++;
      if (r.quiz_completed_at && (r.quiz_completed_at as string).startsWith(currentYM)) monthCourseXP += xp;
    }

    let onboardingXP = 0;
    let passedOnboarding = false;
    if (onboarding) {
      const effective = onboarding.status === 'submitted' || (onboarding.status === 'pending' && onboarding.correct_count != null);
      if (effective) {
        if (onboarding.passed) { onboardingXP = XP_ONBOARDING_PASS; passedOnboarding = true; }
        else onboardingXP = XP_ONBOARDING_TRY;
      }
    }

    const totalXP = totalDailyXP + totalCourseXP + onboardingXP;
    const monthXP = monthDailyXP + monthCourseXP;
    const streak = calcStreak(dateSet, todayVN);
    const li = getLevelInfo(totalXP);
    const badges = computeBadges({ streak, hasPerfectQuiz: hasPerfect, coursesCompleted, passedOnboarding, totalXP });

    return {
      employeeId: emp.id,
      fullName: emp.full_name || '—',
      department: emp.department || '—',
      totalXP,
      monthXP,
      streak,
      level: li.level,
      levelLabel: li.label,
      levelColor: li.color,
      barColor: li.barColor,
      earnedBadgeCount: badges.filter(b => b.earned).length,
      rank: 0,
    };
  });

  const monthly = [...entries]
    .sort((a, b) => b.monthXP - a.monthXP || b.totalXP - a.totalXP)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  const allTime = [...entries]
    .sort((a, b) => b.totalXP - a.totalXP || b.monthXP - a.monthXP)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  return { monthly, allTime };
}
