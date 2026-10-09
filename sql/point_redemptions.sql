-- =====================================================================
-- ĐỔI QUÀ bằng điểm: nhân viên gửi yêu cầu, admin duyệt (trừ điểm) / từ chối (có lý do).
-- Truy cập qua serverless api/redeem.ts (service_role) → bật RLS, không tạo policy.
-- Chạy 1 lần trong Supabase → SQL Editor (project felsyxodddqshxiswqax).
-- =====================================================================
create table if not exists public.point_redemptions (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  gift_name     text not null,
  gift_link     text,
  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  points_spent  integer not null default 0 check (points_spent >= 0),
  reject_reason text,
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid references public.employees(id) on delete set null
);

create index if not exists point_redemptions_emp_idx on public.point_redemptions (employee_id, created_at desc);
create index if not exists point_redemptions_status_idx on public.point_redemptions (status, created_at desc);

alter table public.point_redemptions enable row level security;
