-- ============================================================
-- SUPABASE MIGRATION: Bảng employees + RLS
-- Project: LMS_DOSCOM
-- Date: 2026-04-25
-- ============================================================
-- Hướng dẫn: Copy toàn bộ file này và paste vào Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- ============================================================
-- PHẦN 1: TẠO BẢNG EMPLOYEES
-- ============================================================

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  department TEXT,
  position TEXT,
  phone TEXT,
  avatar_url TEXT,
  employment_status TEXT NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active', 'inactive')),
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index cho truy vấn nhanh theo auth_user_id
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON employees(auth_user_id);

-- Index cho truy vấn theo email
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

-- ============================================================
-- PHẦN 2: BẬT ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policy 1: Nhân viên tự đọc profile của chính mình
CREATE POLICY "employees_select_own" ON employees
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Policy 2: Nhân viên tự cập nhật must_change_password của mình
CREATE POLICY "employees_update_own_password_flag" ON employees
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Policy 3: Admin đọc tất cả employees
CREATE POLICY "admin_select_all_employees" ON employees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.auth_user_id = auth.uid()
      AND e.role = 'admin'
    )
  );

-- Policy 4: Admin cập nhật tất cả employees
CREATE POLICY "admin_update_all_employees" ON employees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.auth_user_id = auth.uid()
      AND e.role = 'admin'
    )
  );

-- Policy 5: Admin thêm employees mới
CREATE POLICY "admin_insert_employees" ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.auth_user_id = auth.uid()
      AND e.role = 'admin'
    )
  );

-- ============================================================
-- PHẦN 3: FUNCTION TỰ CẬP NHẬT updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- XONG! 
-- Tiếp theo: Vào Authentication → Users → Invite user
-- Sau đó thêm record vào bảng employees với auth_user_id tương ứng
-- ============================================================
