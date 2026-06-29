-- ============================================================
-- RESET PENDING TEST SESSIONS
-- Chạy sau khi fix bug shuffle options
-- Chỉ xóa session "pending" (chưa nộp), session đã nộp giữ nguyên
-- ============================================================

-- Reset onboarding test sessions đang pending
DELETE FROM onboarding_test_questions
WHERE test_id IN (
  SELECT test_id FROM onboarding_tests WHERE status = 'pending'
);
DELETE FROM onboarding_tests WHERE status = 'pending';

-- Reset daily test sessions đang pending (hôm nay)
DELETE FROM daily_test_questions
WHERE test_id IN (
  SELECT test_id FROM daily_tests WHERE status = 'pending'
);
DELETE FROM daily_tests WHERE status = 'pending';
