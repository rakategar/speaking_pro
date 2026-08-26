-- Leaderboard: a public ranking of every user by accumulated practice points.
--
-- Points = the sum of every AI analysis score the user has ever earned
-- (score_history.overall_score, one row appended per successful analysis in
-- lib/analysis/pipeline.ts) + a small flat award per completed drill.
--
-- Drills are self-reported client-side rows (recordings.status =
-- 'drill_completed', no audio and no report), so they are deliberately worth
-- far less than a scored session: they should reward showing up daily
-- without letting anyone climb the board by tapping "selesai" repeatedly.
--
-- This has to be SECURITY DEFINER. Every relevant table is owner-scoped by
-- RLS (profiles: `auth.uid() = id`), so no session client can read another
-- user's name, avatar, or scores. Rather than open those policies up -- which
-- would expose far more than a leaderboard needs -- this function is the one
-- narrow, explicit window: it returns display name, avatar, and point totals
-- only. No email, no subscription tier, nothing from auth.users.
--
-- Follows the same hardening as consume_recording_quota in
-- 20260724000000_recording_quota.sql: pinned search_path, revoked from
-- public, then granted explicitly.

create or replace function public.leaderboard(p_limit integer default 100)
returns table (
  rank bigint,
  user_id uuid,
  full_name text,
  avatar_url text,
  points bigint,
  session_count bigint,
  drill_count bigint,
  best_score integer
)
language sql
stable
security definer
set search_path = public
as $$
  with scores as (
    select
      sh.user_id,
      sum(sh.overall_score)::bigint as score_points,
      count(*)::bigint              as session_count,
      max(sh.overall_score)         as best_score
    from public.score_history sh
    group by sh.user_id
  ),
  drills as (
    select
      r.user_id,
      count(*)::bigint as drill_count
    from public.recordings r
    where r.status = 'drill_completed'
    group by r.user_id
  ),
  totals as (
    select
      p.id,
      p.full_name,
      p.avatar_url,
      (coalesce(s.score_points, 0) + 10 * coalesce(d.drill_count, 0))::bigint as points,
      coalesce(s.session_count, 0)::bigint as session_count,
      coalesce(d.drill_count, 0)::bigint   as drill_count,
      s.best_score
    from public.profiles p
    left join scores s on s.user_id = p.id
    left join drills d on d.user_id = p.id
  )
  select
    rank() over (order by t.points desc, t.session_count desc, t.id) as rank,
    t.id,
    t.full_name,
    t.avatar_url,
    t.points,
    t.session_count,
    t.drill_count,
    t.best_score
  from totals t
  where t.points > 0
  order by t.points desc, t.session_count desc, t.id
  limit greatest(p_limit, 1);
$$;

revoke all on function public.leaderboard(integer) from public;
grant execute on function public.leaderboard(integer) to authenticated, service_role;

-- The two aggregates above scan the whole of score_history / recordings on
-- every call. Both are small today, and this keeps them cheap as they grow.
create index if not exists score_history_user_score_idx
  on public.score_history (user_id, overall_score);

create index if not exists recordings_drill_completed_idx
  on public.recordings (user_id)
  where status = 'drill_completed';
