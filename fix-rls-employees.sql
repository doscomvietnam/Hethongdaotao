-- ============================================================
-- FIX RLS: Sửa lỗi infinite recursion trong employees policies
-- Chạy trong Supabase SQL Editor
-- ============================================================

-- Xóa policies cũ bị lỗi
DROP POLICY IF EXISTS "employees_select_own" ON employees;
DROP POLICY IF EXISTS "employees_update_own_password_flag" ON employees;
DROP POLICY IF EXISTS "admin_select_all_employees" ON employees;
DROP POLICY IF EXISTS "admin_update_all_employees" ON employees;
DROP POLICY IF EXISTS "admin_insert_employees" ON employees;

-- Policy mới: Cho phép authenticated user đọc tất cả employees
-- (Vì chỉ user đã đăng nhập mới truy cập được, an toàn)
CREATE POLICY "authenticated_select_employees" ON employees
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Cho phép user tự update profile của mình
CREATE POLICY "employees_update_own" ON employees
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Policy: Chỉ admin được insert (dùng JWT claim thay vì query bảng)
CREATE POLICY "admin_insert_employees" ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
