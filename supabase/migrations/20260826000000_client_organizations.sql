-- Client organizations: the B2B badge.
--
-- The app is being sold to organizations (first: Kementerian Kehutanan) whose
-- participants use it alongside ordinary public users. Until now the only
-- status marker on a profile was subscription_tier, which cannot tell a
-- ministry participant apart from someone who bought Premium themselves.
--
-- Modelled as a table rather than a free-text column on profiles so an
-- organization can be renamed once and change everywhere, and so the analyst
-- dashboard offers a dropdown instead of an input nobody spells consistently.
--
-- Tickets carry an optional organization too: a batch minted for a client
-- grants the badge at redemption time, alongside Premium. See
-- app/api/redeem/route.ts.

create table public.client_organizations (
  id           uuid        primary key default gen_random_uuid(),
  -- Displayed on the user's profile in place of the "Premium" pill.
  name         text        not null,
  -- Optional shorter form for narrow surfaces ("KLHK").
  short_name   text,
  accent_color text        not null default '#00629d',
  -- Retired clients stay referenced by historical profiles; hiding them from
  -- the picker is what `active` is for, not deletion.
  active       boolean     not null default true,
  created_at   timestamptz not null default now()
);

-- Case-insensitive: "Kementerian Kehutanan" and "kementerian kehutanan" are
-- the same client, and two near-identical pills would be a support problem.
create unique index client_organizations_name_key
  on public.client_organizations (lower(name));

alter table public.profiles
  add column client_org_id uuid
    references public.client_organizations (id) on delete set null;

-- Partial: the overwhelming majority of profiles are public users with NULL
-- here, and the only query that matters is "who belongs to this client".
create index profiles_client_org_idx
  on public.profiles (client_org_id)
  where client_org_id is not null;

alter table public.redeem_tickets
  add column client_org_id uuid
    references public.client_organizations (id) on delete set null;

-- Readable by any signed-in user: the profile page renders the org name via a
-- join, and an organization's name is not sensitive. Writes are deliberately
-- policy-less, so only the service-role client behind /api/analyst can create,
-- rename, or delete a client.
alter table public.client_organizations enable row level security;

create policy "read client organizations" on public.client_organizations
  for select to authenticated using (true);

grant select on public.client_organizations to authenticated;
grant all    on public.client_organizations to service_role;
