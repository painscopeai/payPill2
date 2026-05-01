-- Extend appointments for API parity (replaces PocketBase appointment fields).

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
