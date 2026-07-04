-- Async analysis queue + web push subscriptions.
-- Jobs are picked up serially by the in-process worker (lib/queue/worker.ts),
-- which owns all Gemini traffic and enforces the free-tier rate limits.

create table public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null unique references public.recordings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'done', 'failed')),
  attempts integer not null default 0,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index analysis_jobs_pick_idx
  on public.analysis_jobs (status, next_attempt_at, created_at);
create index analysis_jobs_user_active_idx
  on public.analysis_jobs (user_id)
  where status in ('queued', 'processing');

alter table public.analysis_jobs enable row level security;

create policy "analysis_jobs_select_own" on public.analysis_jobs
  for select to authenticated using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select on public.analysis_jobs to authenticated;
grant all on public.analysis_jobs to service_role;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_own" on public.push_subscriptions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
