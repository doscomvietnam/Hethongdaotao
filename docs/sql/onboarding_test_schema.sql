-- ============================================================
-- ONBOARDING TEST SCHEMA
-- Chạy toàn bộ file này trong Supabase SQL Editor
-- ============================================================

-- 1. Thêm cột onboarding_available_date vào employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS onboarding_available_date date;

-- 2. Bảng lưu bài kiểm tra onboarding của nhân viên
CREATE TABLE IF NOT EXISTS onboarding_tests (
  test_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'pending'  CHECK (status IN ('pending', 'submitted')),
  total_questions   int  NOT NULL DEFAULT 10,
  pass_threshold    int  NOT NULL DEFAULT 8,
  correct_count     int,
  score_percent     numeric(5,2),
  passed            boolean,
  submitted_at      timestamptz,
  time_seconds      int,
  created_at        timestamptz DEFAULT now(),
  UNIQUE (employee_id)  -- mỗi nhân viên chỉ 1 bài onboarding
);

-- 3. Bảng snapshot câu hỏi của từng bài onboarding
CREATE TABLE IF NOT EXISTS onboarding_test_questions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id              uuid NOT NULL REFERENCES onboarding_tests(test_id) ON DELETE CASCADE,
  position             int  NOT NULL,
  question_id          text NOT NULL,  -- text thay vì uuid để linh hoạt
  question_text        text NOT NULL,
  options              jsonb NOT NULL, -- mảng 4 chuỗi sau khi shuffle
  correct_option_index int  NOT NULL,
  employee_answer      int,            -- index đáp án nhân viên chọn (0-3)
  is_correct           boolean
);

-- 4. Index để query nhanh
CREATE INDEX IF NOT EXISTS idx_onboarding_tests_employee ON onboarding_tests(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_test_questions_test ON onboarding_test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_employees_onboarding_date ON employees(onboarding_available_date) WHERE onboarding_available_date IS NOT NULL;

-- 5. RLS policies
ALTER TABLE onboarding_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_test_questions ENABLE ROW LEVEL SECURITY;

-- Nhân viên chỉ thấy bài của mình; admin/manager thấy tất cả
CREATE POLICY "onboarding_tests_select" ON onboarding_tests
  FOR SELECT USING (
    employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM employees
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "onboarding_tests_insert" ON onboarding_tests
  FOR INSERT WITH CHECK (
    employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "onboarding_tests_update" ON onboarding_tests
  FOR UPDATE USING (
    employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM employees
      WHERE auth_user_id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "onboarding_test_questions_select" ON onboarding_test_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM onboarding_tests t
      WHERE t.test_id = onboarding_test_questions.test_id
        AND (
          t.employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM employees
            WHERE auth_user_id = auth.uid()
              AND role IN ('admin', 'manager')
          )
        )
    )
  );

CREATE POLICY "onboarding_test_questions_insert" ON onboarding_test_questions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "onboarding_test_questions_update" ON onboarding_test_questions
  FOR UPDATE USING (true);
