-- Redeem tickets: batches of single-use codes that grant Premium access.
--
-- Until now Premium came only from a Midtrans payment or from an admin
-- flipping accounts one at a time in /analyst. This lets an admin mint a batch
-- of codes, hand them out, and have users redeem them themselves.
--
-- Codes are single-use: redemption is an atomic conditional UPDATE
-- (status='unused' -> 'redeemed'), so two users submitting the same code
-- concurrently can never both win. See app/api/redeem/route.ts.

create table public.redeem_tickets (
  id            uuid primary key default gen_random_uuid(),
  code          text        not null unique,
  -- The prefix the admin typed, kept so a batch can be traced later.
  batch_label   text,
  duration_days integer     not null check (duration_days > 0),
  status        text        not null default 'unused'
    check (status in ('unused', 'redeemed')),
  redeemed_by   uuid references auth.users (id) on delete set null,
  redeemed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index redeem_tickets_status_idx
  on public.redeem_tickets (status, created_at desc);

-- RLS on with NO policies: users must never read this table (that would leak
-- every unredeemed code). Both the analyst routes and the redeem route go
-- through the service-role client, which bypasses RLS.
alter table public.redeem_tickets enable row level security;

grant all on public.redeem_tickets to service_role;
