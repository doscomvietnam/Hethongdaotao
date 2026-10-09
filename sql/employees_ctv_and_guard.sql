-- =====================================================================
-- 1) Quyền "Cộng tác viên seeding" (nhân viên được gắn link seeding)
-- 2) VÁ BẢO MẬT: chặn nhân viên tự đổi vai trò / phân quyền của mình qua API
--    (trước đây nhân viên gọi API có thể tự set role = 'admin')
-- Chạy 1 lần trong Supabase → SQL Editor (project felsyxodddqshxiswqax).
-- =====================================================================

alter table public.employees
  add column if not exists can_manage_seeding boolean not null default false;

create or replace function public.employees_guard_privileged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  -- Không có người dùng đăng nhập (service_role từ serverless, SQL Editor) → cho phép
  if auth.uid() is null then
    return new;
  end if;

  select e.role into caller_role
  from public.employees e
  where e.auth_user_id = auth.uid()
  limit 1;

  -- Admin: toàn quyền
  if caller_role = 'admin' then
    return new;
  end if;

  -- Quản lý: được sửa nhân viên nhưng không được tạo / sửa / hạ quyền admin
  if caller_role = 'manager' then
    if tg_op = 'INSERT' then
      if new.role = 'admin' then
        raise exception 'Quản lý không được tạo tài khoản admin';
      end if;
      return new;
    end if;
    if (new.role = 'admin' and old.role is distinct from 'admin')
       or (old.role = 'admin' and new.role is distinct from old.role) then
      raise exception 'Quản lý không được thay đổi quyền admin';
    end if;
    return new;
  end if;

  -- Nhân viên thường: không được thêm nhân viên, không được đổi các cột phân quyền
  if tg_op = 'INSERT' then
    raise exception 'Bạn không có quyền thêm nhân viên';
  end if;
  if new.role is distinct from old.role
     or new.can_manage_seeding is distinct from old.can_manage_seeding
     or new.skip_daily_quiz is distinct from old.skip_daily_quiz
     or new.employment_status is distinct from old.employment_status
     or new.auth_user_id is distinct from old.auth_user_id
     or new.department is distinct from old.department then
    raise exception 'Bạn không có quyền thay đổi vai trò / phân quyền / phòng ban';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_employees_guard on public.employees;
create trigger trg_employees_guard
  before insert or update on public.employees
  for each row execute function public.employees_guard_privileged();
