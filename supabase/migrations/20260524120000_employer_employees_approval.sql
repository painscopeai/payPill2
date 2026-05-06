-- Draft/active lifecycle + approval audit columns for employer roster.

alter table public.employer_employees add column if not exists approved_at timestamptz;
alter table public.employer_employees add column if not exists approved_by uuid references public.profiles (id) on delete set null;

comment on column public.employer_employees.status is
  'Roster state: draft (imported, login banned until approve), active (approved), pending/inactive as needed.';

create index if not exists employer_employees_employer_status_idx
  on public.employer_employees (employer_id, status);
