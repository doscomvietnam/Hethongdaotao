export enum ViewType {
  DASHBOARD = 'dashboard',
  PRODUCT_LIBRARY = 'product-library',
  PRODUCT_DETAIL = 'product-detail',
  COURSE_CATALOG = 'course-catalog',
  COURSE_DETAIL = 'course-detail',
  QUIZ = 'quiz',
  REPORT = 'report',
  ADMIN = 'admin',
  PROFILE = 'profile',
  LOGIN = 'login',
  FORGOT_PASSWORD = 'forgot-password',
  RESET_PASSWORD = 'reset-password',
  GUIDE = 'guide',
  EXAM_HUB = 'exam-hub',
  EXAM_WHEEL = 'exam-wheel',
  DAILY_TEST = 'daily-test',
  ONBOARDING_TEST = 'onboarding-test',
  ATTENDANCE = 'attendance',
  MY_DASHBOARD = 'my-dashboard',
  BADGES = 'badges',
}

export type EmployeeRole = 'admin' | 'manager' | 'employee';

export interface Employee {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  role: EmployeeRole;
  department?: string;
  position?: string;
  phone?: string;
  avatar_url?: string;
  birth_date?: string;
  gender?: 'Nam' | 'Nữ';
  work_location?: string;
  start_date?: string;
  employment_status: 'active' | 'inactive';
  must_change_password: boolean;
  onboarding_available_date?: string | null;
  skip_daily_quiz?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OnboardingQuestion {
  id: string;
  position: number;
  questionId: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  employeeAnswer?: number;
  isCorrect?: boolean;
}

export interface OnboardingTestSession {
  testId: string;
  employeeId: string;
  status: 'pending' | 'submitted';
  totalQuestions: number;
  passThreshold: number;
  questions: OnboardingQuestion[];
  correctCount?: number;
  scorePercent?: number;
  passed?: boolean;
  submittedAt?: string;
  timeSeconds?: number;
}

export interface OnboardingTestResult {
  correctCount: number;
  totalQuestions: number;
  scorePercent: number;
  passed: boolean;
  passThreshold: number;
}

export type Brand = 'Tổng Quan Về Công Ty' | 'Đào Tạo Onboarding' | 'Nội Quy - Quy Chế' | 'Văn Hóa Công Ty' | 'Nội bộ' | 'Doscom' | 'Noma' | 'Claude' | 'Khóa học sale thực chiến';

export interface Product {
  id: string;
  code?: string;
  title: string;
  brand: Brand;
  category: string;
  thumbnail: string;
  shortDescription: string;
  features: string[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index 0-3 (A-D)
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  questions: QuizQuestion[];
  maxAttempts: number;
  passScore: number;
}

export interface Course {
  id: string;
  productId?: string;
  title: string;
  brand: string;
  category: string;
  department?: string; // null/undefined = tất cả phòng ban
  thumbnail: string;
  videoUrl: string;
  slideUrl?: string;
  progress: number;
  isCompleted: boolean;
  quizId?: string;
  attempts: number;
  lastQuizScore?: number;
  videoProgress?: number;
  videoDurationSeconds?: number;  // Thời lượng video (giây) — admin nhập, dùng tính % chính xác
  startDate?: string | null;  // ISO date string
  endDate?: string | null;    // ISO date string
}

export interface QuizAttempt {
  courseId: string;
  score: number;
  timestamp: number;
  passed: boolean;
}

// ─── Daily Knowledge Test ────────────────────────────────────────────────────

export interface DailyQuestion {
  id: string;             // daily_test_questions.id
  position: number;
  questionId: string;     // daily_questions.question_id
  bankType: 'noma_product' | 'general' | 'onboarding';
  questionText: string;
  options: string[];      // 4 options đã shuffle
  correctOptionIndex: number; // 0-3 sau shuffle
  employeeAnswer?: number;    // 0-3, set khi đã nộp
  isCorrect?: boolean;        // set khi đã nộp
}

export interface DailyTestSession {
  testId: string;
  employeeId: string;
  testDate: string;           // YYYY-MM-DD
  department: string;
  totalQuestions: number;
  passThreshold: number;
  status: 'pending' | 'submitted';
  questions: DailyQuestion[];
  correctCount?: number;
  scorePercent?: number;
  passed?: boolean;
  submittedAt?: string;
  timeSeconds?: number;
  resetCount: number;
}

export interface DailyTestResult {
  correctCount: number;
  totalQuestions: number;
  scorePercent: number;
  passed: boolean;
  passThreshold: number;
}

export interface DailyTestHistoryItem {
  testId: string;
  testDate: string;
  department: string;
  totalQuestions: number;
  passThreshold: number;
  correctCount: number;
  scorePercent: number;
  passed: boolean;
  submittedAt: string;
  timeSeconds: number;
}

export interface DailyTestAdminRow {
  employeeId: string;
  fullName: string;
  department: string;
  email: string;
  testDate: string;
  status: 'pending' | 'submitted' | 'not_created';
  passed?: boolean;
  scorePercent?: number;
  correctCount?: number;
  totalQuestions?: number;
  testId?: string;
  resetCount?: number;
}

export interface OnboardingTestAdminRow {
  employeeId: string;
  fullName: string;
  department: string;
  onboardingAvailableDate: string | null;
  testId: string | null;
  status: 'not_applicable' | 'not_started' | 'pending' | 'submitted';
  passed?: boolean;
  scorePercent?: number;
  correctCount?: number;
  totalQuestions?: number;
  submittedAt?: string;
  timeSeconds?: number;
}

