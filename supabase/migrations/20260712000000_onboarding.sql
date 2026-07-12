-- First-login onboarding questionnaire: gates access to the rest of the
-- app (enforced in lib/supabase/middleware.ts) until answered once.

alter table public.profiles
  add column onboarding_completed boolean not null default false,
  add column onboarding_answers   jsonb   not null default '{}'::jsonb;
