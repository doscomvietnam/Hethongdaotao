import type { Quiz, QuizQuestion } from "../types";
import { supabase } from "./supabaseClient";

/**
 * Chuyển đáp án chữ cái (A/B/C/D) sang index số (0-3)
 */
function letterToIndex(letter: string): number {
    const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    return map[letter.toUpperCase()] ?? 0;
}

/**
 * Map dữ liệu quiz_questions từ Supabase sang QuizQuestion interface
 * Columns: question_id, quiz_id, course_id, question_text,
 *          option_a, option_b, option_c, option_d, correct_answer, status
 */
function mapQuestionRow(item: any): QuizQuestion {
    return {
        id: item.question_id || "",
        question: item.question_text || "",
        options: [
            item.option_a || "",
            item.option_b || "",
            item.option_c || "",
            item.option_d || "",
        ],
        correctAnswer: letterToIndex(item.correct_answer || "A"),
    };
}

/**
 * Lấy danh sách quiz từ bảng "quizzes", kèm câu hỏi từ bảng "quiz_questions"
 */
export async function getQuizzes(): Promise<Quiz[]> {
    const [quizRes, questionRes] = await Promise.all([
        supabase.from("quizzes").select("*").eq("status", "active"),
        supabase.from("quiz_questions").select("*").eq("status", "active"),
    ]);

    if (quizRes.error) {
        console.error("Lỗi tải quizzes:", quizRes.error);
        throw quizRes.error;
    }
    if (questionRes.error) {
        console.error("Lỗi tải quiz_questions:", questionRes.error);
        throw questionRes.error;
    }

    const quizData = quizRes.data;
    const questionData = questionRes.data;

    if (!Array.isArray(quizData)) return [];

    const questionsArray = Array.isArray(questionData) ? questionData : [];

    return quizData.map((q: any) => {
        const questions = questionsArray
            .filter((qq: any) => qq.quiz_id === q.quiz_id && qq.status === "active")
            .map(mapQuestionRow);

        return {
            id: q.quiz_id || "",
            courseId: q.course_id || "",
            title: q.quiz_title || "",
            questions,
            maxAttempts: parseInt(q.max_attempts) || 3,
            passScore: parseInt(q.pass_score) || 80,
        } as Quiz;
    });
}

export async function getQuizById(id: string): Promise<Quiz | null> {
    const quizzes = await getQuizzes();
    return quizzes.find((item) => item.id === id) ?? null;
}

export async function getQuizByCourseId(courseId: string): Promise<Quiz | null> {
    const quizzes = await getQuizzes();
    return quizzes.find((item) => item.courseId === courseId) ?? null;
}