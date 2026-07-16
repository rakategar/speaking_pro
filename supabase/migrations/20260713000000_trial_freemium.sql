-- Freemium 7-day trial: profile trial window + fixed daily-unlock sequence
-- for practice_modules. Trial starts at onboarding completion, not signup
-- (set in app/api/onboarding/route.ts).

alter table public.profiles
  add column trial_started_at  timestamptz,
  add column trial_ends_at     timestamptz,
  add column trial_nudges_seen jsonb not null default '{}'::jsonb;

alter table public.practice_modules
  add column trial_sequence smallint unique;

-- Fixed cumulative unlock ladder, 3/day, ~15 min/day, across the 19
-- non-studio catalog modules. free-recording is deliberately excluded --
-- Recording Studio access is its own trial perk (30s cap), available from
-- day 1, not gated by this module sequence (see lib/trial/status.ts).
update public.practice_modules set trial_sequence = 1  where slug = 'aiueo-drill';
update public.practice_modules set trial_sequence = 2  where slug = 'breathing-control';
update public.practice_modules set trial_sequence = 3  where slug = 'articulation-exercise';
update public.practice_modules set trial_sequence = 4  where slug = 'pronunciation-practice';
update public.practice_modules set trial_sequence = 5  where slug = 'pause-technique';
update public.practice_modules set trial_sequence = 6  where slug = 'rhythm-training';
update public.practice_modules set trial_sequence = 7  where slug = 'confidence-drill';
update public.practice_modules set trial_sequence = 8  where slug = 'self-recording-practice';
update public.practice_modules set trial_sequence = 9  where slug = 'guided-speaking';
update public.practice_modules set trial_sequence = 10 where slug = 'dynamic-pitch';
update public.practice_modules set trial_sequence = 11 where slug = 'vocal-variety';
update public.practice_modules set trial_sequence = 12 where slug = 'emphasis-training';
update public.practice_modules set trial_sequence = 13 where slug = 'energy-control';
update public.practice_modules set trial_sequence = 14 where slug = 'pause-mastery';
update public.practice_modules set trial_sequence = 15 where slug = 'structured-thinking';
update public.practice_modules set trial_sequence = 16 where slug = 'speaking-awareness';
update public.practice_modules set trial_sequence = 17 where slug = 'story-structure';
update public.practice_modules set trial_sequence = 18 where slug = 'framework-speaking';
update public.practice_modules set trial_sequence = 19 where slug = 'opening-closing';

-- Backfill pre-existing onboarded free users (approximated from created_at
-- since their real onboarding timestamp isn't recorded).
update public.profiles
  set trial_started_at = created_at,
      trial_ends_at    = created_at + interval '7 days'
  where onboarding_completed = true
    and subscription_tier = 'free'
    and trial_started_at is null;
