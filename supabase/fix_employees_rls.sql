-- =====================================================
-- FIX: RLS policies cho bảng employees
-- Admin được phép thêm / sửa / xoá nhân viên
-- Mọi user đăng nhập đều SELECT được (để hiển thị tên đồng nghiệp)
-- Nhân viên được UPDATE hồ sơ của chính mình
--
-- Triệu chứng: Thêm nhân viên báo
--   "new row violates row-level security policy for table employees"
--
-- Chạy: Supabase Dashboard → SQL Editor → Paste → Run
-- Script idempotent — chạy lại nhiều lần vẫn an toàn.
-- =====================================================

-- Helper is_admin() đã được tạo ở fix_admin_rls.sql. Tạo lại nếu chưa có.
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
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ────────────────────────────────────────────────────────
-- EMPLOYEES
-- ────────────────────────────────────────────────────────
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;

DROP POLICY IF EXISTS "employees_select_all_auth" ON public.employees;
DROP POLICY IF EXISTS "employees_insert_admin" ON public.employees;
DROP POLICY IF EXISTS "employees_update_admin_or_self" ON public.employees;
DROP POLICY IF EXISTS "employees_delete_admin" ON public.employees;

-- Mọi user đăng nhập SELECT được (để hiện đồng nghiệp, phòng ban, lookup auth_user_id...)
CREATE POLICY "employees_select_all_auth"
  ON public.employees FOR SELECT
  TO authenticated
  USING (true);

-- Chỉ admin được INSERT nhân viên mới
CREATE POLICY "employees_insert_admin"
  ON public.employees FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admin update ai cũng được; nhân viên thường chỉ update hồ sơ của mình
CREATE POLICY "employees_update_admin_or_self"
  ON public.employees FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth_user_id = auth.uid())
  WITH CHECK (public.is_admin() OR auth_user_id = auth.uid());

-- Chỉ admin được xoá
CREATE POLICY "employees_delete_admin"
  ON public.employees FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =====================================================
-- VERIFY: Kiểm tra user hiện tại có phải admin
-- =====================================================
-- SELECT id, email, role, employment_status, auth_user_id, auth.uid() AS current_auth_uid
-- FROM public.employees
-- WHERE auth_user_id = auth.uid();
--
-- Kết quả phải có row với role = 'admin' và employment_status = 'active'.
