-- Bước 1: Bỏ FK constraint để question_id không bị ràng buộc vào daily_questions
ALTER TABLE daily_test_questions
  DROP CONSTRAINT IF EXISTS daily_test_questions_question_id_fkey;

-- Bước 2: Đổi kiểu cột question_id từ uuid → text
-- để có thể lưu cả UUID (từ daily_questions) lẫn string ID (từ quiz_questions, vd: QQ_922_03)
ALTER TABLE daily_test_questions
  ALTER COLUMN question_id TYPE text;
