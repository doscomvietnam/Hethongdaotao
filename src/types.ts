export enum ViewType {
  DASHBOARD = 'dashboard',
  PRODUCT_LIBRARY = 'product-library',
  PRODUCT_DETAIL = 'product-detail',
  COURSE_CATALOG = 'course-catalog',
  COURSE_DETAIL = 'course-detail',
  QUIZ = 'quiz',
  ADMIN = 'admin'
}

export type Brand = 'Doscom' | 'Noma' | 'Nội bộ';

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
  thumbnail: string;
  videoUrl: string;
  slideUrl?: string;
  progress: number;
  isCompleted: boolean;
  quizId?: string;
  attempts: number;
  lastQuizScore?: number;
  videoProgress?: number;
}

export interface QuizAttempt {
  courseId: string;
  score: number;
  timestamp: number;
  passed: boolean;
}
