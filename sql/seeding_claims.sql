-- =====================================================================
-- GIỮ CHỖ SEEDING: bấm "Mở link" = giữ 1 chỗ trên link trong ngày (hết hạn sau 10 phút nếu không nộp).
-- Mỗi link tối đa 2 lượt/ngày tính cả người ĐÃ NỘP + người ĐANG GIỮ CHỖ → người thứ 3 bị báo đủ ngay khi bấm.
-- Truy cập qua serverless api/seeding.ts (service_role) → bật RLS, không tạo policy.
-- Chạy 1 lần trong Supabase → SQL Editor (project felsyxodddqshxiswqax).
-- =====================================================================
create table if not exists public.seeding_claims (
  id          uuid primary key default gen_random_uuid(),
  link_id     uuid not null references public.seeding_links(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  task_date   date not null,
  claimed_at  timestamptz not null default now(),
  unique (link_id, employee_id, task_date)
);

create index if not exists seeding_claims_date_idx on public.seeding_claims (task_date, link_id);

alter table public.seeding_claims enable row level security;
