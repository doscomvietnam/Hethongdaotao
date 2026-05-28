-- Migration: Thêm column quiz_answers vào training_progress
-- Mục đích: Lưu đáp án user đã chọn để có thể tính lại điểm khi admin đổi đáp án câu hỏi.
--
-- Cách chạy:
--   1. Mở Supabase Dashboard → SQL Editor → New query
--   2. Paste toàn bộ nội dung file này → Run
--
-- Schema:
--   quiz_answers JSONB = { "<question_id>": <selected_option_index 0-3>, ... }
--   Giá trị -1 = câu chưa trả lời.
--   NULL = bài làm cũ (trước khi feature này deploy) → không re-score, giữ nguyên điểm gốc.

ALTER TABLE training_progress
ADD COLUMN IF NOT EXISTS quiz_answers JSONB;

COMMENT ON COLUMN training_progress.quiz_answers IS
  'Map { question_id: selected_option_index }. Dùng để re-score khi admin đổi đáp án.';
