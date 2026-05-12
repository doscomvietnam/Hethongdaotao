-- =====================================================
-- Migration: Thêm cột video_duration_seconds vào bảng courses
-- Mục đích: Admin nhập thời lượng video → tracker tính % chính xác
-- (đặc biệt cần cho Google Drive iframe vì không tự đọc được duration)
--
-- Chạy: Supabase Dashboard → SQL Editor → Paste → Run
-- =====================================================

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.courses.video_duration_seconds IS
  'Thời lượng video tính bằng giây. Dùng để tính % tiến độ chính xác cho video Drive/iframe không tự đọc được duration. NULL = fallback (YouTube/MP4 auto-detect, Drive dùng 600s).';
