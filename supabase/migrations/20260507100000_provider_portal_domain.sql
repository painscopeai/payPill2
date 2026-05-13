-- Provider portal: profile linkage to directory org, clinical metadata, messaging, billing/scheduling extensions.

-- ---------------------------------------------------------------------------
-- profiles: org link + provider metadata (from auth user_metadata on signup)
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists provider_org_id uuid references public.providers (id) on delete set null;
alter table public.profiles add column if not exists specialty text;
alter table public.profiles add column if not exists npi text;

create index if not exists profiles_provider_org_id_idx on public.profiles (provider_org_id) where provider_org_id is not null;

-- Sync new signup metadata into profiles (preserve existing behavior).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := coalesce(nullif(trim(meta->>'role'), ''), 'individual');
begin
  if r not in ('individual', 'employer', 'insurance', 'provider', 'admin') then
    r := 'individual';
  end if;

  insert into public.profiles (
    id,
    email,
    role,
    first_name,
    last_name,
    name,
    phone,
    date_of_birth,
    terms_accepted,
    privacy_preferences,
    specialty,
    npi
  )
  values (
    new.id,
    new.email,
    r,
    nullif(trim(meta->>'first_name'), ''),
    nullif(trim(meta->>'last_name'), ''),
    nullif(trim(meta->>'name'), ''),
    nullif(trim(meta->>'phone'), ''),
    nullif(trim(meta->>'date_of_birth'), ''),
    case lower(coalesce(meta->>'terms_accepted', 'false'))
      when 'true' then true when '1' then true else false
    end,
    case lower(coalesce(meta->>'privacy_preferences', 'false'))
      when 'true' then true when '1' then true else false
    end,
    nullif(trim(meta->>'specialty'), ''),
    nullif(trim(meta->>'npi'), '')
  );

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Secure provider–patient messaging (portal inbox)
-- ---------------------------------------------------------------------------
create table if not exists public.provider_secure_messages (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references public.profiles (id) on delete cascade,
  patient_user_id uuid not null references public.profiles (id) on delete cascade,
  sender_user_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null default '',
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists provider_secure_messages_provider_created_idx
  on public.provider_secure_messages (provider_user_id, created_at desc);
create index if not exists provider_secure_messages_patient_created_idx
  on public.provider_secure_messages (patient_user_id, created_at desc);

alter table public.provider_secure_messages enable row level security;

drop policy if exists provider_secure_messages_provider_select on public.provider_secure_messages;
create policy provider_secure_messages_provider_select
  on public.provider_secure_messages for select to authenticated
  using (provider_user_id = auth.uid() or patient_user_id = auth.uid());

drop policy if exists provider_secure_messages_provider_insert on public.provider_secure_messages;
create policy provider_secure_messages_provider_insert
  on public.provider_secure_messages for insert to authenticated
  with check (sender_user_id = auth.uid() and (provider_user_id = auth.uid() or patient_user_id = auth.uid()));

drop policy if exists provider_secure_messages_provider_update on public.provider_secure_messages;
create policy provider_secure_messages_provider_update
  on public.provider_secure_messages for update to authenticated
  using (provider_user_id = auth.uid() or patient_user_id = auth.uid())
  with check (provider_user_id = auth.uid() or patient_user_id = auth.uid());

grant select, insert, update on public.provider_secure_messages to authenticated;
grant all on public.provider_secure_messages to service_role;

-- ---------------------------------------------------------------------------
-- Billing
-- ---------------------------------------------------------------------------
create table if not exists public.provider_invoices (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references public.profiles (id) on delete cascade,
  patient_user_id uuid references public.profiles (id) on delete set null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'draft',
  description text,
  metadata jsonb not null default '{}'::jsonb,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_payments (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references public.profiles (id) on delete cascade,
  patient_user_id uuid references public.profiles (id) on delete set null,
  invoice_id uuid references public.provider_invoices (id) on delete set null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending',
  payment_method text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_refunds (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references public.profiles (id) on delete cascade,
  payment_id uuid not null references public.provider_payments (id) on delete cascade,
  amount numeric(12,2) not null default 0,
  reason text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists provider_invoices_provider_created_idx on public.provider_invoices (provider_user_id, created_at desc);
create index if not exists provider_payments_provider_created_idx on public.provider_payments (provider_user_id, created_at desc);

alter table public.provider_invoices enable row level security;
alter table public.provider_payments enable row level security;
alter table public.provider_refunds enable row level security;

drop policy if exists provider_invoices_own on public.provider_invoices;
create policy provider_invoices_own
  on public.provider_invoices for all to authenticated
  using (provider_user_id = auth.uid())
  with check (provider_user_id = auth.uid());

drop policy if exists provider_payments_own on public.provider_payments;
create policy provider_payments_own
  on public.provider_payments for all to authenticated
  using (provider_user_id = auth.uid())
  with check (provider_user_id = auth.uid());

drop policy if exists provider_refunds_own on public.provider_refunds;
create policy provider_refunds_own
  on public.provider_refunds for all to authenticated
  using (provider_user_id = auth.uid())
  with check (provider_user_id = auth.uid());

grant select, insert, update, delete on public.provider_invoices to authenticated;
grant select, insert, update, delete on public.provider_payments to authenticated;
grant select, insert, update, delete on public.provider_refunds to authenticated;
grant all on public.provider_invoices to service_role;
grant all on public.provider_payments to service_role;
grant all on public.provider_refunds to service_role;

-- ---------------------------------------------------------------------------
-- Scheduling extensions
-- ---------------------------------------------------------------------------
create table if not exists public.appointment_templates (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  duration_minutes int not null default 30,
  appointment_type text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.appointment_waiting_list (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references public.profiles (id) on delete cascade,
  patient_user_id uuid not null references public.profiles (id) on delete cascade,
  preferred_date date,
  notes text,
  status text not null default 'waiting',
  created_at timestamptz not null default now()
);

create table if not exists public.group_appointments (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  appointment_date date not null,
  appointment_time text not null,
  max_participants int not null default 10,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_appointments (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references public.profiles (id) on delete cascade,
  patient_user_id uuid references public.profiles (id) on delete set null,
  rule text not null default 'weekly',
  start_date date not null,
  end_date date,
  appointment_time text not null,
  duration_minutes int not null default 30,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.appointment_templates enable row level security;
alter table public.appointment_waiting_list enable row level security;
alter table public.group_appointments enable row level security;
alter table public.recurring_appointments enable row level security;

drop policy if exists appointment_templates_own on public.appointment_templates;
create policy appointment_templates_own on public.appointment_templates for all to authenticated
  using (provider_user_id = auth.uid()) with check (provider_user_id = auth.uid());
drop policy if exists appointment_waiting_list_own on public.appointment_waiting_list;
create policy appointment_waiting_list_own on public.appointment_waiting_list for all to authenticated
  using (provider_user_id = auth.uid()) with check (provider_user_id = auth.uid());
drop policy if exists group_appointments_own on public.group_appointments;
create policy group_appointments_own on public.group_appointments for all to authenticated
  using (provider_user_id = auth.uid()) with check (provider_user_id = auth.uid());
drop policy if exists recurring_appointments_own on public.recurring_appointments;
create policy recurring_appointments_own on public.recurring_appointments for all to authenticated
  using (provider_user_id = auth.uid()) with check (provider_user_id = auth.uid());

grant select, insert, update, delete on public.appointment_templates to authenticated;
grant select, insert, update, delete on public.appointment_waiting_list to authenticated;
grant select, insert, update, delete on public.group_appointments to authenticated;
grant select, insert, update, delete on public.recurring_appointments to authenticated;
grant all on public.appointment_templates to service_role;
grant all on public.appointment_waiting_list to service_role;
grant all on public.group_appointments to service_role;
grant all on public.recurring_appointments to service_role;

-- ---------------------------------------------------------------------------
-- Integrations + inventory + feedback
-- ---------------------------------------------------------------------------
create table if not exists public.provider_integrations (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references public.profiles (id) on delete cascade,
  integration_type text not null,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'inactive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_sync_logs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.provider_integrations (id) on delete cascade,
  level text not null default 'info',
  message text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_inventory_items (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references public.profiles (id) on delete cascade,
  sku text,
  name text not null,
  quantity int not null default 0,
  unit text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.provider_inventory_items (id) on delete cascade,
  delta int not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_inventory_audit_logs (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid references public.provider_inventory_items (id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_inventory_reorders (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.provider_inventory_items (id) on delete cascade,
  quantity int not null default 1,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);

create table if not exists public.provider_care_feedback (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references public.profiles (id) on delete cascade,
  patient_user_id uuid references public.profiles (id) on delete set null,
  rating int,
  comment text,
  context text,
  created_at timestamptz not null default now()
);

alter table public.provider_integrations enable row level security;
alter table public.integration_sync_logs enable row level security;
alter table public.provider_inventory_items enable row level security;
alter table public.provider_inventory_transactions enable row level security;
alter table public.provider_inventory_audit_logs enable row level security;
alter table public.provider_inventory_reorders enable row level security;
alter table public.provider_care_feedback enable row level security;

drop policy if exists provider_integrations_own on public.provider_integrations;
create policy provider_integrations_own on public.provider_integrations for all to authenticated
  using (provider_user_id = auth.uid()) with check (provider_user_id = auth.uid());

drop policy if exists integration_sync_logs_own on public.integration_sync_logs;
create policy integration_sync_logs_own on public.integration_sync_logs for all to authenticated
  using (
    exists (
      select 1 from public.provider_integrations i
      where i.id = integration_id and i.provider_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.provider_integrations i
      where i.id = integration_id and i.provider_user_id = auth.uid()
    )
  );

drop policy if exists provider_inventory_items_own on public.provider_inventory_items;
create policy provider_inventory_items_own on public.provider_inventory_items for all to authenticated
  using (provider_user_id = auth.uid()) with check (provider_user_id = auth.uid());

drop policy if exists provider_inventory_tx_own on public.provider_inventory_transactions;
create policy provider_inventory_tx_own on public.provider_inventory_transactions for all to authenticated
  using (provider_user_id = auth.uid()) with check (provider_user_id = auth.uid());

drop policy if exists provider_inventory_audit_own on public.provider_inventory_audit_logs;
create policy provider_inventory_audit_own on public.provider_inventory_audit_logs for all to authenticated
  using (provider_user_id = auth.uid()) with check (provider_user_id = auth.uid());

drop policy if exists provider_inventory_reorders_own on public.provider_inventory_reorders;
create policy provider_inventory_reorders_own on public.provider_inventory_reorders for all to authenticated
  using (provider_user_id = auth.uid()) with check (provider_user_id = auth.uid());

drop policy if exists provider_care_feedback_own on public.provider_care_feedback;
create policy provider_care_feedback_own on public.provider_care_feedback for all to authenticated
  using (provider_user_id = auth.uid()) with check (provider_user_id = auth.uid());

grant select, insert, update, delete on public.provider_integrations to authenticated;
grant select, insert, update, delete on public.integration_sync_logs to authenticated;
grant select, insert, update, delete on public.provider_inventory_items to authenticated;
grant select, insert, update, delete on public.provider_inventory_transactions to authenticated;
grant select, insert, update, delete on public.provider_inventory_audit_logs to authenticated;
grant select, insert, update, delete on public.provider_inventory_reorders to authenticated;
grant select, insert, update, delete on public.provider_care_feedback to authenticated;

grant all on public.provider_integrations to service_role;
grant all on public.integration_sync_logs to service_role;
grant all on public.provider_inventory_items to service_role;
grant all on public.provider_inventory_transactions to service_role;
grant all on public.provider_inventory_audit_logs to service_role;
grant all on public.provider_inventory_reorders to service_role;
grant all on public.provider_care_feedback to service_role;

-- Provider-scoped read on appointments for their linked org (patient rows already have their own policies).
drop policy if exists appointments_provider_org_select on public.appointments;
create policy appointments_provider_org_select
  on public.appointments for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'provider'
        and p.provider_org_id is not null
        and public.appointments.provider_id = p.provider_org_id
    )
  );
