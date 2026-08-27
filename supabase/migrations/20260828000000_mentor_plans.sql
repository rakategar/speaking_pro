-- Cache for the "Mentor AI" page (/library).
--
-- The three recommended modules are derived deterministically from the user's
-- latest report (lib/mentor/plan.ts) -- that part is free and instant. What is
-- cached here is the Gemini-written explanation around them: a report never
-- changes once written, so its narrative only ever needs to be generated once.
create table public.mentor_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- Null for a user who has no analysed recording yet: they still get a
  -- balanced starter plan, and it is still worth not re-generating it.
  report_id  uuid references public.reports (id) on delete cascade,
  slugs      text[] not null,
  payload    jsonb  not null,   -- MentorNote
  created_at timestamptz not null default now()
);

-- One row per (user, source report). coalesce() rather than a plain unique
-- index because NULLs are never equal to each other in a unique index, which
-- would let a report-less user accumulate a new row on every page load.
create unique index mentor_plans_user_report_key
  on public.mentor_plans (
    user_id,
    coalesce(report_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- RLS on with NO policies, and no grant to anon/authenticated: service-role
-- only, the same posture as client_admins and client_ai_reports. Nothing in
-- the browser reads this table -- the page reads it server-side and
-- app/api/mentor/route.ts writes it -- so there is no client grant to give.
-- A policy here would be unreachable dead code that implies the opposite.
alter table public.mentor_plans enable row level security;

grant all on public.mentor_plans to service_role;
