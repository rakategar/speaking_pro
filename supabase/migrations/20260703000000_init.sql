-- Speaking Pro — initial schema
-- Derived from lib/types/database.ts + how the app/api routes read & write.
-- All app writes go through the *user-session* Supabase client, so RLS below
-- must let a user manage their own rows (reports/score_history included).

-- ─────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────

create table public.profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  full_name              text,
  avatar_url             text,
  occupation             text,
  streak_count           integer     not null default 0,
  subscription_tier      text        not null default 'free',
  subscription_renews_at timestamptz,
  created_at             timestamptz not null default now()
);

create table public.coaches (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null,
  headline   text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.coaching_products (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid references public.coaches (id) on delete set null,
  title       text        not null,
  type        text        not null,             -- ebook | video_course | 1on1 | subscription
  description text,
  price_idr   bigint      not null,
  created_at  timestamptz not null default now()
);

create table public.practice_modules (
  id                uuid primary key default gen_random_uuid(),
  slug              text        not null unique,
  title             text        not null,
  category          text        not null,
  difficulty        text        not null default 'beginner',
  duration_minutes  integer     not null default 0,
  is_ai_recommended boolean     not null default false,
  created_at        timestamptz not null default now()
);

create table public.recordings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles (id) on delete cascade,
  module_id        uuid references public.practice_modules (id) on delete set null,
  environment      text,
  duration_seconds double precision,
  storage_path     text,
  status           text        not null default 'uploading',
  created_at       timestamptz not null default now()
);

create table public.reports (
  id                  uuid primary key default gen_random_uuid(),
  recording_id        uuid        not null unique references public.recordings (id) on delete cascade,
  transcript          text,
  overall_score       integer,
  clarity_score       integer,
  confidence_score    integer,
  structure_score     integer,
  intonation_score    integer,
  filler_word_count   integer,
  wpm                 integer,
  next_step_module_id uuid references public.practice_modules (id) on delete set null,
  ai_insights         jsonb       not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create table public.bookings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles (id) on delete cascade,
  product_id   uuid references public.coaching_products (id) on delete set null,
  scheduled_at timestamptz,
  status       text        not null default 'pending',
  created_at   timestamptz not null default now()
);

create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles (id) on delete cascade,
  product_id     uuid references public.coaching_products (id) on delete set null,
  product_type   text        not null,
  amount_idr     bigint      not null,
  payment_method text,
  status         text        not null default 'pending',
  created_at     timestamptz not null default now()
);

create table public.score_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  overall_score integer     not null,
  week_label    text        not null,
  recorded_at   timestamptz not null default now()
);

create index on public.recordings (user_id, created_at desc);
create index on public.score_history (user_id, recorded_at);
create index on public.orders (user_id);
create index on public.bookings (user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Auto-create a profile row when a new auth user signs up
-- ─────────────────────────────────────────────────────────────────────────

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles          enable row level security;
alter table public.coaches           enable row level security;
alter table public.coaching_products enable row level security;
alter table public.practice_modules  enable row level security;
alter table public.recordings        enable row level security;
alter table public.reports           enable row level security;
alter table public.bookings          enable row level security;
alter table public.orders            enable row level security;
alter table public.score_history     enable row level security;

-- Catalog tables: readable by everyone (pages sit behind auth anyway).
create policy "catalog read" on public.practice_modules  for select using (true);
create policy "catalog read" on public.coaches           for select using (true);
create policy "catalog read" on public.coaching_products for select using (true);

-- profiles: a user sees & edits only their own row.
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- recordings: full CRUD on own rows.
create policy "own recordings" on public.recordings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reports: tied to a recording the user owns.
create policy "own reports" on public.reports
  for all
  using (exists (select 1 from public.recordings r where r.id = reports.recording_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.recordings r where r.id = reports.recording_id and r.user_id = auth.uid()));

-- bookings / orders / score_history: own rows only.
create policy "own bookings" on public.bookings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own orders" on public.orders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own score_history" on public.score_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Role grants (this CLI does NOT auto-expose new tables to the API roles;
-- RLS still governs which *rows* each role can touch).
-- ─────────────────────────────────────────────────────────────────────────

grant usage on schema public to anon, authenticated, service_role;

-- Catalog: read-only for anon + authenticated.
grant select on public.practice_modules, public.coaches, public.coaching_products
  to anon, authenticated;

-- User-owned data: full DML for authenticated (rows filtered by RLS).
grant select, insert, update, delete on
  public.profiles, public.recordings, public.reports,
  public.bookings, public.orders, public.score_history
  to authenticated;

-- service_role bypasses RLS and may touch everything.
grant all on all tables in schema public to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Storage: private "recordings" bucket, owner-scoped by {user_id}/ path prefix
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit)
values ('recordings', 'recordings', false, 26214400)
on conflict (id) do nothing;

create policy "own audio read" on storage.objects
  for select using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own audio insert" on storage.objects
  for insert with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own audio update" on storage.objects
  for update using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own audio delete" on storage.objects
  for delete using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);
