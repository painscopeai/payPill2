-- Employer roster, metrics, org linkage, contracts — supports admin bulk import + employer portal.

-- ---------------------------------------------------------------------------
-- employers: link to employer login profile + flexible onboarding payload
-- ---------------------------------------------------------------------------
alter table public.employers add column if not exists user_id uuid references public.profiles (id) on delete set null;
alter table public.employers add column if not exists metadata jsonb default '{}'::jsonb;

create unique index if not exists employers_user_id_unique on public.employers (user_id) where user_id is not null;

comment on column public.employers.user_id is 'Auth profile id for the employer account (role employer).';
comment on column public.employers.metadata is 'Extra onboarding fields from client until normalized into columns.';

-- ---------------------------------------------------------------------------
-- employer_employees: roster; employer_id = profiles.id of employer user
-- ---------------------------------------------------------------------------
create table if not exists public.employer_employees (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  email text not null,
  first_name text,
  last_name text,
  department text,
  hire_date date,
  status text not null default 'pending',
  health_score int,
  insurance_option_slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employer_employees_email_employer_unique unique (employer_id, email)
);

create index if not exists employer_employees_employer_id_idx on public.employer_employees (employer_id);
create index if not exists employer_employees_user_id_idx on public.employer_employees (user_id) where user_id is not null;

drop trigger if exists employer_employees_updated_at on public.employer_employees;
create trigger employer_employees_updated_at
  before update on public.employer_employees
  for each row execute procedure public.set_updated_at();

alter table public.employer_employees enable row level security;

drop policy if exists employer_employees_select_own on public.employer_employees;
create policy employer_employees_select_own on public.employer_employees
  for select to authenticated
  using (employer_id = auth.uid());

drop policy if exists employer_employees_modify_own on public.employer_employees;
create policy employer_employees_modify_own on public.employer_employees
  for all to authenticated
  using (employer_id = auth.uid())
  with check (employer_id = auth.uid());

drop policy if exists employer_employees_admin_all on public.employer_employees;
create policy employer_employees_admin_all on public.employer_employees
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.employer_employees to authenticated;
grant all on public.employer_employees to service_role;

-- ---------------------------------------------------------------------------
-- employer_health_metrics
-- ---------------------------------------------------------------------------
create table if not exists public.employer_health_metrics (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles (id) on delete cascade,
  metric_date date not null default (current_date),
  avg_health_score numeric(6,2),
  active_users int default 0,
  total_employees int default 0,
  ytd_cost_savings numeric(14,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employer_health_metrics_employer_date_idx
  on public.employer_health_metrics (employer_id, metric_date desc);

drop trigger if exists employer_health_metrics_updated_at on public.employer_health_metrics;
create trigger employer_health_metrics_updated_at
  before update on public.employer_health_metrics
  for each row execute procedure public.set_updated_at();

alter table public.employer_health_metrics enable row level security;

drop policy if exists employer_health_metrics_select_own on public.employer_health_metrics;
create policy employer_health_metrics_select_own on public.employer_health_metrics
  for select to authenticated
  using (employer_id = auth.uid());

drop policy if exists employer_health_metrics_admin_all on public.employer_health_metrics;
create policy employer_health_metrics_admin_all on public.employer_health_metrics
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.employer_health_metrics to authenticated;
grant insert, update, delete on public.employer_health_metrics to authenticated;
grant all on public.employer_health_metrics to service_role;

-- ---------------------------------------------------------------------------
-- employer_contracts (minimal)
-- ---------------------------------------------------------------------------
create table if not exists public.employer_contracts (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  effective_date date,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employer_contracts_employer_idx on public.employer_contracts (employer_user_id);

drop trigger if exists employer_contracts_updated_at on public.employer_contracts;
create trigger employer_contracts_updated_at
  before update on public.employer_contracts
  for each row execute procedure public.set_updated_at();

alter table public.employer_contracts enable row level security;

drop policy if exists employer_contracts_admin_all on public.employer_contracts;
create policy employer_contracts_admin_all on public.employer_contracts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.employer_contracts to authenticated;
grant all on public.employer_contracts to service_role;
