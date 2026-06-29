-- ============================================================
-- RESET ONBOARDING TEST (dùng khi test, chạy trước khi test lại)
-- Xoá test session cũ để hệ thống tạo test mới với 30 câu
-- ============================================================

-- Xoá toàn bộ session test onboarding (cho tất cả nhân viên)
-- Dùng khi cần reset để tạo lại với bộ câu hỏi mới
DELETE FROM onboarding_test_questions
WHERE test_id IN (SELECT test_id FROM onboarding_tests);

DELETE FROM onboarding_tests;

-- Nếu chỉ muốn reset cho 1 nhân viên cụ thể, thay bằng:
-- DELETE FROM onboarding_test_questions
-- WHERE test_id IN (
--   SELECT test_id FROM onboarding_tests WHERE employee_id = 'EMPLOYEE_ID_ĐÂY'
-- );
-- DELETE FROM onboarding_tests WHERE employee_id = 'EMPLOYEE_ID_ĐÂY';
