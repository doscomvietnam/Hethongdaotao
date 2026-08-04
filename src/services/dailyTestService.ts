/**
 * Daily Knowledge Test Service
 *
 * Quy tắc:
 * - Marketing/Kinh doanh: 10 câu sản phẩm Noma (quiz_questions) + 5 câu nội quy (daily_questions bank=general) = 15 câu, đạt >= 12
 * - Còn lại: 10 câu từ ngân hàng onboarding = 10 câu, đạt >= 8
 * - Mỗi nhân viên 1 bài/ngày (key: employee_id + test_date theo Asia/Ho_Chi_Minh)
 * - Snapshot câu hỏi lưu ngay khi tạo, không random lại khi refresh
 * - Ưu tiên không lặp câu trong 3 ngày gần nhất (soft constraint)
 */
import { supabase } from './supabaseClient';
import type {
  DailyQuestion,
  DailyTestSession,
  DailyTestResult,
  DailyTestHistoryItem,
  DailyTestAdminRow,
} from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const SALES_MARKETING_KEYWORDS = ['kinh doanh', 'marketing'];

interface DeptConfig {
  nomaCount: number;
  generalCount: number;
  totalQuestions: number;
  passThreshold: number;
  quizDurationSeconds: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getTodayVNDateStr(): string {
  const vnNow = new Date(Date.now() + VN_OFFSET_MS);
  return vnNow.toISOString().slice(0, 10);
}

function isSalesMarketing(department: string): boolean {
  const d = department.toLowerCase();
  return SALES_MARKETING_KEYWORDS.some(k => d.includes(k));
}

export function getDeptConfig(department: string): DeptConfig {
  if (isSalesMarketing(department)) {
    return { nomaCount: 10, generalCount: 5, totalQuestions: 15, passThreshold: 12, quizDurationSeconds: 900 };
  }
  return { nomaCount: 0, generalCount: 10, totalQuestions: 10, passThreshold: 8, quizDurationSeconds: 600 };
}

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

// ─── Question Selection ───────────────────────────────────────────────────────

async function getRecentUsedQuestionIds(
  employeeId: string,
  bankType: 'noma_product' | 'general' | 'onboarding',
  days = 3,
): Promise<string[]> {
  const since = new Date(Date.now() + VN_OFFSET_MS);
  since.setUTCDate(since.getUTCDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: tests } = await supabase
    .from('daily_tests')
    .select('test_id')
    .eq('employee_id', employeeId)
    .gte('test_date', sinceStr)
    .lt('test_date', getTodayVNDateStr());

  if (!tests?.length) return [];
  const testIds = tests.map((r: any) => r.test_id);

  const { data: qRows } = await supabase
    .from('daily_test_questions')
    .select('question_id')
    .in('test_id', testIds)
    .eq('bank_type', bankType);

  return (qRows || []).map((r: any) => r.question_id);
}

async function selectGeneralQuestions(count: number, excludeIds: string[]): Promise<any[]> {
  const { data, error } = await supabase
    .from('daily_questions')
    .select('*')
    .eq('bank_type', 'onboarding')
    .eq('is_active', true);

  if (error || !data) throw new Error(`Không thể tải câu hỏi: ${error?.message}`);
  if (data.length < count) {
    throw new Error(`Ngân hàng câu hỏi không đủ: cần ${count}, có ${data.length}`);
  }

  const fresh = data.filter((q: any) => !excludeIds.includes(q.question_id));
  const used  = data.filter((q: any) =>  excludeIds.includes(q.question_id));
  const pool  = fresh.length >= count
    ? shuffle(fresh).slice(0, count)
    : [...shuffle(fresh), ...shuffle(used)].slice(0, count);

  return pool;
}

// Khóa học Noma chưa được MỞ vào bài kiểm tra hàng ngày — admin sẽ bảo khi nào mở.
// (Đã mở toàn bộ 9 sản phẩm NOMA mới — trộn chung câu hỏi vào bài kiểm tra hàng ngày.)
const NOT_YET_OPENED_DAILY_TEST_COURSE_IDS: string[] = [];

// 10 câu sản phẩm Noma random từ quiz_questions
async function selectNomaProductQuestions(count: number, excludeIds: string[]): Promise<any[]> {
  const { data: nomaCourses } = await supabase
    .from('courses')
    .select('quiz_id, course_id')
    .eq('brand', 'Noma')
    .not('quiz_id', 'is', null);

  const eligibleCourses = (nomaCourses || []).filter(
    (c: any) => !NOT_YET_OPENED_DAILY_TEST_COURSE_IDS.includes(c.course_id),
  );

  if (!eligibleCourses.length) throw new Error('Không tìm thấy khóa học Noma.');
  const quizIds = eligibleCourses.map((c: any) => c.quiz_id);

  const { data, error } = await supabase
    .from('quiz_questions')
    .select('*')
    .in('quiz_id', quizIds)
    .eq('status', 'active');

  if (error || !data) throw new Error(`Không thể tải câu hỏi sản phẩm Noma: ${error?.message}`);
  if (data.length < count) throw new Error(`Ngân hàng câu hỏi Noma không đủ: cần ${count}, có ${data.length}`);

  const fresh = data.filter((q: any) => !excludeIds.includes(q.question_id));
  const used  = data.filter((q: any) =>  excludeIds.includes(q.question_id));
  const pool  = fresh.length >= count
    ? shuffle(fresh).slice(0, count)
    : [...shuffle(fresh), ...shuffle(used)].slice(0, count);

  return pool.map((q: any) => ({ ...q, bank_type: 'noma_product' }));
}

// 5 câu nội quy quy chế từ daily_questions bank=general
async function selectNormsQuestions(count: number, excludeIds: string[]): Promise<any[]> {
  const { data, error } = await supabase
    .from('daily_questions')
    .select('*')
    .eq('bank_type', 'general')
    .eq('is_active', true);

  if (error || !data) throw new Error(`Không thể tải câu hỏi nội quy: ${error?.message}`);
  if (data.length < count) throw new Error(`Ngân hàng câu hỏi nội quy không đủ: cần ${count}, có ${data.length}`);

  const fresh = data.filter((q: any) => !excludeIds.includes(q.question_id));
  const used  = data.filter((q: any) =>  excludeIds.includes(q.question_id));
  const pool  = fresh.length >= count
    ? shuffle(fresh).slice(0, count)
    : [...shuffle(fresh), ...shuffle(used)].slice(0, count);

  return pool;
}

// ─── Core: Get or Create ──────────────────────────────────────────────────────

export async function getOrCreateDailyTest(
  employeeId: string,
  department: string,
): Promise<{ session: DailyTestSession | null; error?: string }> {
  const testDate = getTodayVNDateStr();

  // Kiểm tra đã tồn tại chưa (maybeSingle: trả null khi 0 rows, không throw error)
  const { data: existing } = await supabase
    .from('daily_tests')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('test_date', testDate)
    .maybeSingle();

  if (existing) {
    return loadTestSession(existing);
  }

  // Tạo mới
  return createNewTest(employeeId, department, testDate);
}

async function loadTestSession(
  test: any,
): Promise<{ session: DailyTestSession | null; error?: string }> {
  const { data: qRows, error } = await supabase
    .from('daily_test_questions')
    .select('*')
    .eq('test_id', test.test_id)
    .order('position');

  if (error || !qRows) {
    return { session: null, error: 'Không tải được câu hỏi bài kiểm tra.' };
  }

  const questions: DailyQuestion[] = qRows.map((r: any) => ({
    id: r.id,
    position: r.position,
    questionId: r.question_id,
    bankType: r.bank_type,
    questionText: r.question_text,
    options: r.options as string[],
    correctOptionIndex: r.correct_option_index,
    employeeAnswer: r.employee_answer ?? undefined,
    isCorrect: r.is_correct ?? undefined,
  }));

  const session: DailyTestSession = {
    testId: test.test_id,
    employeeId: test.employee_id,
    testDate: test.test_date,
    department: test.department,
    totalQuestions: test.total_questions,
    passThreshold: test.pass_threshold,
    status: test.status,
    questions,
    correctCount: test.correct_count ?? undefined,
    scorePercent: test.score_percent ?? undefined,
    passed: test.passed ?? undefined,
    submittedAt: test.submitted_at ?? undefined,
    timeSeconds: test.time_seconds ?? undefined,
    resetCount: test.reset_count ?? 0,
  };

  return { session };
}

async function createNewTest(
  employeeId: string,
  department: string,
  testDate: string,
): Promise<{ session: DailyTestSession | null; error?: string }> {
  const config = getDeptConfig(department);

  try {
    let allRows: any[];

    if (config.nomaCount > 0) {
      // Marketing / Kinh doanh: 10 câu sản phẩm Noma + 5 câu nội quy general
      const [recentNoma, recentNorms] = await Promise.all([
        getRecentUsedQuestionIds(employeeId, 'noma_product'),
        getRecentUsedQuestionIds(employeeId, 'general'),
      ]);
      const [nomaRows, normsRows] = await Promise.all([
        selectNomaProductQuestions(config.nomaCount, recentNoma),
        selectNormsQuestions(config.generalCount, recentNorms),
      ]);
      allRows = shuffle([...nomaRows, ...normsRows]);
    } else {
      // Các phòng khác: 10 câu onboarding
      const recentOnboarding = await getRecentUsedQuestionIds(employeeId, 'onboarding');
      const onboardingRows = await selectGeneralQuestions(config.generalCount, recentOnboarding);
      allRows = shuffle(onboardingRows);
    }

    // Insert bài kiểm tra
    const { data: testRow, error: testErr } = await supabase
      .from('daily_tests')
      .insert({
        employee_id: employeeId,
        test_date: testDate,
        department,
        total_questions: config.totalQuestions,
        pass_threshold: config.passThreshold,
        status: 'pending',
      })
      .select()
      .maybeSingle();

    if (testErr || !testRow) {
      // Nếu lỗi duplicate key → bài đã tồn tại, load lại thay vì báo lỗi
      if (testErr?.code === '23505') {
        const { data: fallback } = await supabase
          .from('daily_tests')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('test_date', testDate)
          .maybeSingle();
        if (fallback) return loadTestSession(fallback);
      }
      return { session: null, error: `Tạo bài kiểm tra thất bại: ${testErr?.message}` };
    }

    // Insert snapshot câu hỏi
    const qInserts = allRows.map((row: any, idx: number) => {
      const { options, correctOptionIndex } = shuffleOptions(row);
      return {
        test_id: testRow.test_id,
        position: idx,
        question_id: row.question_id,
        bank_type: row.bank_type,
        question_text: row.question_text,
        options,
        correct_option_index: correctOptionIndex,
      };
    });

    const { error: qErr } = await supabase.from('daily_test_questions').insert(qInserts);
    if (qErr) {
      // Rollback: xóa bài kiểm tra vừa tạo
      await supabase.from('daily_tests').delete().eq('test_id', testRow.test_id);
      return { session: null, error: `Lưu câu hỏi thất bại: ${qErr.message}` };
    }

    return loadTestSession(testRow);
  } catch (err: any) {
    return { session: null, error: err.message || 'Lỗi tạo bài kiểm tra.' };
  }
}

// ─── Submit ───────────────────────────────────────────────────────────────────

export async function submitDailyTest(
  testId: string,
  answers: Record<number, number>, // position -> optionIndex (0-3)
  timeSeconds: number,
): Promise<{ result: DailyTestResult | null; error?: string }> {
  // Lấy bài + câu hỏi
  const { data: test } = await supabase
    .from('daily_tests')
    .select('*')
    .eq('test_id', testId)
    .maybeSingle();

  if (!test) return { result: null, error: 'Không tìm thấy bài kiểm tra.' };
  if (test.status === 'submitted') return { result: null, error: 'Bài đã nộp rồi.' };

  const { data: qRows } = await supabase
    .from('daily_test_questions')
    .select('*')
    .eq('test_id', testId)
    .order('position');

  if (!qRows) return { result: null, error: 'Không tải được câu hỏi.' };

  // Tính điểm
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

  // Cập nhật từng câu hỏi
  await Promise.all(
    updates.map(u =>
      supabase
        .from('daily_test_questions')
        .update({ employee_answer: u.employee_answer, is_correct: u.is_correct })
        .eq('id', u.id),
    ),
  );

  // Cập nhật bài kiểm tra
  const { error: updateErr } = await supabase
    .from('daily_tests')
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
    result: {
      correctCount,
      totalQuestions: total,
      scorePercent,
      passed,
      passThreshold: test.pass_threshold,
    },
  };
}

