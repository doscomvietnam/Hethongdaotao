-- ============================================================
-- THÊM CỘT MỚI: birth_date, gender, work_location
-- Chạy trong Supabase SQL Editor
-- ============================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Nam', 'Nữ'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_location TEXT;

-- ============================================================
-- CẬP NHẬT DỮ LIỆU NHÂN SỰ
-- ============================================================

UPDATE employees SET birth_date = '1995-09-10', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'manhthangvu888@gmail.com';
UPDATE employees SET birth_date = '2000-08-02', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'vkh280@gmail.com';
UPDATE employees SET birth_date = '1998-08-05', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'tranglinhthinguyen@gmail.com';
UPDATE employees SET birth_date = '1993-05-24', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'anhnguyen.vpc@gmail.com';
UPDATE employees SET birth_date = '2000-07-28', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'kieutung405@gmail.com';
UPDATE employees SET birth_date = '2001-12-17', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'lethithuyeanh1712@gmail.com';
UPDATE employees SET birth_date = '1993-11-18', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'hxduy93@gmail.com';
UPDATE employees SET birth_date = '1995-09-19', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'minhthang0919@gmail.com';
UPDATE employees SET birth_date = '2002-03-05', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'hoangyen.mywork@gmail.com';
UPDATE employees SET birth_date = '1998-02-20', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'ann.long9.9802@gmail.com';
UPDATE employees SET birth_date = '2003-05-29', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'buivanthuc35k1@gmail.com';
UPDATE employees SET birth_date = '2003-11-21', gender = 'Nam', work_location = 'Hồ Chí Minh' WHERE email = 'nghuygtn@gmail.com';
UPDATE employees SET birth_date = '2001-12-09', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'anhtn2001.work@gmail.com';
UPDATE employees SET birth_date = '1999-10-20', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'duchiepmai.ecom@gmail.com';
UPDATE employees SET birth_date = '2000-02-14', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'trongbao142@gmail.com';
UPDATE employees SET birth_date = '2000-08-28', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'doscomhuyen@gmail.com';
UPDATE employees SET birth_date = '1997-01-13', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'thuylinhnguyen13017@gmail.com';
UPDATE employees SET birth_date = '2002-03-24', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'vanpink.tmr@gmail.com';
UPDATE employees SET birth_date = '1997-04-26', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'fbtrantinh5@gmail.com';
UPDATE employees SET birth_date = '2003-08-30', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'quangduyy2003@gmail.com';
UPDATE employees SET birth_date = '2000-01-12', gender = 'Nữ', work_location = 'Hồ Chí Minh' WHERE email = 'thanhtrucnt1201@gmail.com';
UPDATE employees SET birth_date = '2000-08-24', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'buisonxb@gmail.com';
UPDATE employees SET birth_date = '1993-09-25', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'hoangnam25993@gmail.com';
UPDATE employees SET birth_date = '2001-02-20', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'tranmaitthunb2001@gmail.com';
UPDATE employees SET birth_date = '2003-09-05', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'lqa0509@gmail.com';
UPDATE employees SET birth_date = '2003-09-19', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'daohuongmf1992003@gmail.com';
UPDATE employees SET birth_date = '2000-06-23', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'anhhtuss2309@gmail.com';
UPDATE employees SET birth_date = '1999-02-14', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'tranmanhthuyduong1402@gmail.com';
UPDATE employees SET birth_date = '1999-10-14', gender = 'Nam', work_location = 'Hồ Chí Minh' WHERE email = 'leduytutime@gmail.com';
UPDATE employees SET birth_date = '1995-09-15', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'miinm1995@gmail.com';
UPDATE employees SET birth_date = '2003-09-12', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'minhminh12092k3@gmail.com';
UPDATE employees SET birth_date = '2004-05-10', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'nguyenthikimngan10052004@gmail.com';
UPDATE employees SET birth_date = '2003-02-27', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'doanngoc2702@gmail.com';
UPDATE employees SET birth_date = '2004-12-26', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'ngovanphat2612@gmail.com';
UPDATE employees SET birth_date = '2003-10-17', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'nguyenlan2000ts@gmail.com';
UPDATE employees SET birth_date = '2003-04-29', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'minhhuong.content@gmail.com';
UPDATE employees SET birth_date = '2004-05-19', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'vuquynhtrang1924@gmail.com';
UPDATE employees SET birth_date = '2002-10-20', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'tranphuongnam.2010tb@gmail.com';
UPDATE employees SET birth_date = '2000-09-10', gender = 'Nam', work_location = 'Hà Nội' WHERE email = 'tuanhoang10900@gmail.com';
UPDATE employees SET birth_date = '2003-01-02', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'ngochsnoitru@gmail.com';
UPDATE employees SET birth_date = '2000-07-16', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'phuongdoanova@gmail.com';
UPDATE employees SET birth_date = '2005-08-08', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'caohoangmacuyen@gmail.com';
UPDATE employees SET birth_date = '2002-05-07', gender = 'Nữ', work_location = 'Hà Nội' WHERE email = 'btathuong075@gmail.com';
