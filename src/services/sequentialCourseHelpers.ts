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
  return [...courses].sort((a, b) => {
    const d = extractLessonNumber(a.title) - extractLessonNumber(b.title);
    if (d !== 0) return d;
    // Cùng số Bài (Bài chia nhiều Phần) → giữ đúng thứ tự Phần theo mã khóa
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });
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
  // Mỗi CHUỖI tuần tự = 1 khóa nhỏ = (brand + category). Bộ CEO có nhiều khóa nhỏ (category),
  // mỗi khóa nhỏ khóa/mở dần độc lập. Sale chỉ 1 category nên vẫn là 1 chuỗi duy nhất.
  const groups = new Map<string, Course[]>();
  for (const c of courses) {
    if (!SEQUENTIAL_PATH_BRANDS.includes(c.brand)) continue;
    const key = `${c.brand}||${c.category || ''}`;
    const arr = groups.get(key);
    if (arr) arr.push(c); else groups.set(key, [c]);
  }
  for (const series of groups.values()) {
    const ordered = sortByLessonNumber(series);
    const currentId = findCurrentLessonId(series);
    const currentIndex = currentId ? ordered.findIndex((c) => c.id === currentId) : ordered.length;
    ordered.forEach((c, i) => {
      // Không khóa bài đã hoàn thành (để xem lại được kể cả khi thứ tự bị lệch do reset tiến độ)
      if (i > currentIndex && !c.isCompleted) locked.add(c.id);
    });
  }
  return locked;
}
