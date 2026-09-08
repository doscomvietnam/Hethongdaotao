/**
 * Vercel Serverless Function — API ĐỌC dữ liệu học tập của nhân viên (dùng cho app HR khác)
 *
 *  Xác thực: gửi kèm token bí mật ở header  `x-api-key: <OPS_API_TOKEN>`  (hoặc ?token=...)
 *            Token đặt trong biến môi trường Vercel: OPS_API_TOKEN
 *
 *  GET /api/employee-learning?email=an@cty.com     → chi tiết học tập 1 nhân viên (kèm danh sách khóa)
 *  GET /api/employee-learning?employee_id=<uuid>   → như trên, tra theo id
 *  GET /api/employee-learning?all=1                → danh sách TẤT CẢ nhân viên + tóm tắt (không kèm khóa)
 *  GET /api/employee-learning?all=1&detail=1       → tất cả nhân viên KÈM danh sách khóa (payload lớn)
 *
 *  LỌC THEO NGÀY (tùy chọn, dạng YYYY-MM-DD, tính CẢ 2 đầu):
 *    &from=2026-08-01&to=2026-08-31   → chỉ lấy hoạt động trong khoảng
 *    &from=2026-08-01                 → từ ngày đó tới hiện tại
 *    &to=2026-08-31                   → từ đầu tới hết ngày đó
 *    (không truyền from/to → trả TOÀN BỘ lịch sử từ trước tới nay)
 *  Mốc thời gian dùng để lọc: training_progress.updated_at · daily_tests.test_date · onboarding_tests.submitted_at
 *
 *  CHỈ ĐỌC — không có phương thức ghi.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const svc = () =>
  createClient(process.env.VITE_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);

type Emp = {
  id: string; email: string; full_name: string; department: string | null;
  position: string | null; role: string | null; employment_status: string | null;
};
type Range = { from: string | null; to: string | null };

function round(n: number, d = 1) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}

// Trả về ngày (YYYY-MM-DD) liền SAU ngày `d` — dùng làm cận trên (exclusive) cho cột timestamptz
function nextDay(d: string) {
  const dt = new Date(d + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

function parseRange(req: VercelRequest): Range {
  const from = ((req.query.from as string) || '').trim();
  const to = ((req.query.to as string) || '').trim();
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (from && !re.test(from)) throw new Error('Tham số from phải dạng YYYY-MM-DD');
  if (to && !re.test(to)) throw new Error('Tham số to phải dạng YYYY-MM-DD');
  return { from: from || null, to: to || null };
}

// Áp lọc cho cột kiểu timestamptz (dùng nextDay để bao trọn ngày `to`)
function applyRangeTs(q: any, col: string, r: Range) {
  if (r.from) q = q.gte(col, r.from);
  if (r.to) q = q.lt(col, nextDay(r.to));
  return q;
}
// Áp lọc cho cột kiểu date (test_date) — so sánh trực tiếp, tính cả 2 đầu
function applyRangeDate(q: any, col: string, r: Range) {
  if (r.from) q = q.gte(col, r.from);
  if (r.to) q = q.lte(col, r.to);
  return q;
}

// Tóm tắt tiến độ học từ các dòng training_progress của 1 nhân viên
function buildSummary(rows: any[]) {
  const completed = rows.filter(r => r.status === 'completed').length;
  const inProgress = rows.filter(r => r.status === 'in_progress').length;
  const withScore = rows.filter(r => r.quiz_score != null);
  const passed = rows.filter(r => r.quiz_passed === true).length;
  const avg = withScore.length ? round(withScore.reduce((s, r) => s + Number(r.quiz_score), 0) / withScore.length) : null;
  const last = rows.reduce<string | null>((acc, r) => {
    const t = r.updated_at || r.created_at;
    return t && (!acc || t > acc) ? t : acc;
  }, null);
  return {
    total_courses: rows.length,        // số khóa nhân viên có tương tác (trong khoảng lọc nếu có)
    completed,                         // status = 'completed'
    in_progress: inProgress,
    quizzes_taken: withScore.length,
    quizzes_passed: passed,
    avg_quiz_score: avg,               // trung bình điểm quiz (thang 0-100), null nếu chưa làm
    last_activity: last,               // lần cập nhật gần nhất
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Chỉ hỗ trợ GET (API chỉ đọc)' });

  // ---- Xác thực token ----
  const serverToken = process.env.OPS_API_TOKEN;
  if (!serverToken) return res.status(500).json({ error: 'Server chưa cấu hình OPS_API_TOKEN' });
  const given = (req.headers['x-api-key'] as string) || (req.query.token as string) || '';
  if (given !== serverToken) return res.status(401).json({ error: 'Token không hợp lệ' });

  const s = svc();
  const empCols = 'id, email, full_name, department, position, role, employment_status';

  try {
    let range: Range;
    try { range = parseRange(req); } catch (e: any) { return res.status(400).json({ error: e.message }); }

    const all = req.query.all === '1' || req.query.all === 'true';
    const detail = req.query.detail === '1' || req.query.detail === 'true';
    const email = ((req.query.email as string) || '').trim().toLowerCase();
    const employeeId = ((req.query.employee_id as string) || '').trim();

    // ============ 1 NHÂN VIÊN ============
    if (!all) {
      if (!email && !employeeId) return res.status(400).json({ error: 'Thiếu email hoặc employee_id (hoặc dùng all=1)' });
      let q = s.from('employees').select(empCols);
      q = email ? q.ilike('email', email) : q.eq('id', employeeId);
      const { data: emp, error: ee } = await q.maybeSingle();
      if (ee) return res.status(500).json({ error: ee.message });
      if (!emp) return res.status(404).json({ error: 'Không tìm thấy nhân viên' });

      const detailData = await loadEmployeeDetail(s, emp as Emp, range);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ...detailData, range, fetchedAt: new Date().toISOString() });
    }

    // ============ TẤT CẢ NHÂN VIÊN ============
    const { data: emps, error: e1 } = await s.from('employees').select(empCols).order('full_name');
    if (e1) return res.status(500).json({ error: e1.message });

    // Lấy toàn bộ progress + daily 1 lần rồi gom theo employee_id (tránh N query)
    let progQ = s.from('training_progress')
      .select('employee_id, course_id, video_progress, quiz_score, quiz_passed, quiz_completed_at, status, created_at, updated_at');
    progQ = applyRangeTs(progQ, 'updated_at', range);
    const { data: prog } = await progQ;

    let dailyQ = s.from('daily_tests').select('employee_id, status, passed, score_percent, test_date');
    dailyQ = applyRangeDate(dailyQ, 'test_date', range);
    const { data: daily } = await dailyQ;

    const byEmpProg = new Map<string, any[]>();
    (prog || []).forEach(r => { const a = byEmpProg.get(r.employee_id) || []; a.push(r); byEmpProg.set(r.employee_id, a); });
    const byEmpDaily = new Map<string, any[]>();
    (daily || []).forEach(r => { const a = byEmpDaily.get(r.employee_id) || []; a.push(r); byEmpDaily.set(r.employee_id, a); });

    // Nếu detail=1: cần thông tin khóa để đính kèm
    let courseMap = new Map<string, any>();
    if (detail) courseMap = await loadCourseMap(s);

    const list = (emps || []).map((emp: any) => {
      const rows = byEmpProg.get(emp.id) || [];
      const out: any = { employee: emp, summary: buildSummary(rows), daily_tests: buildDaily(byEmpDaily.get(emp.id) || []) };
      if (detail) out.courses = rows.map(r => shapeCourse(r, courseMap));
      return out;
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ count: list.length, employees: list, range, fetchedAt: new Date().toISOString() });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Lỗi máy chủ' });
  }
}

// ---- helpers ----
async function loadCourseMap(s: any) {
  const { data } = await s.from('courses').select('course_id, course_name, brand, category, is_required, video_duration_seconds');
  const m = new Map<string, any>();
  (data || []).forEach((c: any) => m.set(c.course_id, c));
  return m;
}

function shapeCourse(r: any, courseMap: Map<string, any>) {
  const c = courseMap.get(r.course_id) || {};
  return {
    course_id: r.course_id,
    course_name: c.course_name ?? null,
    brand: c.brand ?? null,
    category: c.category ?? null,
    is_required: c.is_required ?? null,
    video_progress: r.video_progress,
    quiz_score: r.quiz_score,
    quiz_passed: r.quiz_passed,
    quiz_completed_at: r.quiz_completed_at,
    status: r.status,
    updated_at: r.updated_at,
  };
}

function buildDaily(rows: any[]) {
  const submitted = rows.filter(r => r.status === 'submitted');
  const passed = submitted.filter(r => r.passed === true).length;
  const withScore = submitted.filter(r => r.score_percent != null);
  const avg = withScore.length ? round(withScore.reduce((s, r) => s + Number(r.score_percent), 0) / withScore.length) : null;
  const lastDate = rows.reduce<string | null>((acc, r) => (r.test_date && (!acc || r.test_date > acc) ? r.test_date : acc), null);
  return { total: rows.length, submitted: submitted.length, passed, avg_score_percent: avg, last_date: lastDate };
}

async function loadEmployeeDetail(s: any, emp: Emp, range: Range) {
  let progQ = s.from('training_progress')
    .select('course_id, video_progress, quiz_score, quiz_passed, quiz_completed_at, status, created_at, updated_at')
    .eq('employee_id', emp.id);
  progQ = applyRangeTs(progQ, 'updated_at', range);
  const { data: rows } = await progQ;
  const progRows = rows || [];

  const courseMap = await loadCourseMap(s);
  const courses = progRows.map((r: any) => shapeCourse(r, courseMap));

  let dailyQ = s.from('daily_tests').select('status, passed, score_percent, test_date').eq('employee_id', emp.id);
  dailyQ = applyRangeDate(dailyQ, 'test_date', range);
  const { data: dailyRows } = await dailyQ;

  let onbQ = s.from('onboarding_tests').select('status, passed, score_percent, submitted_at').eq('employee_id', emp.id);
  onbQ = applyRangeTs(onbQ, 'submitted_at', range);
  const { data: onbList } = await onbQ;
  const onb = (onbList && onbList[0]) || null;

  return {
    employee: emp,
    summary: buildSummary(progRows),
    courses,
    daily_tests: buildDaily(dailyRows || []),
    onboarding: onb,
  };
}
