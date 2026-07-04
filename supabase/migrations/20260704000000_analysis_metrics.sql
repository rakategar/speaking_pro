-- Per-recording analysis pipeline timings, written by the analyze route via
-- the service-role client. Read only by the /analyst dashboard (service role).

create table public.analysis_metrics (
  id               uuid primary key default gen_random_uuid(),
  recording_id     uuid,
  user_id          uuid,
  status           text        not null,             -- success | failed
  error            text,
  audio_bytes      integer,
  duration_seconds double precision,                 -- length of the recording
  asr_ms           integer,                          -- HF Whisper transcription
  prosody_ms       integer,                          -- local intonation service
  llm_ms           integer,                          -- HF LLM structure scoring
  total_ms         integer,                          -- whole analyze request
  asr_model        text,
  created_at       timestamptz not null default now()
);

create index on public.analysis_metrics (created_at desc);

-- Service-role only: RLS on with no policies blocks anon/authenticated.
alter table public.analysis_metrics enable row level security;
grant all on public.analysis_metrics to service_role;
