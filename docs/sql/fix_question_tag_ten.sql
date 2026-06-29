-- Cập nhật câu hỏi về xử lý tin nhắn khi được tag tên
-- Chạy trong Supabase SQL Editor

UPDATE daily_questions
SET
  question_text = 'Nếu chưa thể trả lời chi tiết nội dung tin nhắn trong nhóm làm việc khi được tag tên, nhân viên cần xử lý như thế nào?',
  option_a      = 'Bỏ qua tin nhắn và trả lời sau.',
  option_b      = 'Chờ đến khi có đầy đủ thông tin chi tiết mới phản hồi.',
  option_c      = 'Chỉ sử dụng emoji để kết thúc cuộc trò chuyện.',
  option_d      = 'Gửi tin nhắn xác nhận tạm thời.',
  correct_answer = 'D'
WHERE question_text = 'Nếu chưa thể trả lời chi tiết nội dung tin nhắn ngay lập tức, nhân viên cần xử lý như thế nào?'
  AND bank_type = 'general';
