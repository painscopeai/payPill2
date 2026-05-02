-- Ensure public.appointments has all columns required by POST /api/appointments/book and related APIs.
-- Safe to run on production when older environments skipped earlier migrations (fixes PGRST204 / missing columns).

-- ---------------------------------------------------------------------------
-- Core booking fields (from 20260501170000_appointments_and_pb_compat.sql)
-- ---------------------------------------------------------------------------
alter table public.appointments add column if not exists appointment_date date;
alter table public.appointments add column if not exists appointment_time text;
alter table public.appointments add column if not exists appointment_type text;
alter table public.appointments add column if not exists reason text;
alter table public.appointments add column if not exists status text default 'scheduled';
alter table public.appointments add column if not exists location text;
alter table public.appointments add column if not exists provider_name text;
alter table public.appointments add column if not exists insurance_info text;
alter table public.appointments add column if not exists copay_amount numeric(12,2);
alter table public.appointments add column if not exists confirmation_number text;
alter table public.appointments add column if not exists notes text;
alter table public.appointments add column if not exists updated_at timestamptz not null default now();

drop trigger if exists appointments_updated_at on public.appointments;
create trigger appointments_updated_at
  before update on public.appointments
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Optional FKs + telehealth placeholder (from 20260511120000_appointment_copay_matrix.sql)
-- ---------------------------------------------------------------------------
alter table public.appointments add column if not exists visit_type_id uuid references public.visit_types (id) on delete set null;
alter table public.appointments add column if not exists insurance_option_id uuid references public.insurance_options (id) on delete set null;
alter table public.appointments add column if not exists meeting_url text;

create index if not exists appointments_visit_type_id_idx on public.appointments (visit_type_id);
create index if not exists appointments_insurance_option_id_idx on public.appointments (insurance_option_id);
