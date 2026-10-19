-- 002_enable_rls.down.sql
--
-- Reverts 002_enable_rls.sql. Note: this re-exposes the tables to Supabase's
-- public REST API if policies or grants allow it. Idempotent.

begin;

alter table public.contact_messages disable row level security;
alter table public.chat_messages disable row level security;
alter table public.users disable row level security;

commit;
