-- Tracks the last time a "langganan akan berakhir" reminder email/push was
-- sent (lib/queue/subscriptionReminders.ts), so the worker's 5-minute gate
-- doesn't re-notify the same user every cycle within one renewal period.
alter table public.profiles
  add column renewal_reminder_sent_at timestamptz;
