-- ============================================================
-- SECURITY: RLS + Quiz Re-submission Trigger
-- Chạy trong Supabase Dashboard → SQL Editor
-- An toàn chạy nhiều lần (idempotent)
-- ============================================================

-- ── PHẦN 1: Quiz re-submission trigger ───────────────────────
CREATE OR REPLACE FUNCTION prevent_quiz_rescore()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.quiz_completed_at IS NOT NULL AND NEW.quiz_completed_at IS NOT NULL THEN
    NEW.quiz_score          := OLD.quiz_score;
    NEW.quiz_time_seconds   := OLD.quiz_time_seconds;
    NEW.quiz_completed_at   := OLD.quiz_completed_at;
    NEW.quiz_passed         := OLD.quiz_passed;
    NEW.quiz_answers        := OLD.quiz_answers;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_quiz_rescore_trigger ON training_progress;
CREATE TRIGGER prevent_quiz_rescore_trigger
  BEFORE UPDATE ON training_progress
  FOR EACH ROW
  EXECUTE FUNCTION prevent_quiz_rescore();

-- ── PHẦN 2: Helper function (SECURITY DEFINER) ───────────────
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- ── PHẦN 3: RLS — EMPLOYEES ──────────────────────────────────
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_select_own"          ON employees;
DROP POLICY IF EXISTS "admin_select_all_employees"   ON employees;
DROP POLICY IF EXISTS "admin_insert_employees"       ON employees;
DROP POLICY IF EXISTS "admin_update_employees"       ON employees;
DROP POLICY IF EXISTS "admin_delete_employees"       ON employees;

CREATE POLICY "employee_select_own" ON employees
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "admin_select_all_employees" ON employees
  FOR SELECT USING (current_user_role() IN ('admin', 'manager'));

CREATE POLICY "admin_insert_employees" ON employees
  FOR INSERT WITH CHECK (current_user_role() IN ('admin', 'manager'));

CREATE POLICY "admin_update_employees" ON employees
  FOR UPDATE USING (current_user_role() IN ('admin', 'manager'));

CREATE POLICY "admin_delete_employees" ON employees
  FOR DELETE USING (current_user_role() = 'admin');

-- ── PHẦN 4: RLS — TRAINING_PROGRESS ──────────────────────────
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_select_own_progress"  ON training_progress;
DROP POLICY IF EXISTS "admin_select_all_progress"     ON training_progress;
DROP POLICY IF EXISTS "employee_upsert_own_progress"  ON training_progress;
DROP POLICY IF EXISTS "admin_manage_all_progress"     ON training_progress;

CREATE POLICY "employee_select_own_progress" ON training_progress
  FOR SELECT USING (employee_id IN (
    SELECT id FROM employees WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "admin_select_all_progress" ON training_progress
  FOR SELECT USING (current_user_role() IN ('admin', 'manager'));

CREATE POLICY "employee_upsert_own_progress" ON training_progress
  FOR ALL USING (employee_id IN (
    SELECT id FROM employees WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "admin_manage_all_progress" ON training_progress
  FOR ALL USING (current_user_role() IN ('admin', 'manager'));

-- ── PHẦN 5: RLS — DAILY_TESTS ────────────────────────────────
ALTER TABLE daily_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_select_own_daily"  ON daily_tests;
DROP POLICY IF EXISTS "admin_select_all_daily"     ON daily_tests;
DROP POLICY IF EXISTS "employee_manage_own_daily"  ON daily_tests;
DROP POLICY IF EXISTS "admin_manage_all_daily"     ON daily_tests;

CREATE POLICY "employee_select_own_daily" ON daily_tests
  FOR SELECT USING (employee_id IN (
    SELECT id FROM employees WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "admin_select_all_daily" ON daily_tests
  FOR SELECT USING (current_user_role() IN ('admin', 'manager'));

CREATE POLICY "employee_manage_own_daily" ON daily_tests
  FOR ALL USING (employee_id IN (
    SELECT id FROM employees WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "admin_manage_all_daily" ON daily_tests
  FOR ALL USING (current_user_role() IN ('admin', 'manager'));

-- ── PHẦN 6: RLS — DAILY_TEST_QUESTIONS ───────────────────────
ALTER TABLE daily_test_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_select_own_daily_q"  ON daily_test_questions;
DROP POLICY IF EXISTS "admin_select_all_daily_q"     ON daily_test_questions;
DROP POLICY IF EXISTS "employee_manage_own_daily_q"  ON daily_test_questions;
DROP POLICY IF EXISTS "admin_manage_all_daily_q"     ON daily_test_questions;

CREATE POLICY "employee_select_own_daily_q" ON daily_test_questions
  FOR SELECT USING (test_id IN (
    SELECT test_id FROM daily_tests
    WHERE employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY "admin_select_all_daily_q" ON daily_test_questions
  FOR SELECT USING (current_user_role() IN ('admin', 'manager'));

CREATE POLICY "employee_manage_own_daily_q" ON daily_test_questions
  FOR ALL USING (test_id IN (
    SELECT test_id FROM daily_tests
    WHERE employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY "admin_manage_all_daily_q" ON daily_test_questions
  FOR ALL USING (current_user_role() IN ('admin', 'manager'));

-- ── PHẦN 7: RLS — COURSES / QUIZZES / QUESTIONS (read-only cho tất cả) ──
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read_courses" ON courses;
DROP POLICY IF EXISTS "admin_manage_courses"       ON courses;
CREATE POLICY "authenticated_read_courses" ON courses
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_manage_courses" ON courses
  FOR ALL USING (current_user_role() = 'admin');

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read_quiz_questions" ON quiz_questions;
DROP POLICY IF EXISTS "admin_manage_quiz_questions"       ON quiz_questions;
CREATE POLICY "authenticated_read_quiz_questions" ON quiz_questions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_manage_quiz_questions" ON quiz_questions
  FOR ALL USING (current_user_role() = 'admin');

ALTER TABLE daily_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read_daily_questions" ON daily_questions;
DROP POLICY IF EXISTS "admin_manage_daily_questions"       ON daily_questions;
CREATE POLICY "authenticated_read_daily_questions" ON daily_questions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_manage_daily_questions" ON daily_questions
  FOR ALL USING (current_user_role() = 'admin');

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read_quizzes" ON quizzes;
DROP POLICY IF EXISTS "admin_manage_quizzes"       ON quizzes;
CREATE POLICY "authenticated_read_quizzes" ON quizzes
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_manage_quizzes" ON quizzes
  FOR ALL USING (current_user_role() = 'admin');
