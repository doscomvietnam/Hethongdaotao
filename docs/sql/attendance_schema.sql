-- ============================================================
-- ATTENDANCE SCHEMA — Điểm danh nhân viên
-- ============================================================

-- 1. Ngày lễ / nghỉ toàn công ty
CREATE TABLE IF NOT EXISTS company_holidays (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  date       DATE        NOT NULL UNIQUE,
  name       TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Nghỉ cá nhân từng nhân viên
CREATE TABLE IF NOT EXISTS employee_absences (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  note        TEXT        DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_holidays_date    ON company_holidays(date);
CREATE INDEX IF NOT EXISTS idx_absences_emp     ON employee_absences(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_absences_date    ON employee_absences(date);

-- RLS
ALTER TABLE company_holidays   ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_absences  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "holidays_read_all"    ON company_holidays;
DROP POLICY IF EXISTS "holidays_admin_write" ON company_holidays;
DROP POLICY IF EXISTS "absences_read_all"    ON employee_absences;
DROP POLICY IF EXISTS "absences_admin_write" ON employee_absences;

CREATE POLICY "holidays_read_all"    ON company_holidays   FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "holidays_admin_write" ON company_holidays   FOR ALL    USING (current_user_role() IN ('admin','manager'));
CREATE POLICY "absences_read_all"    ON employee_absences  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "absences_admin_write" ON employee_absences  FOR ALL    USING (current_user_role() IN ('admin','manager'));
