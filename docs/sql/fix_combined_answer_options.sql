-- Fix 2 câu hỏi có option dạng "Cả A và B đều đúng" bị lỗi khi shuffle
-- Chạy trong Supabase SQL Editor

UPDATE daily_questions
SET option_c = 'Cả trao đổi/cho mượn tài sản lẫn di chuyển tài sản tùy tiện đều bị cấm'
WHERE question_text = 'Theo nguyên tắc sử dụng tài sản, hành vi nào sau đây cán bộ nhân viên KHÔNG được tự ý thực hiện?'
  AND bank_type = 'general';

UPDATE daily_questions
SET option_c = 'Cả hai trường hợp: đi đủ đúng giờ VÀ không mắc lỗi đều được cộng 0.5 điểm (mỗi trường hợp tính độc lập)'
WHERE question_text = 'Doscom quy định về điểm thưởng ra sao? Trường hợp nào nhân viên được cộng 0.5 điểm thưởng vào quỹ lương tuần?'
  AND bank_type = 'general';
