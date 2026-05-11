import type { Course } from "../types";
import { supabase } from "./supabaseClient";
import { convertGoogleDriveToDirectUrl, convertGoogleDriveToVideoEmbedUrl, convertGoogleDriveToDirectVideoUrl, convertGoogleDriveToSlideEmbedUrl } from "./mediaHelpers";

/**
 * Map dữ liệu từ Supabase row sang Course interface
 * Columns: course_id, product_id, course_name, course_type, brand, category,
 *          thumbnail_url, slide_url, video_url, quiz_id, is_required,
 *          pass_score, max_attempts, status
 */
function mapCourseRow(item: any): Course {
    return {
        id: item.course_id || "",
        productId: item.product_id || undefined,
        title: item.course_name || "",
        brand: item.brand || "",
        category: item.category || "",
        department: item.department || undefined,
        thumbnail: convertGoogleDriveToDirectUrl(item.thumbnail_url || ""),
        videoUrl: convertGoogleDriveToVideoEmbedUrl(item.video_url || ""),
        slideUrl: convertGoogleDriveToSlideEmbedUrl(item.slide_url || ""),
        progress: 0,
        isCompleted: false,
        quizId: item.quiz_id || undefined,
        attempts: 0,
        lastQuizScore: undefined,
        startDate: item.start_date || null,
        endDate: item.end_date || null,
    };
}

export async function getCourses(): Promise<Course[]> {
    const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("status", "active");

    if (error) {
        console.error("Lỗi tải courses:", error);
        throw error;
    }

    if (!Array.isArray(data)) {
        return [];
    }

    return data.map(mapCourseRow);
}

export async function getCourseById(id: string): Promise<Course | null> {
    const courses = await getCourses();
    return courses.find((item) => item.id === id) ?? null;
}

// ── Admin: full course rows (kể cả status != active) ─────────────────
export async function getAllCoursesRaw(): Promise<any[]> {
    const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("course_id", { ascending: true });
    if (error) { console.error("Lỗi tải courses (admin):", error); throw error; }
    return Array.isArray(data) ? data : [];
}

export interface CourseInput {
    course_id: string;
    course_name: string;
    brand: string;
    category: string;
    department?: string | null; // null = tất cả phòng ban
    course_type?: string;
    product_id?: string | null;
    thumbnail_url?: string | null;
    slide_url?: string | null;
    video_url?: string | null;
    quiz_id?: string | null;
    is_required?: string;
    pass_score?: string;
    max_attempts?: string;
    status?: string;
    start_date?: string | null; // ISO date (YYYY-MM-DD) hoặc null
    end_date?: string | null;   // ISO date (YYYY-MM-DD) hoặc null
}

export async function createCourse(input: CourseInput): Promise<void> {
    const payload = {
        course_id: input.course_id,
        course_name: input.course_name,
        brand: input.brand,
        category: input.category,
        department: input.department || null,
        course_type: input.course_type || "training",
        product_id: input.product_id || null,
        thumbnail_url: input.thumbnail_url || null,
        slide_url: input.slide_url || null,
        video_url: input.video_url || null,
        quiz_id: input.quiz_id || null,
        is_required: input.is_required || "no",
        pass_score: input.pass_score || "80",
        max_attempts: input.max_attempts || "1",
        status: input.status || "active",
        start_date: input.start_date || null,
        end_date: input.end_date || null,
    };
    const { error } = await supabase.from("courses").insert(payload);
    if (error) throw error;

    // Push notifications cho nhân viên thuộc phòng ban (hoặc toàn bộ nếu null)
    try {
        await notifyEmployeesAboutCourse(input.course_id, input.course_name, input.department || null);
    } catch (e) {
        console.warn('Không gửi được notifications:', e);
        // Không throw — course đã được tạo thành công
    }
}

/**
 * Insert notifications cho mọi nhân viên active thuộc phòng ban target.
 * Nếu department = null → gửi cho tất cả nhân viên active.
 */
async function notifyEmployeesAboutCourse(courseId: string, courseName: string, department: string | null) {
    let query = supabase.from('employees').select('id').eq('employment_status', 'active');
    if (department) query = query.eq('department', department);
    const { data: emps, error } = await query;
    if (error) throw error;
    if (!emps || emps.length === 0) return;

    const rows = emps.map((e: any) => ({
        employee_id: e.id,
        type: 'course_new',
        title: 'Khóa học mới',
        message: department
            ? `Phòng ${department} có khóa học mới: ${courseName}`
            : `Khóa học mới được mở: ${courseName}`,
        link_view: 'course-detail',
        link_id: courseId,
    }));

    const { error: insertErr } = await supabase.from('notifications').insert(rows);
    if (insertErr) throw insertErr;
}

/**
 * Lấy danh sách phòng ban distinct từ bảng employees để dùng trong dropdown
 */
export async function getDistinctDepartments(): Promise<string[]> {
    const { data, error } = await supabase
        .from('employees')
        .select('department')
        .eq('employment_status', 'active');
    if (error) { console.warn('Không lấy được phòng ban:', error); return []; }
    const set = new Set<string>();
    for (const row of data || []) {
        const d = (row as any).department;
        if (d && typeof d === 'string' && d.trim()) set.add(d.trim());
    }
    return Array.from(set).sort();
}

export async function updateCourse(courseId: string, input: Partial<CourseInput>): Promise<void> {
    const { course_id: _ignore, ...rest } = input as any;
    const { data, error } = await supabase
        .from("courses")
        .update(rest)
        .eq("course_id", courseId)
        .select();
    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('Không có khoá học nào được cập nhật — kiểm tra RLS policy UPDATE cho bảng courses.');
    }
}

export async function deleteCourse(courseId: string): Promise<void> {
    const { data, error } = await supabase
        .from("courses")
        .delete()
        .eq("course_id", courseId)
        .select();
    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('Không xoá được — kiểm tra RLS policy DELETE cho bảng courses.');
    }
}