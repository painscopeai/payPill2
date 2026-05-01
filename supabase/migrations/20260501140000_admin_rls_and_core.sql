-- Admin RLS helpers, profile extensions, and core tables for admin dashboard + API (idempotent).

-- ---------------------------------------------------------------------------
-- is_admin()
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles: support columns + admin policies
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists status text default 'active';
alter table public.profiles add column if not exists subscription_status text;
alter table public.profiles add column if not exists subscription_plan text;
alter table public.profiles add column if not exists admin_notes text;
alter table public.profiles add column if not exists company_name text;
alter table public.profiles add column if not exists api_key text;
alter table public.profiles add column if not exists permissions jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists gender text;

drop policy if exists "profiles_select_all_if_admin" on public.profiles;
create policy "profiles_select_all_if_admin"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "profiles_update_if_admin" on public.profiles;
create policy "profiles_update_if_admin"
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Core entity tables (minimal columns; expand later)
-- ---------------------------------------------------------------------------
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  conditions jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  employee_count int default 0,
  address text,
  status text not null default 'active',
  plan_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.insurance_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  license_number text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  email text,
  phone text,
  status text not null default 'pending',
  verification_status text default 'pending',
  provider_name text,
  type text,
  specialty text,
  address text,
  latitude double precision,
  longitude double precision,
  telemedicine_available boolean default false,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  transaction_type text,
  user_type text,
  amount numeric(12,2) default 0,
  status text default 'pending',
  payment_method text,
  description text,
  refund_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  plan_type text,
  price_monthly numeric(12,2) default 0,
  price numeric(12,2),
  billing_cycle text,
  features jsonb default '[]'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid references public.subscription_plans (id) on delete set null,
  user_type text,
  status text not null default 'active',
  start_date timestamptz,
  end_date timestamptz,
  auto_renew boolean default true,
  monthly_amount numeric(12,2) default 0,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_logs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions (id) on delete cascade,
  action text,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  form_type text not null,
  category text,
  description text default '',
  created_by uuid references public.profiles (id) on delete set null,
  status text not null default 'draft',
  published_at timestamptz,
  published_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  question_text text,
  question_type text,
  sort_order int default 0,
  options jsonb default '[]'::jsonb,
  required boolean not null default false,
  config jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  respondent_email text,
  responses_json text,
  completion_time_seconds int default 0,
  submitted_at timestamptz,
  completed boolean default false,
  time_spent_seconds int default 0,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  ai_input text,
  ai_output text,
  model text,
  status text,
  processing_time_ms int,
  response_time_ms int,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  title text,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  changes jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  status text default 'success',
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  provider_id uuid references public.providers (id) on delete set null,
  type text,
  created_at timestamptz not null default now()
);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  insurance_company_id uuid,
  claim_type text,
  status text,
  created_at timestamptz not null default now()
);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  amount numeric(12,2),
  reason text,
  status text default 'pending',
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  name text,
  subject text,
  body text,
  variables jsonb default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  title text,
  summary text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  title text,
  content text,
  category text,
  status text default 'draft',
  metadata jsonb default '{}'::jsonb,
  description text,
  content_type text,
  file_name text,
  file_size bigint,
  original_text text,
  chunks_json text,
  chunk_count int default 0,
  indexed boolean default false,
  last_indexed_date timestamptz,
  uploaded_at timestamptz,
  version_history_json text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS: admin full access OR self where applicable
-- ---------------------------------------------------------------------------
do $rls$
declare
  t text;
  tables text[] := array[
    'patients','employers','insurance_companies','providers','transactions',
    'subscriptions','subscription_plans','subscription_logs','forms','form_questions',
    'form_responses','ai_logs','ai_insights','notifications','audit_logs','appointments','claims',
    'refunds','system_settings','notification_templates','knowledge_base'
  ];
begin
  foreach t in array tables
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t || '_admin_all', t);
    execute format($f$
      create policy %I on public.%I for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
    $f$, t || '_admin_all', t);
  end loop;
end
$rls$;

do $grants$
declare
  t text;
  tbls text[] := array[
    'patients','employers','insurance_companies','providers','transactions',
    'subscriptions','subscription_plans','subscription_logs','forms','form_questions',
    'form_responses','ai_logs','ai_insights','notifications','audit_logs','appointments','claims',
    'refunds','system_settings','notification_templates','knowledge_base'
  ];
begin
  foreach t in array tbls
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end
$grants$;
