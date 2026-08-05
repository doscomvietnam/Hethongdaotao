/**
 * Practice Service — khu "Luyện tập" cho nhân viên ôn tập (không tính điểm, không giới hạn).
 *
 * Nguồn câu hỏi:
 *  - Sản phẩm NOMA      → quiz_questions của các khóa brand 'Noma'
 *  - Sale thực chiến     → quiz_questions của các khóa brand 'Khóa học sale thực chiến'
 *  - Nội quy công ty     → daily_questions bank_type='general'
 *  - Onboarding          → daily_questions bank_type='onboarding'
 *
 * Phân theo phòng ban: chủ đề dựa trên khóa học được lọc theo phòng của nhân viên
 * (giống danh mục khóa học: `!department || department === phòng của bạn`; admin/manager thấy hết).
 * Hai ngân hàng chung (Nội quy, Onboarding) là kiến thức toàn công ty → mọi người đều ôn được.
 */
import { supabase } from './supabaseClient';

const NOMA_BRAND = 'Noma';
const SALE_BRAND = 'Khóa học sale thực chiến';

// Câu hỏi khóa học NOMA chỉ dành cho Kinh doanh + Marketing (giống bài Kiểm tra hằng ngày).
const SALES_MARKETING_KEYWORDS = ['kinh doanh', 'marketing'];
function isSalesMarketing(department: string): boolean {
  const d = (department || '').toLowerCase();
  return SALES_MARKETING_KEYWORDS.some((k) => d.includes(k));
}

export interface PracticeCourseRef {
  courseId: string;
  name: string;
  quizId: string;
  questionCount: number;
}

export type PracticeTopicKey = 'noma' | 'sale' | 'norms' | 'onboarding';

export interface PracticeTopic {
  key: PracticeTopicKey;
  label: string;
  description: string;
  source: 'course' | 'bank';
  bankType?: 'general' | 'onboarding';
  questionCount: number;
  courses: PracticeCourseRef[]; // rỗng với chủ đề ngân hàng chung
  quizIds: string[];            // tất cả quiz_id của chủ đề (dùng khi luyện "Tất cả")
}

