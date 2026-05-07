-- Ensure roster has insurance slug for approval UI; fix "column not in schema cache" when migrations were skipped or cache is stale.

alter table public.employer_employees add column if not exists insurance_option_slug text;

notify pgrst, 'reload schema';
