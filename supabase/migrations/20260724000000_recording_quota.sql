-- Weekly recording-duration quota for Premium.
--
-- Until now nothing capped how much a Premium user could record: the only
-- limit was a per-recording cap (305s) in /api/recordings, and "Rekaman
-- Mingguan" was display copy only. Premium now records whenever it wants
-- against a 5 min/week duration budget, and can buy more at Rp25.000/5 min.
--
-- Weekly usage is DERIVED (summed from recordings) rather than counted into a
-- column, so it can never drift out of sync with reality. Only purchased
-- seconds need durable state, hence the single balance column below.

alter table public.profiles
  add column if not exists topup_seconds_balance integer not null default 0;

-- Purchasable top-up. Looked up by type, mirroring how the subscription route
-- finds its plan.
insert into public.coaching_products (coach_id, title, type, description, price_idr)
select
  (select id from public.coaches order by created_at limit 1),
  'Tambah Kuota Rekaman 5 Menit',
  'quota_topup',
  'Tambahan 5 menit durasi rekaman. Menit yang dibeli tidak hangus saat kuota mingguan direset.',
  25000
where not exists (
  select 1 from public.coaching_products where type = 'quota_topup'
);

-- ─────────────────────────────────────────────────────────────────────────
-- Quota RPCs
--
-- Both run as security definer so the check-and-debit is one atomic unit that
-- a client can't interleave. consume_recording_quota locks the profile row,
-- so two concurrent uploads can't each see the same remaining balance and
-- both pass.
-- ─────────────────────────────────────────────────────────────────────────

-- Weekly allowance in seconds (5 minutes).
create or replace function public.weekly_quota_seconds()
returns integer language sql immutable as $$ select 300 $$;

-- Monday 00:00 Asia/Jakarta as a timestamptz. Matches the Jakarta-based trial
-- logic; the dashboard's streak week is server-local and unrelated.
create or replace function public.jakarta_week_start(p_now timestamptz default now())
returns timestamptz language sql stable as $$
  select date_trunc('week', (p_now at time zone 'Asia/Jakarta')) at time zone 'Asia/Jakarta'
$$;

-- Attempts to spend p_seconds. Spends the weekly allowance first and only
-- dips into purchased seconds for the overflow. Returns `debited` so the
-- caller can refund exactly what was taken if the upload then fails.
create or replace function public.consume_recording_quota(
  p_user_id uuid,
  p_seconds integer
)
returns table (
  allowed boolean,
  weekly_remaining integer,
  topup_balance integer,
  debited integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week_start timestamptz;
  v_weekly_used integer;
  v_weekly_remaining integer;
  v_balance integer;
  v_overflow integer;
begin
  -- Serialize concurrent uploads for this user.
  select coalesce(p.topup_seconds_balance, 0) into v_balance
  from public.profiles p
  where p.id = p_user_id
  for update;

  if not found then
    return query select false, 0, 0, 0;
    return;
  end if;

  v_week_start := public.jakarta_week_start();

  -- Drill logs carry a client-reported duration but no audio; they are
  -- practice records, not studio recordings, so they don't spend quota.
  select coalesce(sum(r.duration_seconds), 0)::integer into v_weekly_used
  from public.recordings r
  where r.user_id = p_user_id
    and r.status <> 'drill_completed'
    and r.created_at >= v_week_start;

  v_weekly_remaining := greatest(0, public.weekly_quota_seconds() - v_weekly_used);

  if p_seconds > v_weekly_remaining + v_balance then
    return query select false, v_weekly_remaining, v_balance, 0;
    return;
  end if;

  v_overflow := greatest(0, p_seconds - v_weekly_remaining);
  if v_overflow > 0 then
    update public.profiles
      set topup_seconds_balance = topup_seconds_balance - v_overflow
      where id = p_user_id
      returning topup_seconds_balance into v_balance;
  end if;

  return query select
    true,
    greatest(0, v_weekly_remaining - p_seconds),
    v_balance,
    v_overflow;
end;
$$;

-- Credits purchased seconds. Also used to refund an exact debit when an
-- upload fails after quota was already spent.
create or replace function public.add_topup_seconds(
  p_user_id uuid,
  p_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_seconds is null or p_seconds <= 0 then
    select coalesce(topup_seconds_balance, 0) into v_balance
    from public.profiles where id = p_user_id;
    return coalesce(v_balance, 0);
  end if;

  update public.profiles
    set topup_seconds_balance = topup_seconds_balance + p_seconds
    where id = p_user_id
    returning topup_seconds_balance into v_balance;

  return coalesce(v_balance, 0);
end;
$$;

revoke all on function public.consume_recording_quota(uuid, integer) from public;
revoke all on function public.add_topup_seconds(uuid, integer) from public;

-- Called only from server routes (session-scoped or service-role client).
grant execute on function public.consume_recording_quota(uuid, integer) to authenticated, service_role;
grant execute on function public.add_topup_seconds(uuid, integer) to service_role;
grant execute on function public.jakarta_week_start(timestamptz) to authenticated, service_role;
grant execute on function public.weekly_quota_seconds() to authenticated, service_role;
