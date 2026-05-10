-- =====================================================
-- Migration: Thêm thời hạn khóa học (start_date, end_date)
-- Chạy trên Supabase Dashboard → SQL Editor → New Query
-- =====================================================

-- 1. Thêm cột start_date và end_date vào bảng courses
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL;

-- 2. Cấp quyền cho authenticated users đọc/ghi
GRANT SELECT, INSERT, UPDATE ON courses TO authenticated;

-- Xong! Sau khi chạy, quay lại ứng dụng → Quản trị hệ thống → Quản lý khóa học
-- sẽ thấy phần "Thời hạn khóa học" khi thêm/sửa khóa học.
