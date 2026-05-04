-- ============================================================
-- TRAINING PROGRESS TABLE
-- Lưu tiến độ đào tạo của từng nhân viên cho từng khóa học
-- Dùng cho: Báo cáo admin, xuất Excel, theo dõi tiến độ
-- ============================================================

CREATE TABLE IF NOT EXISTS training_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  course_id TEXT NOT NULL,
  video_progress INTEGER DEFAULT 0 CHECK (video_progress >= 0 AND video_progress <= 100),
  quiz_score INTEGER CHECK (quiz_score >= 0 AND quiz_score <= 100),
  quiz_time_seconds INTEGER,
  quiz_completed_at TIMESTAMPTZ,
  quiz_passed BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_course FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
  CONSTRAINT unique_employee_course UNIQUE (employee_id, course_id)
);

-- RLS
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read training_progress" ON training_progress FOR SELECT USING (true);
CREATE POLICY "Allow insert training_progress" ON training_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update training_progress" ON training_progress FOR UPDATE USING (true);

-- ============================================================
-- Chạy trong Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================
