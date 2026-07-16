-- User-submitted problem reports (the "Laporkan Masalah" form under /help).
-- Users can insert + read their own; the super-admin (analyst) inbox reads
-- and updates status via the service-role client, which bypasses RLS.

create table public.problem_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  message text not null,
  screenshot_url text,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);

create index problem_reports_status_idx
  on public.problem_reports (status, created_at desc);

alter table public.problem_reports enable row level security;

create policy "problem_reports_own" on public.problem_reports
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.problem_reports to authenticated;
grant all on public.problem_reports to service_role;

-- Public bucket for report screenshots (viewed in the admin inbox). Writes
-- are owner-scoped by the {user_id}/ path prefix; read is public.
insert into storage.buckets (id, name, public, file_size_limit)
values ('report-attachments', 'report-attachments', true, 2097152) -- 2 MB
on conflict (id) do nothing;

create policy "report attachments public read" on storage.objects
  for select using (bucket_id = 'report-attachments');
create policy "report attachments own insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'report-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
