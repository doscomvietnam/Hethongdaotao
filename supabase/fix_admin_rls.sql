-- =====================================================
-- FIX: RLS policies cho phép admin/manager thêm/sửa/xóa
-- khóa học, quiz, câu hỏi và gửi thông báo.
--
-- Triệu chứng: Form "Thêm khóa học" báo lỗi
--   "new row violates row-level security policy for table courses"
--
-- Cách chạy: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- Script idempotent — chạy lại nhiều lần vẫn an toàn.
-- =====================================================

-- ────────────────────────────────────────────────────────
-- HELPER: kiểm tra user hiện tại có phải admin / manager
-- ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND role = 'admin'
      AND employment_status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'manager')
      AND employment_status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager() TO authenticated;

-- ────────────────────────────────────────────────────────
-- COURSES
-- ────────────────────────────────────────────────────────
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;

DROP POLICY IF EXISTS "courses_select_all_auth" ON public.courses;
DROP POLICY IF EXISTS "courses_insert_admin_manager" ON public.courses;
DROP POLICY IF EXISTS "courses_update_admin_manager" ON public.courses;
DROP POLICY IF EXISTS "courses_delete_admin" ON public.courses;

CREATE POLICY "courses_select_all_auth"
  ON public.courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "courses_insert_admin_manager"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "courses_update_admin_manager"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "courses_delete_admin"
  ON public.courses FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ────────────────────────────────────────────────────────
-- QUIZZES (inline quiz creation từ CourseManagement)
-- ────────────────────────────────────────────────────────
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;

DROP POLICY IF EXISTS "quizzes_select_all_auth" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_write_admin_manager" ON public.quizzes;

CREATE POLICY "quizzes_select_all_auth"
  ON public.quizzes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "quizzes_write_admin_manager"
  ON public.quizzes FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

-- ────────────────────────────────────────────────────────
-- QUIZ_QUESTIONS
-- ────────────────────────────────────────────────────────
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;

DROP POLICY IF EXISTS "quiz_questions_select_all_auth" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_write_admin_manager" ON public.quiz_questions;

CREATE POLICY "quiz_questions_select_all_auth"
  ON public.quiz_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "quiz_questions_write_admin_manager"
  ON public.quiz_questions FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager())
  WITH CHECK (public.is_admin_or_manager());

-- ────────────────────────────────────────────────────────
-- NOTIFICATIONS (createCourse tự push notifications)
-- ────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_admin_manager" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

-- Nhân viên đọc thông báo của chính mình
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
  );

-- Admin/manager insert notifications (khi tạo khóa học, gửi thông báo)
CREATE POLICY "notifications_insert_admin_manager"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager());

-- Nhân viên đánh dấu read thông báo của mình
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────
-- PRODUCTS — admin quản lý sản phẩm
-- ────────────────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;

DROP POLICY IF EXISTS "products_select_all_auth" ON public.products;
DROP POLICY IF EXISTS "products_write_admin" ON public.products;

CREATE POLICY "products_select_all_auth"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "products_write_admin"
  ON public.products FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- VERIFY: Chạy query sau để confirm user của bạn có phải admin
-- =====================================================
-- SELECT id, email, role, employment_status, auth_user_id, auth.uid() as current_auth_uid
-- FROM public.employees
-- WHERE auth_user_id = auth.uid();
--
-- Kết quả phải: role = 'admin' và auth_user_id = current_auth_uid
-- Nếu auth_user_id NULL → cần link auth.users với employees
