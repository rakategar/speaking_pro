-- Notification preferences move from localStorage (per-browser, lost on cache
-- clear, and read by nothing) onto the profile so the jobs can actually honour
-- them. Scope of each flag is deliberately narrow -- transactional mail
-- (billing, purchase receipts, password) is never gated:
--   notif_push      -> push delivery in lib/notifications/notify.ts; the
--                      in-app notifications row is still written either way.
--   notif_digest    -> weekly-summary / monthly-certificate notifications.
--                      The PDF is still generated and stays on /summaries.
--   notif_marketing -> trial upgrade-nudge emails only.
--
-- All three default to true (opt-out). The old decorative UI defaulted the
-- marketing toggle to off, but it gated nothing -- honouring that default here
-- would have silently stopped the trial-expiry upgrade emails that currently
-- go to every trialling user.
alter table public.profiles
  add column notif_push boolean not null default true,
  add column notif_digest boolean not null default true,
  add column notif_marketing boolean not null default true;
