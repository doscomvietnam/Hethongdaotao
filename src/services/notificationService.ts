/**
 * Notification Service — đọc / mark read / xoá thông báo cho nhân viên
 * Dữ liệu lưu ở bảng notifications (xem courses-department-notifications-migration.sql)
 */
import { supabase } from './supabaseClient';

export interface NotificationItem {
  id: string;
  employee_id: string;
  type: string;
  title: string;
  message: string | null;
  link_view: string | null;
  link_id: string | null;
  is_read: boolean;
  created_at: string;
}

export async function getNotifications(employeeId: string, limit = 30): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('Lỗi tải notifications:', error); return []; }
  return (data as NotificationItem[]) || [];
}

export async function getUnreadCount(employeeId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', employeeId)
    .eq('is_read', false);
  if (error) { console.error('Lỗi đếm unread:', error); return 0; }
  return count || 0;
}

export async function markAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllAsRead(employeeId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('employee_id', employeeId)
    .eq('is_read', false);
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/**
 * Kiểm tra deadline khóa học cho 1 nhân viên.
 * - Nếu còn ≤ 2 ngày → thông báo "Sắp hết hạn"
 * - Nếu quá hạn → thông báo "Quá hạn đào tạo"
 * Deduplicate bằng type + link_id để không gửi trùng.
 */
export async function checkCourseDeadlines(employeeId: string, department?: string): Promise<void> {
  try {
    // 1. Lấy tất cả courses active có end_date
    let courseQuery = supabase.from('courses').select('course_id, course_name, end_date, department').eq('status', 'active').not('end_date', 'is', null);
    const { data: courses, error: courseErr } = await courseQuery;
    if (courseErr || !courses) return;

    // Lọc courses thuộc department của nhân viên (hoặc không giới hạn phòng ban)
    const relevantCourses = courses.filter((c: any) => !c.department || c.department === department);
    if (relevantCourses.length === 0) return;

    // 2. Lấy training_progress của nhân viên
    const { data: progressData } = await supabase
      .from('training_progress')
      .select('course_id, video_progress, is_completed')
      .eq('employee_id', employeeId);
    const progressMap = new Map<string, any>();
    for (const p of progressData || []) {
      progressMap.set((p as any).course_id, p);
    }

    // 3. Lấy notifications hiện có để deduplicate
    const { data: existingNotifs } = await supabase
      .from('notifications')
      .select('type, link_id')
      .eq('employee_id', employeeId)
      .in('type', ['course_deadline_warning', 'course_overdue']);
    const existingSet = new Set<string>();
    for (const n of existingNotifs || []) {
      existingSet.add(`${(n as any).type}::${(n as any).link_id}`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const notificationsToInsert: any[] = [];

    for (const course of relevantCourses) {
      const endDate = new Date(course.end_date);
      endDate.setHours(0, 0, 0, 0);
      const progress = progressMap.get(course.course_id);
      const isCompleted = progress?.is_completed === true;

      // Bỏ qua nếu đã hoàn thành
      if (isCompleted) continue;

      const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysLeft < 0) {
        // Quá hạn
        const key = `course_overdue::${course.course_id}`;
        if (!existingSet.has(key)) {
          notificationsToInsert.push({
            employee_id: employeeId,
            type: 'course_overdue',
            title: 'Quá hạn đào tạo',
            message: `Khóa học "${course.course_name}" đã quá hạn từ ${formatDate(course.end_date)}. Vui lòng hoàn thành ngay!`,
            link_view: 'course-detail',
            link_id: course.course_id,
          });
        }
      } else if (daysLeft <= 2) {
        // Sắp hết hạn (còn 0-2 ngày)
        const key = `course_deadline_warning::${course.course_id}`;
        if (!existingSet.has(key)) {
          notificationsToInsert.push({
            employee_id: employeeId,
            type: 'course_deadline_warning',
            title: 'Sắp hết hạn đào tạo',
            message: daysLeft === 0
              ? `Khóa học "${course.course_name}" hết hạn hôm nay!`
              : `Khóa học "${course.course_name}" còn ${daysLeft} ngày nữa là hết hạn (${formatDate(course.end_date)}).`,
            link_view: 'course-detail',
            link_id: course.course_id,
          });
        }
      }
    }

    if (notificationsToInsert.length > 0) {
      await supabase.from('notifications').insert(notificationsToInsert);
    }
  } catch (e) {
    console.warn('checkCourseDeadlines error:', e);
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}
