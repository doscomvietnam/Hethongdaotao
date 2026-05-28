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
    const { error } = await supabase.from("quizzes").insert(payload);
    if (error) throw error;
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
    const { error } = await supabase.from("quiz_questions").insert(payload);
    if (error) throw error;
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

// ── Re-score: tính lại điểm cho tất cả bài đã làm khi admin đổi đáp án ──
export interface RecomputeResult {
    quizId: string;
    courseId: string;
    affected: number;     // số bản ghi quiz_answers != null
    updated: number;      // số bản ghi quiz_score thay đổi
}

/**
 * Tính lại quiz_score + quiz_passed cho tất cả training_progress của course chứa
 * câu hỏi này, dựa trên đáp án đã lưu (quiz_answers) và đáp án đúng hiện tại.
 *
 * Chỉ áp dụng cho bài làm có quiz_answers (làm SAU khi feature này deploy).
 * Bài cũ (quiz_answers = null) sẽ được bỏ qua để giữ nguyên điểm gốc.
 */
export async function recomputeScoresForQuestion(questionId: string): Promise<RecomputeResult> {
    // 1. Lấy quiz_id của câu hỏi
    const { data: qRow, error: qErr } = await supabase
        .from("quiz_questions")
        .select("quiz_id")
        .eq("question_id", questionId)
        .single();
    if (qErr || !qRow?.quiz_id) throw qErr || new Error('Không tìm thấy quiz cho câu hỏi');
    const quizId = qRow.quiz_id;

    // 2. Lấy thông tin quiz (course_id, pass_score) + tất cả câu hỏi active của quiz
    const [quizRes, questionsRes] = await Promise.all([
        supabase.from("quizzes").select("course_id, pass_score").eq("quiz_id", quizId).single(),
        supabase.from("quiz_questions").select("question_id, correct_answer").eq("quiz_id", quizId).eq("status", "active"),
    ]);
    if (quizRes.error || !quizRes.data?.course_id) throw quizRes.error || new Error('Không tìm thấy course_id của quiz');
    if (questionsRes.error) throw questionsRes.error;

    const courseId = quizRes.data.course_id;
    const passScore = parseInt(quizRes.data.pass_score) || 80;
    const questions = questionsRes.data || [];
    if (questions.length === 0) {
        return { quizId, courseId, affected: 0, updated: 0 };
    }

    // Map: question_id → correct option index (0-3)
    const correctMap: Record<string, number> = {};
    for (const q of questions as any[]) {
        correctMap[q.question_id] = letterToIndex(q.correct_answer || 'A');
    }
    const totalQuestions = questions.length;

    // 3. Lấy mọi training_progress của course có quiz_answers
    const { data: rows, error: rowsErr } = await supabase
        .from("training_progress")
        .select("employee_id, course_id, quiz_score, quiz_answers")
        .eq("course_id", courseId)
        .not("quiz_answers", "is", null);
    if (rowsErr) throw rowsErr;

    const affected = rows?.length || 0;
    let updated = 0;

    // 4. Loop tính lại từng bản ghi
    for (const row of (rows || []) as any[]) {
        const userAnswers = (row.quiz_answers || {}) as Record<string, number>;
        let correctCount = 0;
        for (const qid of Object.keys(correctMap)) {
            if (userAnswers[qid] === correctMap[qid]) correctCount++;
        }
        const newScore = Math.round((correctCount / totalQuestions) * 100);
        const newPassed = newScore >= passScore;

        if (newScore === row.quiz_score) continue; // không đổi → skip update

        const { error: upErr } = await supabase
            .from("training_progress")
            .update({
                quiz_score: newScore,
                quiz_passed: newPassed,
                status: newPassed ? 'completed' : 'in_progress',
                updated_at: new Date().toISOString(),
            })
            .eq("employee_id", row.employee_id)
            .eq("course_id", row.course_id);
        if (upErr) {
            console.error(`Re-score failed for ${row.employee_id}/${row.course_id}:`, upErr);
            continue;
        }
        updated++;
    }

    return { quizId, courseId, affected, updated };
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