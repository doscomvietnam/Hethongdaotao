-- Sửa CHECK constraint của cột bank_type để thêm giá trị 'onboarding'
-- Chạy file này TRƯỚC khi chạy onboarding_questions.sql

ALTER TABLE daily_questions
  DROP CONSTRAINT IF EXISTS daily_questions_bank_type_check;

ALTER TABLE daily_questions
  ADD CONSTRAINT daily_questions_bank_type_check
    CHECK (bank_type IN ('noma_product', 'general', 'onboarding'));
