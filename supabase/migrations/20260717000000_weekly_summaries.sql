-- Weekly summary PDFs for Premium subscribers, generated once per week on
-- the user's personal subscription anniversary (day 7, 14, 21...), never
-- reset by renewals -- see subscription_started_at usage in the payment
-- activation routes.

alter table public.profiles
  add column subscription_started_at timestamptz;

create table public.weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_index integer not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  storage_path text not null,
  session_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, week_index)
);

create index weekly_summaries_user_idx
  on public.weekly_summaries (user_id, week_index desc);

alter table public.weekly_summaries enable row level security;

create policy "weekly_summaries_own_select" on public.weekly_summaries
  for select to authenticated using (auth.uid() = user_id);

grant select on public.weekly_summaries to authenticated;
grant all on public.weekly_summaries to service_role;

-- Private bucket (premium content), owner-scoped read, mirrors "recordings".
insert into storage.buckets (id, name, public, file_size_limit)
values ('weekly-summaries', 'weekly-summaries', false, 5242880) -- 5 MB
on conflict (id) do nothing;

create policy "weekly summaries own read" on storage.objects
  for select using (bucket_id = 'weekly-summaries' and (storage.foldername(name))[1] = auth.uid()::text);
