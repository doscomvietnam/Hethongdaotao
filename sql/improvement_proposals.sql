-- =====================================================================
-- ĐỀ XUẤT CẢI TIẾN: nhân viên gửi ý tưởng (Công việc / Nhân sự / Vận hành / Văn hóa),
-- admin chuyển trạng thái Xem xét → Duyệt / Không duyệt. Duyệt kèm điểm thưởng → ghi 1 dòng
-- point_bonuses (bonus_id) nên điểm tự vào Hệ thống điểm, tích lũy và đổi quà.
-- Truy cập qua serverless api/redeem.ts (service_role) → bật RLS, không tạo policy.
-- Chạy 1 lần trong Supabase → SQL Editor (project felsyxodddqshxiswqax).
-- =====================================================================
create table if not exists public.improvement_proposals (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.employees(id) on delete cascade,
  category     text not null check (category in ('work', 'hr', 'operation', 'culture')),
  content      text not null,
  status       text not null default 'reviewing' check (status in ('reviewing', 'approved', 'rejected')),
  points       integer not null default 0 check (points >= 0),
  admin_note   text,
  bonus_id     uuid references public.point_bonuses(id) on delete set null,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid references public.employees(id) on delete set null
);

create index if not exists improvement_proposals_created_idx on public.improvement_proposals (created_at desc);
create index if not exists improvement_proposals_emp_idx on public.improvement_proposals (employee_id, created_at desc);
create index if not exists improvement_proposals_status_idx on public.improvement_proposals (status);

alter table public.improvement_proposals enable row level security;
