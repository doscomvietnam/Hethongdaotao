-- Fix: Cho phép nhân viên tự xóa flag must_change_password của chính mình
-- Vấn đề: RLS policy "admin_update_employees" chỉ cho phép admin/manager UPDATE employees
-- → khi nhân viên thường đổi mật khẩu, bước cập nhật must_change_password bị block
--
-- Giải pháp: SECURITY DEFINER function chạy với quyền owner (bypass RLS),
-- chỉ cho phép xóa must_change_password của chính người đang đăng nhập.

CREATE OR REPLACE FUNCTION clear_own_must_change_password()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE employees
  SET must_change_password = false
  WHERE auth_user_id = auth.uid();
END;
$$;

-- Cấp quyền gọi cho tất cả user đã đăng nhập
GRANT EXECUTE ON FUNCTION clear_own_must_change_password() TO authenticated;
