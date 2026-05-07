-- One-time plaintext for admin copy at roster approval (same value as bulk-import file / Auth password).
-- Not exposed to authenticated clients; only service_role (admin API) may access.

create table if not exists public.employer_employee_pending_passwords (
  employer_employee_id uuid primary key references public.employer_employees (id) on delete cascade,
  plaintext_password text not null
);

comment on table public.employer_employee_pending_passwords is
  'Stores import-file password until admin approves employee on roster; then deleted. Service role only.';

alter table public.employer_employee_pending_passwords enable row level security;

revoke all on public.employer_employee_pending_passwords from public;
revoke all on public.employer_employee_pending_passwords from anon;
revoke all on public.employer_employee_pending_passwords from authenticated;

grant select, insert, update, delete on public.employer_employee_pending_passwords to service_role;
