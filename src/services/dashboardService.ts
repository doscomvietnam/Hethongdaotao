import type { Course } from "../types";

export async function getDashboardSummary(courses: Course[] = []) {
    const totalCourses = courses.length;
    const completedCount = courses.filter((c) => c.isCompleted || c.progress === 100).length;
    const ongoingCount = courses.filter(
        (c) => !c.isCompleted && c.progress > 0 && c.progress < 100
    ).length;
    const overdueCount = 0;

    const completionRate =
        totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;

    return {
        totalCourses,
        completedCount,
        ongoingCount,
        overdueCount,
        completionRate,
    };
}