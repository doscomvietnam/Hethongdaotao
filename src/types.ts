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
  employment_status: 'active' | 'inactive';
  must_change_password: boolean;
  created_at?: string;
  updated_at?: string;
}

export type Brand = 'Doscom' | 'Noma' | 'Nội bộ' | 'Claude';

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

