-- One-time "1-month Premium program completion" certificate. Unlike
-- weekly_summaries (repeating, one row per week_index), this is a single
-- milestone per user -- unique(user_id) is the idempotency guard.

create table public.monthly_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  period_start timestamptz not null,
  period_end timestamptz not null,
  storage_path text not null,
  session_count integer not null default 0,
  average_score integer,
  badge_tier text not null check (badge_tier in ('bronze', 'silver', 'gold')),
  created_at timestamptz not null default now()
);

alter table public.monthly_certificates enable row level security;

create policy "monthly_certificates_own_select" on public.monthly_certificates
  for select to authenticated using (auth.uid() = user_id);

grant select on public.monthly_certificates to authenticated;
grant all on public.monthly_certificates to service_role;

-- Private bucket (premium content), owner-scoped read, mirrors weekly-summaries.
insert into storage.buckets (id, name, public, file_size_limit)
values ('monthly-certificates', 'monthly-certificates', false, 5242880) -- 5 MB
on conflict (id) do nothing;

create policy "monthly certificates own read" on storage.objects
  for select using (bucket_id = 'monthly-certificates' and (storage.foldername(name))[1] = auth.uid()::text);
