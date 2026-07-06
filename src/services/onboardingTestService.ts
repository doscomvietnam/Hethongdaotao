import { supabase } from './supabaseClient';
import type { OnboardingTestSession, OnboardingTestResult, OnboardingTestAdminRow } from '../types';

const TOTAL_QUESTIONS = 30;
const PASS_THRESHOLD = 25;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleOptions(row: any): { options: string[]; correctOptionIndex: number } {
  const options = [row.option_a, row.option_b, row.option_c, row.option_d];
  const correctOptionIndex = ['A', 'B', 'C', 'D'].indexOf(row.correct_answer);
  return { options, correctOptionIndex };
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export type OnboardingAvailability =
  | { state: 'not_applicable' }           // nhân viên cũ, không có onboarding_available_date
  | { state: 'countdown'; availableDate: string; daysLeft: number }
  | { state: 'available' }
  | { state: 'done'; passed: boolean; correctCount: number; scorePercent: number };

export function getOnboardingAvailability(
  onboardingAvailableDate: string | null | undefined,
  testStatus?: string | null,
  passed?: boolean | null,
  correctCount?: number | null,
  scorePercent?: number | null,
): OnboardingAvailability {
  if (!onboardingAvailableDate) return { state: 'not_applicable' };

  if (testStatus === 'submitted') {
    return {
      state: 'done',
      passed: passed ?? false,
      correctCount: correctCount ?? 0,
      scorePercent: scorePercent ?? 0,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const available = new Date(onboardingAvailableDate);
  available.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((available.getTime() - today.getTime()) / 86400000);

  if (daysLeft > 0) {
    return { state: 'countdown', availableDate: onboardingAvailableDate, daysLeft };
  }
  return { state: 'available' };
}

// ─── Load / Create ────────────────────────────────────────────────────────────

async function loadSession(test: any): Promise<{ session: OnboardingTestSession | null; error?: string }> {
  const { data: qRows, error } = await supabase
    .from('onboarding_test_questions')
    .select('*')
    .eq('test_id', test.test_id)
    .order('position');

  if (error || !qRows) return { session: null, error: 'Không tải được câu hỏi.' };

  const questions = qRows.map((r: any) => ({
    id: r.id,
    position: r.position,
    questionId: r.question_id,
    questionText: r.question_text,
    options: r.options as string[],
    correctOptionIndex: r.correct_option_index,
    employeeAnswer: r.employee_answer ?? undefined,
    isCorrect: r.is_correct ?? undefined,
  }));

  return {
    session: {
      testId: test.test_id,
      employeeId: test.employee_id,
      status: test.status,
      totalQuestions: test.total_questions,
      passThreshold: test.pass_threshold,
      questions,
      correctCount: test.correct_count ?? undefined,
      scorePercent: test.score_percent ?? undefined,
      passed: test.passed ?? undefined,
      submittedAt: test.submitted_at ?? undefined,
      timeSeconds: test.time_seconds ?? undefined,
    },
  };
}

export async function getOrCreateOnboardingTest(
  employeeId: string,
): Promise<{ session: OnboardingTestSession | null; error?: string }> {
  // Kiểm tra đã tồn tại chưa
  const { data: existing } = await supabase
    .from('onboarding_tests')
    .select('*')
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (existing) return loadSession(existing);

  // Lấy câu hỏi ngẫu nhiên từ bank onboarding
  const { data: bank, error: bankErr } = await supabase
    .from('daily_questions')
    .select('*')
    .eq('bank_type', 'onboarding')
    .eq('is_active', true);

  if (bankErr || !bank) return { session: null, error: 'Không tải được ngân hàng câu hỏi onboarding.' };
  if (bank.length < TOTAL_QUESTIONS) {
    return {
      session: null,
      error: `Ngân hàng câu hỏi onboarding không đủ: cần ${TOTAL_QUESTIONS}, hiện có ${bank.length} câu.`,
    };
  }

  const selected = shuffle(bank).slice(0, TOTAL_QUESTIONS);

  // Insert test record
  const { data: testRow, error: testErr } = await supabase
    .from('onboarding_tests')
    .insert({
      employee_id: employeeId,
      total_questions: TOTAL_QUESTIONS,
      pass_threshold: PASS_THRESHOLD,
      status: 'pending',
    })
    .select()
    .maybeSingle();

  if (testErr || !testRow) {
    // Duplicate key → load lại
    if (testErr?.code === '23505') {
      const { data: fallback } = await supabase
        .from('onboarding_tests')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();
      if (fallback) return loadSession(fallback);
    }
    return { session: null, error: `Tạo bài kiểm tra thất bại: ${testErr?.message}` };
  }

  const qInserts = selected.map((row: any, idx: number) => {
    const { options, correctOptionIndex } = shuffleOptions(row);
    return {
      test_id: testRow.test_id,
      position: idx,
      question_id: row.question_id,
      question_text: row.question_text,
      options,
      correct_option_index: correctOptionIndex,
    };
  });

  const { error: qErr } = await supabase.from('onboarding_test_questions').insert(qInserts);
  if (qErr) {
    await supabase.from('onboarding_tests').delete().eq('test_id', testRow.test_id);
    return { session: null, error: `Lưu câu hỏi thất bại: ${qErr.message}` };
  }

  return loadSession(testRow);
}

// ─── Submit ───────────────────────────────────────────────────────────────────

export async function submitOnboardingTest(
  testId: string,
  answers: Record<number, number>,
  timeSeconds: number,
): Promise<{ result: OnboardingTestResult | null; error?: string }> {
  const { data: test } = await supabase
    .from('onboarding_tests')
    .select('*')
    .eq('test_id', testId)
    .maybeSingle();

  if (!test) return { result: null, error: 'Không tìm thấy bài kiểm tra.' };
  if (test.status === 'submitted') return { result: null, error: 'Bài đã nộp rồi.' };

  const { data: qRows } = await supabase
    .from('onboarding_test_questions')
    .select('*')
    .eq('test_id', testId)
    .order('position');

  if (!qRows) return { result: null, error: 'Không tải được câu hỏi.' };

  let correctCount = 0;
  const updates = qRows.map((q: any) => {
    const ans = answers[q.position] ?? -1;
    const isCorrect = ans === q.correct_option_index;
    if (isCorrect) correctCount++;
    return { id: q.id, employee_answer: ans, is_correct: isCorrect };
  });

  const total = test.total_questions;
  const scorePercent = Math.round((correctCount / total) * 100 * 100) / 100;
  const passed = correctCount >= test.pass_threshold;

  await Promise.all(
    updates.map(u =>
      supabase
        .from('onboarding_test_questions')
        .update({ employee_answer: u.employee_answer, is_correct: u.is_correct })
        .eq('id', u.id),
    ),
  );

  const { error: updateErr } = await supabase
    .from('onboarding_tests')
    .update({
      status: 'submitted',
      correct_count: correctCount,
      score_percent: scorePercent,
      passed,
      submitted_at: new Date().toISOString(),
      time_seconds: timeSeconds,
    })
    .eq('test_id', testId);

  if (updateErr) return { result: null, error: `Lưu kết quả thất bại: ${updateErr.message}` };

  return {
    result: { correctCount, totalQuestions: total, scorePercent, passed, passThreshold: test.pass_threshold },
  };
}

// ─── Admin: Report ────────────────────────────────────────────────────────────

export async function getOnboardingTestReport(): Promise<OnboardingTestAdminRow[]> {
  const [empsRes, testsRes] = await Promise.all([
    supabase
      .from('employees')
      .select('id, full_name, department, onboarding_available_date, skip_daily_quiz')
      .eq('employment_status', 'active')
      .order('department')
      .order('full_name'),
    supabase.from('onboarding_tests').select('*'),
  ]);

  const employees = (empsRes.data || []).filter((e: any) => !e.skip_daily_quiz);
  const testMap = new Map<string, any>();
  for (const t of testsRes.data || []) testMap.set(t.employee_id, t);

  return employees.map((emp: any) => {
    const t = testMap.get(emp.id);
    const base = {
      employeeId: emp.id,
      fullName: emp.full_name || '—',
      department: emp.department || '—',
      onboardingAvailableDate: emp.onboarding_available_date || null,
    };

    if (!emp.onboarding_available_date) {
      return { ...base, testId: null, status: 'not_applicable' as const };
    }
    if (!t) {
      return { ...base, testId: null, status: 'not_started' as const };
    }
    return {
      ...base,
      testId: t.test_id,
      status: t.status as 'pending' | 'submitted',
      passed: t.passed ?? undefined,
      scorePercent: t.score_percent ?? undefined,
      correctCount: t.correct_count ?? undefined,
      totalQuestions: t.total_questions,
      submittedAt: t.submitted_at ?? undefined,
      timeSeconds: t.time_seconds ?? undefined,
    };
  });
}

// ─── Admin: Reset ─────────────────────────────────────────────────────────────

export async function adminResetOnboardingTest(
  testId: string,
  adminEmployeeId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  // Reset câu trả lời về null
  await supabase
    .from('onboarding_test_questions')
    .update({ employee_answer: null, is_correct: null })
    .eq('test_id', testId);

  // Reset bài về pending
  const { error } = await supabase
    .from('onboarding_tests')
    .update({
      status: 'pending',
      correct_count: null,
      score_percent: null,
      passed: null,
      submitted_at: null,
      time_seconds: null,
    })
    .eq('test_id', testId);

  if (error) return { success: false, error: error.message };

  // Ghi log vào bảng daily_test_resets (dùng chung, đánh dấu test_id onboarding)
  await supabase.from('daily_test_resets').insert({
    test_id: testId,
    employee_id: (await supabase.from('onboarding_tests').select('employee_id').eq('test_id', testId).maybeSingle()).data?.employee_id,
    reset_by: adminEmployeeId,
    reset_reason: `[ONBOARDING] ${reason}`,
  }).then(() => {}); // fire and forget, không block

  return { success: true };
}
