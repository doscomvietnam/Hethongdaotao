import type { Course } from '../types';

/**
 * Các brand hiển thị dạng lộ trình (path) tuần tự — bài sau bị khóa cho tới khi
 * hoàn thành (xem hết video + nộp quiz) bài liền trước.
 */
export const SEQUENTIAL_PATH_BRANDS = ['Khóa học sale thực chiến', 'Khóa học CEO Ngô Minh Tuấn'];

export function extractLessonNumber(title: string): number {
  const m = title.match(/Bài\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : 0;
}

export function sortByLessonNumber(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => extractLessonNumber(a.title) - extractLessonNumber(b.title));
}

/** Bài "hiện tại" = bài chưa hoàn thành đầu tiên theo thứ tự Bài 1, 2, 3... */
export function findCurrentLessonId(courses: Course[]): string | null {
  const ordered = sortByLessonNumber(courses);
  const firstUnfinished = ordered.find((c) => !c.isCompleted);
  return firstUnfinished?.id ?? null;
}

/**
 * Tính tập courseId đang bị khóa trong các chuỗi lộ trình tuần tự (SEQUENTIAL_PATH_BRANDS):
 * mọi bài đứng SAU bài "hiện tại" (bài chưa hoàn thành đầu tiên) đều bị khóa.
 * Dùng chung cho cả UI hiển thị (SequentialLearningPath) và chặn truy cập (App.tsx).
 */
export function computeLockedLessonIds(courses: Course[]): Set<string> {
  const locked = new Set<string>();
  for (const brand of SEQUENTIAL_PATH_BRANDS) {
    const series = courses.filter((c) => c.brand === brand);
    if (!series.length) continue;
    const ordered = sortByLessonNumber(series);
    const currentId = findCurrentLessonId(series);
    const currentIndex = currentId ? ordered.findIndex((c) => c.id === currentId) : ordered.length;
    ordered.forEach((c, i) => {
      if (i > currentIndex) locked.add(c.id);
    });
  }
  return locked;
}
