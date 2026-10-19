-- 002_enable_rls.sql
--
-- Purpose (optional hardening): enable row level security on the application
-- tables, with no policy, so they are unreachable through Supabase's public
-- REST API (anon key). The server connects with DATABASE_URL as the postgres
-- role, which bypasses RLS, so the application is unaffected and the
-- currently deployed code keeps working. Idempotent.
-- Revert with 002_enable_rls.down.sql.

begin;

alter table public.users enable row level security;
alter table public.chat_messages enable row level security;
alter table public.contact_messages enable row level security;

commit;
