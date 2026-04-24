-- ============================================================
-- SUPABASE MIGRATION: Google Sheets → PostgreSQL
-- Project: LMS_DOSCOM
-- Date: 2026-04-24
-- ============================================================
-- Hướng dẫn: Copy toàn bộ file này và paste vào Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- ============================================================
-- PHẦN 1: TẠO BẢNG (SCHEMA)
-- ============================================================

-- Bảng products (Sản phẩm)
CREATE TABLE IF NOT EXISTS products (
  product_id TEXT PRIMARY KEY,
  product_code TEXT,
  product_name TEXT NOT NULL,
  brand TEXT DEFAULT 'Doscom',
  category TEXT,
  short_description TEXT,
  feature_1 TEXT,
  feature_2 TEXT,
  feature_3 TEXT,
  feature_4 TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng courses (Khóa học)
CREATE TABLE IF NOT EXISTS courses (
  course_id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(product_id),
  course_name TEXT NOT NULL,
  course_type TEXT,
  brand TEXT DEFAULT 'Doscom',
  category TEXT,
  thumbnail_url TEXT,
  slide_url TEXT,
  video_url TEXT,
  quiz_id TEXT,
  is_required TEXT DEFAULT 'no',
  pass_score TEXT DEFAULT '80',
  max_attempts TEXT DEFAULT '2',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng quizzes (Bài kiểm tra)
CREATE TABLE IF NOT EXISTS quizzes (
  quiz_id TEXT PRIMARY KEY,
  course_id TEXT,
  quiz_title TEXT NOT NULL,
  pass_score TEXT DEFAULT '80',
  max_attempts TEXT DEFAULT '2',
  total_questions TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng quiz_questions (Câu hỏi kiểm tra)
CREATE TABLE IF NOT EXISTS quiz_questions (
  id SERIAL PRIMARY KEY,
  question_id TEXT,
  quiz_id TEXT REFERENCES quizzes(quiz_id),
  course_id TEXT,
  question_text TEXT NOT NULL,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer TEXT DEFAULT 'A',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PHẦN 2: BẬT ROW LEVEL SECURITY (cho phép đọc public)
-- ============================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- Policy cho phép đọc public (anon/publishable key)
CREATE POLICY "Allow public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public read courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Allow public read quizzes" ON quizzes FOR SELECT USING (true);
CREATE POLICY "Allow public read quiz_questions" ON quiz_questions FOR SELECT USING (true);

-- ============================================================
-- PHẦN 3: NHẬP DỮ LIỆU (SEED DATA từ Google Sheets)
-- ============================================================

-- === Products ===
INSERT INTO products (product_id, product_code, product_name, brand, category, short_description, feature_1, feature_2, feature_3, feature_4, thumbnail_url, status)
VALUES
  ('P_DA8.1', 'DA8.1', 'Camera wifi Doscom DA8.1', 'Doscom', 'Camera',
   'Camera Wifi DA8.1 Doscom là thiết bị gọi video 2 chiều chuyên dụng được thiết kế đặc biệt để giúp người già và trẻ nhỏ có thể liên lạc khẩn cấp với người thân một cách dễ dàng.',
   'Gọi video 2 chiều chỉ với 1 nút bấm',
   'Giám sát toàn cảnh không điểm mù',
   'Phát hiện và theo dõi chuyển động thông minh',
   'Tầm nhìn ban đêm sắc nét bằng hồng ngoại',
   'https://drive.google.com/file/d/1pWnbz2dZ1aaQggKPV48Seshe41fMwVnV/view?usp=sharing',
   'active'),

  ('P_DA6', 'DA6', 'Camera 4G Doscom DA6', 'Doscom', 'Camera',
   'Camera DA6 Doscom là giải pháp giám sát an ninh chuyên dụng cho các khu vực ngoài trời, đặc biệt là những nơi không có kết nối Wi-Fi hoặc khó khăn trong việc kéo đường điện lưới',
   'Kết nối 4G độc lập',
   'Dung lượng pin khủng và hỗ trợ năng lượng mặt trời',
   'Góc nhìn rộng và hình ảnh sắc nét',
   'Cảnh báo thông minh và hồng ngoại ẩn',
   'https://drive.google.com/file/d/1pWnbz2dZ1aaQggKPV48Seshe41fMwVnV/view?usp=sharing',
   'active');

-- === Courses ===
INSERT INTO courses (course_id, product_id, course_name, course_type, brand, category, thumbnail_url, slide_url, video_url, quiz_id, is_required, pass_score, max_attempts, status)
VALUES
  ('C_DA8.1', 'P_DA8.1', 'Đào tạo về Camera DA8.1', 'product', 'Doscom', 'Camera',
   'https://drive.google.com/file/d/1pWnbz2dZ1aaQggKPV48Seshe41fMwVnV/view?usp=sharing',
   'https://drive.google.com/file/d/1-6sV4RQiolsn9O66kv3oQsoBWOEm-31l/view?usp=sharing',
   'https://drive.google.com/file/d/154KBH8F1qonBaVeLIsldWQieZ74d2Mh_/view?usp=sharing',
   'Q_DA8.1', 'yes', '80', '2', 'active'),

  ('C_DA6', 'P_DA6', 'Đào tạo về Camera DA6', 'product', 'Doscom', 'Camera',
   'https://drive.google.com/file/d/1pWnbz2dZ1aaQggKPV48Seshe41fMwVnV/view?usp=sharing',
   'https://drive.google.com/file/d/1QYQWYhswkyyfTM25Tdy1V5QlUKJ6vbYF/view?usp=sharing',
   'https://drive.google.com/file/d/1H8NoUqk3YoSonU2A7rokfJ1uVKsJxOKp/view?usp=sharing',
   'Q_DA6', 'yes', '80', '2', 'active');

-- === Quizzes ===
INSERT INTO quizzes (quiz_id, course_id, quiz_title, pass_score, max_attempts, total_questions, status)
VALUES
  ('Q_DA8.1', 'C_DA8.1', 'Bài kiểm tra Camera DA8.1', '80', '2', '10', 'active'),
  ('Q_DA6', 'C_DA6', 'Bài kiểm tra Camera DA6', '80', '2', '10', 'active');

-- === Quiz Questions - Camera DA8.1 ===
INSERT INTO quiz_questions (question_id, quiz_id, course_id, question_text, option_a, option_b, option_c, option_d, correct_answer, status)
VALUES
  ('QQ_DA8.1_01', 'Q_DA8.1', 'C_DA8.1',
   'Tính năng nào của Camera DA8.1 được thiết kế đặc biệt để đơn giản hóa việc liên lạc cho người già và trẻ nhỏ?',
   'Công nghệ theo dõi vận chuyển thông minh',
   'Góc nhìn rộng 140 độ bao quát toàn cảnh',
   'Gọi video 2 chiều chỉ với 1 nút bấm',
   'Tầm nhìn đêm sắc nét bằng đèn hồng ngoại',
   'C', 'active'),

  ('QQ_DA8.1_02', 'Q_DA8.1', 'C_DA8.1',
   'Camera DA8.1 có khả năng xoay ngang (pan) và xoay dọc (tilt) với góc tối đa là bao nhiêu?',
   'Xoay ngang 140 độ và xoay dọc 90 độ',
   'Xoay ngang 360 độ và xoay dọc 90 độ',
   'Xoay ngang 350 độ và xoay dọc 90 độ',
   'Xoay ngang 90 độ và xoay dọc 350 độ',
   'C', 'active'),

  ('QQ_DA8.1_03', 'Q_DA8.1', 'C_DA8.1',
   'Ứng dụng di động nào được sử dụng để kết nối và quản lý Camera DA8.1?',
   'Mi Home',
   'EZVIZ',
   'Yoosee',
   'Im Cam',
   'D', 'active'),

  ('QQ_DA8.1_04', 'Q_DA8.1', 'C_DA8.1',
   'Giá của Camera DA8.1 thay đổi trong khoảng 900.000 ₫ đến 1.150.000 ₫ phụ thuộc vào yếu tố nào?',
   'Dung lượng thẻ nhớ đi kèm.',
   'Vị trí lắp đặt (Hà Nội hay TP.HCM).',
   'Màu sắc của sản phẩm.',
   'Gói bảo hành mở rộng.',
   'A', 'active'),

  ('QQ_DA8.1_05', 'Q_DA8.1', 'C_DA8.1',
   'Camera DA8.1 hỗ trợ thẻ nhớ MicroSD với dung lượng lưu trữ tối đa là bao nhiêu?',
   '512 GB',
   '256 GB',
   '128GB',
   '64 GB',
   'B', 'active'),

  ('QQ_DA8.1_06', 'Q_DA8.1', 'C_DA8.1',
   'Chính sách bảo hành ''lỗi 1 đổi 1'' có hiệu lực trong bao lâu kể từ ngày mua?',
   '12 tháng',
   '6 tháng',
   '90 ngày',
   '30 ngày',
   'C', 'active'),

  ('QQ_DA8.1_07', 'Q_DA8.1', 'C_DA8.1',
   'Ngoài các gia đình có người già và trẻ nhỏ đối tượng khách hàng nào khác được xem là mục tiêu cho sản phẩm Camera DA8.1?',
   'Các nhiếp ảnh gia chuyên nghiệp.',
   'Các công ty lớn cần hệ thống an ninh phức tạp.',
   'Những người đam mê du lịch cần camera hành trình.',
   'Chủ nhà muốn giám sát người giúp việc hoặc văn phòng nhỏ.',
   'D', 'active'),

  ('QQ_DA8.1_08', 'Q_DA8.1', 'C_DA8.1',
   'Khách hàng được miễn phí vận chuyển khi mua sản phẩm của DOSCOM trong trường hợp nào?',
   'Khi mua kèm thẻ nhớ 128GB.',
   'Cho đơn hàng có giá trị trên 2 triệu đồng.',
   'Đối với tất cả các đơn hàng tại Hà Nội và TP.HCM.',
   'Khi đặt hàng qua hotline 1900638597.',
   'B', 'active'),

  ('QQ_DA8.1_09', 'Q_DA8.1', 'C_DA8.1',
   'Màn hình hiển thị được tích hợp trực tiếp trên thân Camera DA8.1 có kích thước là bao nhiêu?',
   '2.0 inch.',
   '2.4 inch.',
   '2.8 inch',
   '3.5 inch',
   'C', 'active'),

  ('QQ_DA8.1_10', 'Q_DA8.1', 'C_DA8.1',
   'Tính năng "Theo dõi chuyển động thông minh" của camera DA8.1 có khả năng gì nổi bật?',
   'Chỉ phát báo động khi có tiếng động lớn.',
   'Tự động ẩn ống kính khi có người đi vào phòng.',
   'Tự động phát hiện khóa và bám theo chuyển động của con người theo thời gian thực.',
   'Chỉ gửi thông báo mà không ghi lại hình ảnh chuyển động.',
   'C', 'active');

-- === Quiz Questions - Camera DA6 ===
INSERT INTO quiz_questions (question_id, quiz_id, course_id, question_text, option_a, option_b, option_c, option_d, correct_answer, status)
VALUES
  ('QQ_DA6_01', 'Q_DA6', 'C_DA6',
   'Camera DA6 Doscom được thiết kế chuyên dụng cho những khu vực nào theo như mô tả tổng quan về sản phẩm?',
   'Wi-Fi 2.4 GHz.',
   'Wi-Fi 5.0 GHz.',
   'Sử dụng Sim 4G kết nối độc lập.',
   'Sử dụng dây cáp mạng LAN.',
   'C', 'active'),

  ('QQ_DA6_02', 'Q_DA6', 'C_DA6',
   'Dung lượng pin được trang bị cho Camera DA6 là bao nhiêu?',
   '3.000 mAh.',
   '5.000 mAh.',
   '10.400 mAh.',
   '15.600 mAh.',
   'C', 'active'),

  ('QQ_DA6_03', 'Q_DA6', 'C_DA6',
   'Ở chế độ "Chỉ quay khi phát hiện chuyển động" thời lượng pin tối đa của thiết bị có thể lên tới bao nhiêu ngày?',
   '15 ngày.',
   '30 ngày.',
   '45 ngày.',
   '60 ngày.',
   'B', 'active'),

  ('QQ_DA6_04', 'Q_DA6', 'C_DA6',
   'Độ phân giải hình ảnh chuẩn của Camera DA6 là bao nhiêu?',
   '1MP (720P).',
   '2MP (1080P).',
   '3MP - 2K.',
   '5MP.',
   'C', 'active'),

  ('QQ_DA6_05', 'Q_DA6', 'C_DA6',
   'Camera DA6 đạt tiêu chuẩn chống nước và bụi bẩn nào?',
   'IP65.',
   'IP66.',
   'IP67.',
   'IP68.',
   'C', 'active'),

  ('QQ_DA6_06', 'Q_DA6', 'C_DA6',
   'Góc nhìn quan sát bao quát của Camera DA6 là bao nhiêu độ?',
   '90 độ.',
   '110 độ.',
   '120 độ.',
   '140 độ.',
   'D', 'active'),

  ('QQ_DA6_07', 'Q_DA6', 'C_DA6',
   'Đặc điểm nổi bật của tính năng hồng ngoại ban đêm trên Camera DA6 là gì?',
   'Phát ra ánh sáng trắng mạnh.',
   'Hồng ngoại ẩn không phát ra ánh sáng đỏ.',
   'Tầm nhìn xa tối đa chỉ 2 mét.',
   'Chỉ quay được hình ảnh đen trắng vào ban ngày.',
   'B', 'active'),

  ('QQ_DA6_08', 'Q_DA6', 'C_DA6',
   'Người dùng quản lý và xem trực tiếp Camera DA6 qua ứng dụng nào trên điện thoại?',
   'O-KAM pro.',
   'Ubox.',
   'Yoosee.',
   'UCON.',
   'B', 'active'),

  ('QQ_DA6_09', 'Q_DA6', 'C_DA6',
   'Camera DA6 hỗ trợ thẻ nhớ MicroSD với dung lượng lưu trữ tối đa là bao nhiêu?',
   '64GB.',
   '128GB.',
   '256GB.',
   '512GB.',
   'C', 'active'),

  ('QQ_DA6_10', 'Q_DA6', 'C_DA6',
   'Chính sách bảo hành đổi trả 1-1 của Camera DA6 Doscom được áp dụng trong thời gian bao lâu?',
   '30 ngày.',
   '60 ngày.',
   '90 ngày.',
   '12 tháng.',
   'C', 'active');

-- ============================================================
-- PHẦN 4: TẠO STORAGE BUCKET CHO MEDIA (ảnh, video, slide)
-- ============================================================
-- Lưu ý: Storage bucket cần tạo qua Supabase Dashboard
-- Dashboard → Storage → New Bucket → Tên: "media" → Public: ON
-- Sau đó upload ảnh/video vào bucket "media"
-- URL format: https://felsyxodddqshxiswqax.supabase.co/storage/v1/object/public/media/{file_path}

-- ============================================================
-- XONG! Kiểm tra dữ liệu bằng cách chạy:
-- ============================================================
-- SELECT * FROM products;
-- SELECT * FROM courses;
-- SELECT * FROM quizzes;
-- SELECT * FROM quiz_questions;
