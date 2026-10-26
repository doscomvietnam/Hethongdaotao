-- =====================================================================
-- Chuông thông báo kiểu "Supabase tự đẩy" (Realtime): bật Realtime cho bảng notifications.
-- Web chỉ nhận thông báo của chính người đăng nhập (lọc employee_id + RLS hiện có của bảng).
-- Chạy 1 lần trong Supabase → SQL Editor (project felsyxodddqshxiswqax).
-- =====================================================================
alter publication supabase_realtime add table public.notifications;
