-- SOAP-style encounter notes for provider consultation workspace (API uses service_role).

create table if not exists public.provider_consultation_encounters (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  patient_user_id uuid not null references public.profiles (id) on delete cascade,
  provider_user_id uuid not null references public.profiles (id) on delete cascade,
  subjective text,
  objective text,
  assessment text,
  plan text,
  additional_notes text,
  vitals jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_consultation_encounters_status_check
    check (status in ('draft', 'finalized')),
  constraint provider_consultation_encounters_appointment_unique unique (appointment_id)
);

comment on table public.provider_consultation_encounters is 'Provider-authored SOAP encounter tied to a booked appointment; surfaced for consultation/follow-up visit types.';

drop trigger if exists provider_consultation_encounters_updated_at on public.provider_consultation_encounters;
create trigger provider_consultation_encounters_updated_at
  before update on public.provider_consultation_encounters
  for each row execute procedure public.set_updated_at();

create index if not exists provider_consultation_encounters_patient_idx
  on public.provider_consultation_encounters (patient_user_id);
create index if not exists provider_consultation_encounters_provider_idx
  on public.provider_consultation_encounters (provider_user_id);

alter table public.provider_consultation_encounters enable row level security;

grant all on public.provider_consultation_encounters to service_role;
