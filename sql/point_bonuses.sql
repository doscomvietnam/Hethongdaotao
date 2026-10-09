-- =====================================================================
-- ĐIỂM THƯỞNG: admin cộng điểm cho nhân viên (số điểm + lý do).
-- Tính vào điểm tích lũy / điểm tháng (theo award_date) / bảng xếp hạng.
-- Truy cập qua serverless api/redeem.ts (service_role) → bật RLS, không tạo policy.
-- Chạy 1 lần trong Supabase → SQL Editor (project felsyxodddqshxiswqax).
-- =====================================================================
create table if not exists public.point_bonuses (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  points      integer not null check (points > 0),
  reason      text not null,
  award_date  date not null default ((now() at time zone 'Asia/Ho_Chi_Minh')::date),
  created_at  timestamptz not null default now(),
  created_by  uuid references public.employees(id) on delete set null
);

create index if not exists point_bonuses_emp_idx on public.point_bonuses (employee_id, award_date desc);
create index if not exists point_bonuses_date_idx on public.point_bonuses (award_date desc);

alter table public.point_bonuses enable row level security;
