-- ============================================================
-- UPDATE MEDIA URLs: Google Drive → Supabase Storage
-- Chạy trên Supabase SQL Editor sau khi đã upload files
-- ============================================================

-- === THUMBNAIL (dùng chung cho cả products và courses) ===
UPDATE products 
SET thumbnail_url = 'https://felsyxodddqshxiswqax.supabase.co/storage/v1/object/public/media/20260421-120138.png' 
WHERE product_id IN ('P_DA8.1', 'P_DA6');

UPDATE courses 
SET thumbnail_url = 'https://felsyxodddqshxiswqax.supabase.co/storage/v1/object/public/media/20260421-120138.png' 
WHERE course_id IN ('C_DA8.1', 'C_DA6');

-- === SLIDE URLs ===
UPDATE courses 
SET slide_url = 'https://felsyxodddqshxiswqax.supabase.co/storage/v1/object/public/media/thumbnails/DA81.pdf' 
WHERE course_id = 'C_DA8.1';

UPDATE courses 
SET slide_url = 'https://felsyxodddqshxiswqax.supabase.co/storage/v1/object/public/media/thumbnails/DA6.pdf' 
WHERE course_id = 'C_DA6';

-- === VIDEO URLs ===
UPDATE courses 
SET video_url = 'https://felsyxodddqshxiswqax.supabase.co/storage/v1/object/public/media/thumbnails/slides/Camera_DA8.mp4' 
WHERE course_id = 'C_DA8.1';

UPDATE courses 
SET video_url = 'https://felsyxodddqshxiswqax.supabase.co/storage/v1/object/public/media/thumbnails/slides/DA6_wifi.mp4' 
WHERE course_id = 'C_DA6';

-- ============================================================
-- VERIFY: Kiểm tra URLs đã update
-- ============================================================
SELECT product_id, product_name, thumbnail_url FROM products;
SELECT course_id, course_name, thumbnail_url, slide_url, video_url FROM courses;
