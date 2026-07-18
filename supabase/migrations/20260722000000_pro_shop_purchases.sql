-- Pro Shop real-payment fulfillment: e-book delivery + 1-on-1 booking through
-- Midtrans (previously mock-pay only), plus an in-app notification center.

-- E-book download link, filled in per product later; the delivery email shows
-- the download button only when this is set.
alter table public.coaching_products
  add column fulfillment_url text;

-- Contact snapshot captured on the checkout form (the buyer's delivery email
-- may differ from their account email), used by fulfillOrder for delivery.
alter table public.orders
  add column customer_name text,
  add column customer_email text,
  add column customer_whatsapp text;

-- 1-on-1 booking details captured at checkout time. The Midtrans webhook
-- payload carries no scheduling data, so the booking row (with the buyer's
-- preferred dates) is created when the order is placed and only flipped to
-- 'confirmed' on payment. scheduled_at stays null until Faisal fixes the
-- final slot with the buyer over WhatsApp.
alter table public.bookings
  add column order_id uuid references public.orders(id) on delete cascade,
  add column customer_whatsapp text,
  add column domicile text,
  add column topic text,
  add column preferred_dates jsonb;

-- In-app notification center feeding the TopAppBar bell. Populated by the
-- worker jobs and purchase fulfillment via the service role (notifyUser).
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Own-row read + own-row mark-as-read; inserts happen via the service role
-- (bypasses RLS), so no insert policy is needed. Column-level restriction of
-- updates to read_at isn't enforceable via RLS -- mirrors profiles' own-row
-- update policy.
create policy "notifications_own_select" on public.notifications
  for select to authenticated using (auth.uid() = user_id);

create policy "notifications_own_update" on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