export interface PracticeQuestion {
  id: string;
  questionText: string;
  options: string[];   // [A, B, C, D]
  correctIndex: number; // 0-3
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Chuyển 1 dòng câu hỏi (quiz_questions / daily_questions) thành PracticeQuestion.
 * Câu chỉ có 2-3 đáp án là hợp lệ (form admin chỉ bắt buộc A, B) — chỉ bỏ các ô đáp án trống,
 * giữ nguyên câu nếu đáp án đúng còn tồn tại và còn >= 2 lựa chọn. Trả null nếu câu không hợp lệ.
 */
function toPracticeQuestion(r: any): PracticeQuestion | null {
  const raw = [r.option_a, r.option_b, r.option_c, r.option_d];
  const ci = ['A', 'B', 'C', 'D'].indexOf(String(r.correct_answer || '').toUpperCase());
  if (ci < 0) return null;
  const correctText = raw[ci];
  if (correctText == null || String(correctText).trim() === '') return null;
  const options = raw.filter((o) => o != null && String(o).trim() !== '');
  const correctIndex = options.indexOf(correctText);
  if (correctIndex < 0 || options.length < 2) return null;
  return { id: r.question_id, questionText: r.question_text, options, correctIndex };
}

/**
 * Lấy danh sách chủ đề luyện tập khả dụng cho nhân viên (đã lọc theo phòng ban).
 */
export async function getPracticeTopics(department: string, role: string): Promise<PracticeTopic[]> {
  const isPrivileged = role === 'admin' || role === 'manager';

  // 1) Chủ đề dựa trên khóa học (NOMA, Sale thực chiến)
  const { data: courseRows } = await supabase
    .from('courses')
    .select('course_id, course_name, quiz_id, brand, department, status')
    .in('brand', [NOMA_BRAND, SALE_BRAND])
    .not('quiz_id', 'is', null)
    .eq('status', 'active');

  const visibleCourses = (courseRows || []).filter((c: any) => {
    if (isPrivileged) return true;
    // Khóa NOMA: chỉ Kinh doanh + Marketing (dù khóa gán "tất cả phòng").
    if (c.brand === NOMA_BRAND) return isSalesMarketing(department);
    // Còn lại theo phòng ban của khóa (Sale thực chiến = Kinh doanh).
    return !c.department || c.department === department;
  });

  // Đếm số câu active theo từng quiz
  const quizIds = visibleCourses.map((c: any) => c.quiz_id);
  const countByQuiz: Record<string, number> = {};
  if (quizIds.length) {
    // Đếm theo đúng quy tắc hợp lệ của toPracticeQuestion để số câu trên thẻ khớp với lúc luyện.
    const { data: qRows } = await supabase
      .from('quiz_questions')
      .select('quiz_id, question_id, question_text, option_a, option_b, option_c, option_d, correct_answer')
      .in('quiz_id', quizIds)
      .eq('status', 'active');
    (qRows || []).forEach((r: any) => {
      if (toPracticeQuestion(r)) countByQuiz[r.quiz_id] = (countByQuiz[r.quiz_id] || 0) + 1;
    });
  }

  const topics: PracticeTopic[] = [];

  const buildCourseTopic = (
    key: PracticeTopicKey,
    brand: string,
    label: string,
    description: string,
  ): PracticeTopic | null => {
    const cs: PracticeCourseRef[] = visibleCourses
      .filter((c: any) => c.brand === brand)
      .map((c: any) => ({
        courseId: c.course_id,
        name: c.course_name,
        quizId: c.quiz_id,
        questionCount: countByQuiz[c.quiz_id] || 0,
      }))
      .filter((c) => c.questionCount > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    if (!cs.length) return null;
    const total = cs.reduce((s, c) => s + c.questionCount, 0);
    return { key, label, description, source: 'course', questionCount: total, courses: cs, quizIds: cs.map((c) => c.quizId) };
  };

  const noma = buildCourseTopic('noma', NOMA_BRAND, 'Sản phẩm NOMA', 'Ôn kiến thức toàn bộ dòng sản phẩm NOMA');
  if (noma) topics.push(noma);
  const sale = buildCourseTopic('sale', SALE_BRAND, 'Sale thực chiến', 'Ôn kỹ năng & quy trình bán hàng thực chiến');
  if (sale) topics.push(sale);

  // 2) Chủ đề ngân hàng chung (Nội quy, Onboarding) — toàn công ty
  const buildBankTopic = async (
    key: PracticeTopicKey,
    bankType: 'general' | 'onboarding',
    label: string,
    description: string,
  ): Promise<PracticeTopic | null> => {
    const { data } = await supabase
      .from('daily_questions')
      .select('question_id, question_text, option_a, option_b, option_c, option_d, correct_answer')
      .eq('bank_type', bankType)
      .eq('is_active', true);
    const count = (data || []).filter((r: any) => toPracticeQuestion(r)).length;
    if (!count) return null;
    return { key, label, description, source: 'bank', bankType, questionCount: count, courses: [], quizIds: [] };
  };

  const norms = await buildBankTopic('norms', 'general', 'Nội quy công ty', 'Ôn nội quy, quy chế, văn hóa công ty');
  if (norms) topics.push(norms);
  const onboarding = await buildBankTopic('onboarding', 'onboarding', 'Onboarding', 'Ôn kiến thức hội nhập nhân viên mới');
  if (onboarding) topics.push(onboarding);

  return topics;
}

/**
 * Lấy câu hỏi cho một lượt luyện tập (đã trộn ngẫu nhiên).
 * Truyền quizIds (chủ đề khóa học) HOẶC bankType (ngân hàng chung).
 */
export async function getPracticeQuestions(opts: {
  quizIds?: string[];
  bankType?: 'general' | 'onboarding';
}): Promise<PracticeQuestion[]> {
  let rows: any[] = [];

  if (opts.quizIds && opts.quizIds.length) {
    const { data } = await supabase
      .from('quiz_questions')
      .select('question_id, question_text, option_a, option_b, option_c, option_d, correct_answer')
      .in('quiz_id', opts.quizIds)
      .eq('status', 'active');
    rows = data || [];
  } else if (opts.bankType) {
    const { data } = await supabase
      .from('daily_questions')
      .select('question_id, question_text, option_a, option_b, option_c, option_d, correct_answer')
      .eq('bank_type', opts.bankType)
      .eq('is_active', true);
    rows = data || [];
  }

  const mapped = rows
    .map((r: any) => toPracticeQuestion(r))
    .filter((q): q is PracticeQuestion => q !== null);

  return shuffle(mapped);
}
