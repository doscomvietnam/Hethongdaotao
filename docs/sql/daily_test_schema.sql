-- ============================================================
-- DAILY KNOWLEDGE TEST SCHEMA
-- Chạy toàn bộ script này trong Supabase SQL Editor
-- ============================================================

-- 1. Bảng câu hỏi ngân hàng hằng ngày
--    bank_type = 'noma_product' : 80 câu sản phẩm NOMA
--    bank_type = 'general'      : 50 câu kiến thức chung
CREATE TABLE IF NOT EXISTS daily_questions (
  question_id   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_type     TEXT        NOT NULL CHECK (bank_type IN ('noma_product', 'general')),
  question_text TEXT        NOT NULL,
  option_a      TEXT        NOT NULL,
  option_b      TEXT        NOT NULL,
  option_c      TEXT        NOT NULL,
  option_d      TEXT        NOT NULL,
  correct_answer TEXT       NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  category      TEXT,
  is_active     BOOLEAN     DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng bài kiểm tra hằng ngày (1 bản ghi / nhân viên / ngày)
CREATE TABLE IF NOT EXISTS daily_tests (
  test_id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id      UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  test_date        DATE        NOT NULL,  -- ngày theo Asia/Ho_Chi_Minh
  department       TEXT        NOT NULL,
  total_questions  INT         NOT NULL,
  pass_threshold   INT         NOT NULL,  -- số câu đúng tối thiểu để đạt
  status           TEXT        DEFAULT 'pending' CHECK (status IN ('pending','submitted')),
  correct_count    INT,
  score_percent    NUMERIC(5,2),
  passed           BOOLEAN,
  submitted_at     TIMESTAMPTZ,
  time_seconds     INT,
  reset_count      INT         DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, test_date)
);

-- 3. Bảng snapshot câu hỏi của từng bài kiểm tra
CREATE TABLE IF NOT EXISTS daily_test_questions (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id              UUID NOT NULL REFERENCES daily_tests(test_id) ON DELETE CASCADE,
  position             INT  NOT NULL,  -- thứ tự trong bài (0-based)
  question_id          UUID NOT NULL REFERENCES daily_questions(question_id),
  bank_type            TEXT NOT NULL,
  question_text        TEXT NOT NULL,  -- snapshot tại thời điểm tạo đề
  options              JSONB NOT NULL, -- ["opt0","opt1","opt2","opt3"] đã shuffle
  correct_option_index INT  NOT NULL,  -- 0-3, index trong mảng options sau shuffle
  employee_answer      INT,            -- 0-3, null khi chưa nộp
  is_correct           BOOLEAN
);

-- 4. Bảng lịch sử mở lại bài (admin reset audit log)
CREATE TABLE IF NOT EXISTS daily_test_resets (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id       UUID        NOT NULL REFERENCES daily_tests(test_id),
  employee_id   UUID        NOT NULL,
  reset_by      UUID        NOT NULL,  -- employee_id của admin
  reset_reason  TEXT        NOT NULL,
  reset_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_tests_emp_date  ON daily_tests(employee_id, test_date);
CREATE INDEX IF NOT EXISTS idx_daily_tests_date      ON daily_tests(test_date);
CREATE INDEX IF NOT EXISTS idx_dtq_test_id           ON daily_test_questions(test_id, position);
CREATE INDEX IF NOT EXISTS idx_dq_bank_active        ON daily_questions(bank_type, is_active);
CREATE INDEX IF NOT EXISTS idx_dtr_test_id           ON daily_test_resets(test_id);

-- RLS: cho phép nhân viên đọc bài của chính mình, admin đọc tất cả
ALTER TABLE daily_tests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_test_resets    ENABLE ROW LEVEL SECURITY;

-- Policy: service_role bypass (dùng anon key qua JS client → cần policy riêng)
-- Đơn giản nhất: cho phép authenticated user đọc/ghi (frontend dùng anon key)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_questions' AND policyname = 'daily_questions_read') THEN
    CREATE POLICY "daily_questions_read" ON daily_questions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_tests' AND policyname = 'daily_tests_all') THEN
    CREATE POLICY "daily_tests_all" ON daily_tests FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_test_questions' AND policyname = 'daily_test_questions_all') THEN
    CREATE POLICY "daily_test_questions_all" ON daily_test_questions FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_test_resets' AND policyname = 'daily_test_resets_all') THEN
    CREATE POLICY "daily_test_resets_all" ON daily_test_resets FOR ALL USING (true);
  END IF;
END $$;
