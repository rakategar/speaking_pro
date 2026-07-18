-- One-time post-onboarding app tour (components/tutorial/TutorialOverlay.tsx).
-- Default false for everyone so existing users also get the tour exactly once
-- on their next dashboard visit; flipped to true from the client on finish or
-- skip (same own-profile RLS update path as trial_nudges_seen).
alter table public.profiles
  add column tutorial_completed boolean not null default false;
