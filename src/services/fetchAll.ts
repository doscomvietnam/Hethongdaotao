/**
 * Đọc HẾT dữ liệu của 1 truy vấn Supabase theo từng trang.
 *
 * Supabase (PostgREST) trả TỐI ĐA 1.000 dòng mỗi lần gọi — kể cả khi có `.limit(10000)` hay `.range(0, 9999)`.
 * Bảng nào có thể vượt 1.000 dòng (daily_tests, training_progress, quiz_questions, seeding_submissions…)
 * thì phải đọc qua hàm này, nếu không sẽ âm thầm thiếu dữ liệu.
 *
 * `build` phải tạo truy vấn MỚI mỗi lần gọi (không dùng lại builder). `orderBy` là cột duy nhất
 * (vd 'id', 'test_id', 'question_id') để phân trang ổn định, không trùng / sót dòng.
 * Trả về `{ data, error }` cùng dạng với Supabase nên chỗ gọi không phải sửa logic.
 */
const PAGE = 1000;

export async function fetchAll<T = any>(
  build: () => any,
  orderBy: string,
): Promise<{ data: T[]; error: any }> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().order(orderBy, { ascending: true }).range(from, from + PAGE - 1);
    if (error) return { data: out, error };
    const rows = (data || []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return { data: out, error: null };
}