// ─── History ─────────────────────────────────────────────────────────────────

export async function getDailyTestHistory(
  employeeId: string,
  limit = 30,
): Promise<DailyTestHistoryItem[]> {
  const { data } = await supabase
    .from('daily_tests')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('status', 'submitted')
    .order('test_date', { ascending: false })
    .limit(limit);

  return (data || []).map((r: any) => ({
    testId: r.test_id,
    testDate: r.test_date,
    department: r.department,
    totalQuestions: r.total_questions,
    passThreshold: r.pass_threshold,
    correctCount: r.correct_count,
    scorePercent: r.score_percent,
    passed: r.passed,
    submittedAt: r.submitted_at,
    timeSeconds: r.time_seconds,
  }));
}

// ─── Admin: Reset ─────────────────────────────────────────────────────────────

export async function adminResetDailyTest(
  testId: string,
  adminEmployeeId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: test } = await supabase
    .from('daily_tests')
    .select('employee_id, reset_count')
    .eq('test_id', testId)
    .maybeSingle();

  if (!test) return { success: false, error: 'Không tìm thấy bài kiểm tra.' };

  // Reset câu trả lời
  await supabase
    .from('daily_test_questions')
    .update({ employee_answer: null, is_correct: null })
    .eq('test_id', testId);

  // Reset bài kiểm tra
  const { error } = await supabase
    .from('daily_tests')
    .update({
      status: 'pending',
      correct_count: null,
      score_percent: null,
      passed: null,
      submitted_at: null,
      time_seconds: null,
      reset_count: (test.reset_count || 0) + 1,
    })
    .eq('test_id', testId);

  if (error) return { success: false, error: error.message };

  // Ghi log
  await supabase.from('daily_test_resets').insert({
    test_id: testId,
    employee_id: test.employee_id,
    reset_by: adminEmployeeId,
    reset_reason: reason,
  });

  return { success: true };
}

