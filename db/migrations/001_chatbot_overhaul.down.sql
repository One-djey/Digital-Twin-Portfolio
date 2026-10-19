-- 001_chatbot_overhaul.down.sql
--
-- Reverts 001_chatbot_overhaul.sql. DESTRUCTIVE: drops the metrics, feedback,
-- source and phone data, and the rate_limits table. Deploy the previous
-- version of the code first. Idempotent.

begin;

drop table if exists public.rate_limits;

alter table public.users
  drop column if exists phone;

alter table public.contact_messages
  drop column if exists source;

drop index if exists public.chat_messages_created_idx;
drop index if exists public.chat_messages_user_created_idx;

alter table public.chat_messages
  drop constraint if exists chat_messages_feedback_check;

alter table public.chat_messages
  drop column if exists feedback,
  drop column if exists finish_reason,
  drop column if exists latency_ms,
  drop column if exists cached_tokens,
  drop column if exists output_tokens,
  drop column if exists input_tokens,
  drop column if exists model;

commit;
