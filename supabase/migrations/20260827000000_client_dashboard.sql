-- B2B client dashboard: the organization's own view of its participants.
--
-- client_organizations (20260826000000) gave participants a badge, but the
-- client itself still had no way to see anything -- every recap had to be
-- produced by hand. These three tables are what /client runs on.

-- Login accounts for the B2B dashboard. Deliberately NOT auth.users: a client
-- PIC must not get a profile, a recording quota, a trial, or any route into
-- the participant app. Keeping them out of auth.users makes that structural
-- rather than a rule someone has to remember.
create table public.client_admins (
  id                   uuid primary key default gen_random_uuid(),
  client_org_id        uuid not null
    references public.client_organizations (id) on delete cascade,
  email                text not null,
  full_name            text,
  -- "scrypt:<saltHex>:<hashHex>" -- same shape as ANALYST_PASSWORD_HASH,
  -- produced by hashPassword() in lib/analyst/auth.ts. The plaintext is
  -- returned exactly once at creation and never stored anywhere.
  password_hash        text not null,
  role                 text not null default 'viewer'
    check (role in ('owner', 'viewer')),
  active               boolean not null default true,
  -- The first password arrives by PDF, so it must be replaced on first login.
  must_change_password boolean not null default true,
  last_login_at        timestamptz,
  created_at           timestamptz not null default now()
);

-- Case-insensitive: people type their own email inconsistently, and two rows
-- differing only in case would be an authentication ambiguity, not a typo.
create unique index client_admins_email_key
  on public.client_admins (lower(email));
create index client_admins_org_idx on public.client_admins (client_org_id);

-- Cached AI narrative per organization + period. Without this every page view
-- burns a Gemini call for prose that has not changed.
create table public.client_ai_reports (
  id            uuid primary key default gen_random_uuid(),
  client_org_id uuid not null
    references public.client_organizations (id) on delete cascade,
  period_days   integer not null,
  payload       jsonb   not null,
  -- SHA-256 of the aggregated facts: identical facts reuse the narrative
  -- instead of paying for a re-run that would say the same thing.
  facts_hash    text    not null,
  created_at    timestamptz not null default now()
);
create index client_ai_reports_idx
  on public.client_ai_reports (client_org_id, period_days, created_at desc);

-- Audit trail for participant broadcasts, and the basis of the daily rate
-- limit. This is the only endpoint that lets someone outside SpeakingPro push
-- a notification to a user's device, so every send leaves a record.
create table public.client_notification_log (
  id              uuid primary key default gen_random_uuid(),
  client_org_id   uuid not null
    references public.client_organizations (id) on delete cascade,
  client_admin_id uuid
    references public.client_admins (id) on delete set null,
  title           text not null,
  body            text not null,
  recipient_count integer not null default 0,
  created_at      timestamptz not null default now()
);
create index client_notification_log_idx
  on public.client_notification_log (client_org_id, created_at desc);

-- RLS on with NO policies on all three: only the service-role client behind
-- /api/client and /api/analyst may touch them. Same posture as
-- redeem_tickets -- leaking client_admins would leak every client's
-- credential hash, and leaking the log would leak participant activity.
alter table public.client_admins           enable row level security;
alter table public.client_ai_reports       enable row level security;
alter table public.client_notification_log enable row level security;

grant all on public.client_admins           to service_role;
grant all on public.client_ai_reports       to service_role;
grant all on public.client_notification_log to service_role;
