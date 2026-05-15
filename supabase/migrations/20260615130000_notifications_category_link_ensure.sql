-- Ensure notification routing columns exist (some environments skipped 20260507190000_employer_messaging.sql).

alter table public.notifications add column if not exists category text;
alter table public.notifications add column if not exists link text;
