-- Domain tables for legacy Express routes (Supabase-only; RLS minimal, service_role used server-side).

create table if not exists public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  name text,
  type text,
  address text,
  zip_code text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid references public.providers (id) on delete set null,
  medication_name text not null,
  dosage text,
  frequency text,
  quantity int default 30,
  refills_remaining int default 0,
  status text default 'active',
  date_prescribed timestamptz default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.refill_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  prescription_id uuid references public.prescriptions (id) on delete cascade,
  refill_request_id text,
  quantity int,
  pharmacy text,
  pharmacy_id uuid references public.pharmacies (id) on delete set null,
  delivery_method text default 'standard',
  special_instructions text,
  status text default 'pending',
  requested_at timestamptz default now()
);

create table if not exists public.telemedicine_sessions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  provider_id uuid references public.profiles (id) on delete set null,
  status text default 'active',
  started_at timestamptz default now()
);

create table if not exists public.health_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  goal_name text not null,
  goal_type text,
  target_value text,
  target_date date,
  status text default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.patient_provider_relationships (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (patient_id, provider_id)
);

create table if not exists public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.profiles (id) on delete cascade,
  appointment_id uuid,
  note_content text,
  date_created timestamptz default now()
);

create table if not exists public.lab_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  test_name text,
  result_value text,
  unit text,
  test_date date,
  created_at timestamptz default now()
);

create table if not exists public.wellness_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_type text,
  description text,
  activity_date date,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.pharmacies to service_role;
grant select, insert, update, delete on public.prescriptions to service_role;
grant select, insert, update, delete on public.refill_requests to service_role;
grant select, insert, update, delete on public.telemedicine_sessions to service_role;
grant select, insert, update, delete on public.health_goals to service_role;
grant select, insert, update, delete on public.patient_provider_relationships to service_role;
grant select, insert, update, delete on public.clinical_notes to service_role;
grant select, insert, update, delete on public.lab_results to service_role;
grant select, insert, update, delete on public.wellness_activities to service_role;