// ─── Admin: Report ────────────────────────────────────────────────────────────

export async function getDailyTestReport(date?: string): Promise<DailyTestAdminRow[]> {
  const targetDate = date || getTodayVNDateStr();

  // Lấy tất cả nhân viên active
  const { data: employees } = await supabase
    .from('employees')
    .select('id, full_name, department, email, skip_daily_quiz')
    .eq('employment_status', 'active');

  if (!employees?.length) return [];

  // Lấy bài kiểm tra ngày đó
  const { data: tests } = await supabase
    .from('daily_tests')
    .select('*')
    .eq('test_date', targetDate);

  const testMap = new Map<string, any>();
  for (const t of tests || []) testMap.set(t.employee_id, t);

  return employees.map((emp: any) => {
    const t = testMap.get(emp.id);
    if (!t) {
      // Nhân viên được miễn quiz → không hiển thị trong báo cáo nếu chưa làm
      if (emp.skip_daily_quiz) return null;
      return {
        employeeId: emp.id,
        fullName: emp.full_name || '—',
        department: emp.department || '—',
        email: emp.email || '',
        testDate: targetDate,
        status: 'not_created' as const,
      };
    }
    return {
      employeeId: emp.id,
      fullName: emp.full_name || '—',
      department: emp.department || '—',
      email: emp.email || '',
      testDate: targetDate,
      status: t.status as 'pending' | 'submitted',
      passed: t.passed ?? undefined,
      scorePercent: t.score_percent ?? undefined,
      correctCount: t.correct_count ?? undefined,
      totalQuestions: t.total_questions,
      testId: t.test_id,
      resetCount: t.reset_count || 0,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null).sort((a, b) =>
    (a.department || '').localeCompare(b.department || '', 'vi') ||
    (a.fullName || '').localeCompare(b.fullName || '', 'vi'),
  );
}

// ─── Admin: Question bank stats ───────────────────────────────────────────────

export async function getQuestionBankStats(): Promise<{
  noma_product: number;
  general: number;
  onboarding: number;
}> {
  const { data } = await supabase
    .from('daily_questions')
    .select('bank_type')
    .eq('is_active', true);

  const stats = { noma_product: 0, general: 0, onboarding: 0 };
  for (const r of data || []) {
    if (r.bank_type === 'noma_product') stats.noma_product++;
    else if (r.bank_type === 'general') stats.general++;
    else if (r.bank_type === 'onboarding') stats.onboarding++;
  }
  return stats;
}

// ─── Export Excel ─────────────────────────────────────────────────────────────

export async function exportDailyTestReportExcel(
  rows: DailyTestAdminRow[],
  date: string,
): Promise<void> {
  const XLSX = await import('xlsx');
  const HEADERS = ['STT', 'Họ và tên', 'Phòng ban', 'Email', 'Trạng thái', 'Đúng/Tổng', 'Điểm %', 'Kết quả'];

  const dataRows = rows.map((r, i) => [
    i + 1,
    r.fullName,
    r.department,
    r.email,
    r.status === 'submitted' ? 'Đã nộp' : r.status === 'pending' ? 'Chưa nộp' : 'Chưa mở',
    r.status === 'submitted' ? `${r.correctCount}/${r.totalQuestions}` : '—',
    r.status === 'submitted' ? `${r.scorePercent}%` : '—',
    r.status === 'submitted' ? (r.passed ? 'ĐẠT' : 'KHÔNG ĐẠT') : '—',
  ]);

  const aoa = [
    [`BÁO CÁO KIỂM TRA HẰNG NGÀY — ${date}`],
    [`Tổng: ${rows.length} | Đã nộp: ${rows.filter(r => r.status === 'submitted').length} | Đạt: ${rows.filter(r => r.passed).length}`],
    [],
    HEADERS,
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 18 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `KT ${date}`.slice(0, 31));
  XLSX.writeFile(wb, `kiem-tra-hang-ngay_${date}.xlsx`);
}
