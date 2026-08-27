-- Custom date ranges break the old cache key.
--
-- client_ai_reports was keyed on (client_org_id, period_days). Once a client
-- can pick "1-31 Agustus" and "1-31 Juli", two different windows share
-- period_days = 31 -- and the PDF path (cacheOnly, which deliberately accepts
-- a stale narrative rather than spending tokens on a download) would happily
-- print July's prose above August's numbers.
--
-- period_key names the window itself: 'd7' / 'd30' / 'd90' for the rolling
-- presets, 'YYYY-MM-DD..YYYY-MM-DD' for a hand-picked range.
alter table public.client_ai_reports
  add column if not exists period_key text;

-- Existing rows were all presets, and period_days recorded which one.
update public.client_ai_reports
   set period_key = 'd' || period_days
 where period_key is null;

alter table public.client_ai_reports
  alter column period_key set not null;

drop index if exists client_ai_reports_idx;
create index client_ai_reports_idx
  on public.client_ai_reports (client_org_id, period_key, created_at desc);
