-- ============================================================
-- Nhiệm vụ Seeding hàng ngày — tạo 2 bảng (chạy 1 LẦN trong Supabase SQL Editor)
-- Mọi truy cập đi qua serverless (service_role); RLS bật nhưng KHÔNG có policy
-- → client/anon bị chặn hoàn toàn, chỉ endpoint service_role đọc/ghi được (an toàn).
-- ============================================================

create table if not exists public.seeding_links (
  id          uuid primary key default gen_random_uuid(),
  group_key   text not null check (group_key in ('koc','company','competitor')),
  title       text not null,
  url         text not null,
  task_date   date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  max_people  int  not null default 5,
  status      text not null default 'active',     -- 'active' | 'inactive'
  created_at  timestamptz not null default now()
);
create index if not exists idx_seeding_links_date
  on public.seeding_links(task_date, group_key, status);

create table if not exists public.seeding_submissions (
  id            uuid primary key default gen_random_uuid(),
  link_id       uuid not null references public.seeding_links(id) on delete cascade,
  group_key     text not null,
  employee_id   uuid not null,
  task_date     date not null,
  image_path    text,
  status        text not null default 'active',    -- 'active' | 'revoked'
  stars_awarded int  not null default 0,           -- để sẵn cho Giai đoạn 2 (sao)
  submitted_at  timestamptz not null default now(),
  reviewed_by   uuid,
  reviewed_at   timestamptz,
  unique (link_id, employee_id)                    -- mỗi người 1 ảnh / 1 link
);
create index if not exists idx_seeding_sub_link
  on public.seeding_submissions(link_id, status);
create index if not exists idx_seeding_sub_grp
  on public.seeding_submissions(group_key, task_date, status, employee_id);

alter table public.seeding_links       enable row level security;
alter table public.seeding_submissions enable row level security;
