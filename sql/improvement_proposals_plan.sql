-- =====================================================================
-- ĐỀ XUẤT CẢI TIẾN — bổ sung "Phương án triển khai" + file đính kèm.
-- attachments = [{ path, name, size }] — file nằm trong bucket riêng tư 'proposal-files'
-- (tải lên bằng link ký sẵn do api/redeem.ts cấp; xem bằng link tạm 1 giờ).
-- Chạy 1 lần trong Supabase → SQL Editor (project felsyxodddqshxiswqax).
-- =====================================================================
alter table public.improvement_proposals add column if not exists plan text;
alter table public.improvement_proposals add column if not exists attachments jsonb not null default '[]'::jsonb;

-- Bucket riêng tư chứa file đính kèm (tối đa 10 MB/file)
insert into storage.buckets (id, name, public, file_size_limit)
values ('proposal-files', 'proposal-files', false, 10485760)
on conflict (id) do nothing;
