-- If employer_employees existed before insurance_option_slug was added, CREATE TABLE IF NOT EXISTS
-- does not add the column. Ensure column exists for bulk import + roster.

alter table public.employer_employees add column if not exists insurance_option_slug text;
