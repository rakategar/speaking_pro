-- Tracks when a "free trial akan berakhir" reminder email/push was sent
-- (lib/queue/trialReminders.ts), so the worker's 5-minute gate doesn't
-- re-notify the same user every cycle during the reminder window. A trial
-- expires only once per user, so this is never reset (unlike
-- renewal_reminder_sent_at, which activatePremium clears each cycle).
alter table public.profiles
  add column trial_reminder_sent_at timestamptz;
