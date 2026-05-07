-- Ensure employer roster status constraint supports draft approval flow.

alter table public.employer_employees
  drop constraint if exists employer_employees_status_check;

alter table public.employer_employees
  add constraint employer_employees_status_check
  check (status in ('draft', 'pending', 'active', 'inactive'));

notify pgrst, 'reload schema';
