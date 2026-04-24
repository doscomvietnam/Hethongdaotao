import type { Course } from "../types";
import { supabase } from "./supabaseClient";
import { convertGoogleDriveToDirectUrl, convertGoogleDriveToVideoEmbedUrl, convertGoogleDriveToSlideEmbedUrl } from "./mediaHelpers";

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
        thumbnail: convertGoogleDriveToDirectUrl(item.thumbnail_url || ""),
        videoUrl: convertGoogleDriveToVideoEmbedUrl(item.video_url || ""),
        slideUrl: convertGoogleDriveToSlideEmbedUrl(item.slide_url || ""),
        progress: 0,
        isCompleted: false,
        quizId: item.quiz_id || undefined,
        attempts: 0,
        lastQuizScore: undefined,
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