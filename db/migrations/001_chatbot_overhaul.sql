-- 001_chatbot_overhaul.sql
--
-- Purpose: schema changes for the chatbot overhaul (streaming chat, per-reply
-- metrics, thumbs feedback, chat leads, phone number, Postgres-backed rate
-- limiting).
--
-- Backward compatible with the currently deployed code: everything is additive
-- (new nullable columns, a column with a default, new indexes, a new table).
-- Apply it BEFORE deploying the new code. Idempotent: safe to run twice.
-- Run in the Supabase SQL editor. Revert with 001_chatbot_overhaul.down.sql.

begin;

alter table public.chat_messages
  add column if not exists model text null,
  add column if not exists input_tokens integer null,
  add column if not exists output_tokens integer null,
  add column if not exists cached_tokens integer null,
  add column if not exists latency_ms integer null,
  add column if not exists finish_reason text null,
  add column if not exists feedback smallint null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chat_messages_feedback_check'
      and conrelid = 'public.chat_messages'::regclass
  ) then
    alter table public.chat_messages
      add constraint chat_messages_feedback_check
      check (feedback in (-1, 1));
  end if;
end $$;

create index if not exists chat_messages_user_created_idx
  on public.chat_messages (user_id, created_at);
create index if not exists chat_messages_created_idx
  on public.chat_messages (created_at);

-- 'form' = contact page, 'chat_lead' = submit_lead tool
alter table public.contact_messages
  add column if not exists source text not null default 'form';

alter table public.users
  add column if not exists phone text null;

-- Fixed-window rate-limit counters. `key` = limiter prefix + salted SHA-256 of
-- the client IP (no raw IP stored). Purged after 24 h by /api/health.
-- RLS on with no policy: unreachable via the public REST API, the server
-- connects as postgres and bypasses it.
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamp with time zone not null default now(),
  count integer not null default 1,
  constraint rate_limits_pkey primary key (key)
) TABLESPACE pg_default;

alter table public.rate_limits enable row level security;

commit;
