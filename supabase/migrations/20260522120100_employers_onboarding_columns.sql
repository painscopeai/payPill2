-- Optional columns used by EmployerOnboardingPage / mapped employers collection inserts.

alter table public.employers add column if not exists website text;
alter table public.employers add column if not exists tax_id text;
alter table public.employers add column if not exists company_size text;
alter table public.employers add column if not exists city text;
alter table public.employers add column if not exists state text;
alter table public.employers add column if not exists zip text;
alter table public.employers add column if not exists country text;
alter table public.employers add column if not exists phone text;
alter table public.employers add column if not exists hr_contact_name text;
alter table public.employers add column if not exists hr_contact_email text;
alter table public.employers add column if not exists hr_contact_phone text;
alter table public.employers add column if not exists hr_contact_title text;
alter table public.employers add column if not exists secondary_contact_name text;
alter table public.employers add column if not exists secondary_contact_email text;
alter table public.employers add column if not exists secondary_contact_phone text;
alter table public.employers add column if not exists current_insurance_provider text;
alter table public.employers add column if not exists insurance_plan_type text;
alter table public.employers add column if not exists covered_employees int default 0;
alter table public.employers add column if not exists annual_premium_budget numeric(14, 2) default 0;
alter table public.employers add column if not exists coverage_start_date date;
alter table public.employers add column if not exists acceptance_timestamp timestamptz;
alter table public.employers add column if not exists terms_accepted boolean default false;
alter table public.employers add column if not exists privacy_accepted boolean default false;
alter table public.employers add column if not exists dpa_accepted boolean default false;
