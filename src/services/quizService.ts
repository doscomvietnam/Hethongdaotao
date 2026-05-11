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

// ── Admin CRUD ──────────────────────────────────────────────────────────
export async function getAllQuizzesRaw(): Promise<any[]> {
    const { data, error } = await supabase.from("quizzes").select("*").order("quiz_id", { ascending: true });
    if (error) { console.error("Lỗi tải quizzes (admin):", error); throw error; }
    return Array.isArray(data) ? data : [];
}

export async function getAllQuestionsRaw(quizId?: string): Promise<any[]> {
    let q = supabase.from("quiz_questions").select("*").order("question_id", { ascending: true });
    if (quizId) q = q.eq("quiz_id", quizId);
    const { data, error } = await q;
    if (error) { console.error("Lỗi tải quiz_questions (admin):", error); throw error; }
    return Array.isArray(data) ? data : [];
}

export interface QuizInput {
    quiz_id: string;
    course_id?: string | null;
    quiz_title: string;
    pass_score?: string;
    max_attempts?: string;
    status?: string;
}

export async function createQuiz(input: QuizInput): Promise<void> {
    const payload = {
        ...input,
        course_id: input.course_id || null,
        pass_score: input.pass_score || "80",
        max_attempts: input.max_attempts || "1",
        status: input.status || "active",
    };
    const { data, error } = await supabase.from("quizzes").insert(payload).select();
    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('Không tạo được quiz — kiểm tra RLS policy INSERT cho bảng quizzes.');
    }
}

export async function updateQuiz(quizId: string, input: Partial<QuizInput>): Promise<void> {
    const { quiz_id: _ignore, ...rest } = input as any;
    const { data, error } = await supabase
        .from("quizzes")
        .update(rest)
        .eq("quiz_id", quizId)
        .select();
    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('Không có quiz nào được cập nhật — kiểm tra RLS policy UPDATE cho bảng quizzes.');
    }
}

export async function deleteQuiz(quizId: string): Promise<void> {
    const { data, error } = await supabase
        .from("quizzes")
        .delete()
        .eq("quiz_id", quizId)
        .select();
    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('Không xoá được — kiểm tra RLS policy DELETE cho bảng quizzes.');
    }
}

export interface QuestionInput {
    question_id: string;
    quiz_id: string;
    course_id?: string | null;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: 'A' | 'B' | 'C' | 'D';
    status?: string;
}

export async function createQuestion(input: QuestionInput): Promise<void> {
    const payload = { ...input, status: input.status || "active" };
    const { data, error } = await supabase.from("quiz_questions").insert(payload).select();
    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('Không tạo được câu hỏi — kiểm tra RLS policy INSERT cho bảng quiz_questions.');
    }
}

export async function updateQuestion(questionId: string, input: Partial<QuestionInput>): Promise<void> {
    const { question_id: _ignore, ...rest } = input as any;
    const { data, error } = await supabase
        .from("quiz_questions")
        .update(rest)
        .eq("question_id", questionId)
        .select();
    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('Không có câu hỏi nào được cập nhật — kiểm tra RLS policy UPDATE cho bảng quiz_questions.');
    }
}

export async function deleteQuestion(questionId: string): Promise<void> {
    const { data, error } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("question_id", questionId)
        .select();
    if (error) throw error;
    if (!data || data.length === 0) {
        throw new Error('Không xoá được — kiểm tra RLS policy DELETE cho bảng quiz_questions.');
    }
}