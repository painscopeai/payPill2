-- Link invoices to encounters/appointments/services for auto-billing and claims routing.

alter table public.provider_invoices
  add column if not exists encounter_id uuid references public.provider_consultation_encounters (id) on delete set null;

alter table public.provider_invoices
  add column if not exists appointment_id uuid references public.appointments (id) on delete set null;

alter table public.provider_invoices
  add column if not exists provider_service_id uuid references public.provider_services (id) on delete set null;

create unique index if not exists provider_invoices_encounter_unique
  on public.provider_invoices (encounter_id)
  where encounter_id is not null;

create index if not exists provider_invoices_appointment_idx
  on public.provider_invoices (appointment_id);

comment on column public.provider_invoices.encounter_id is 'When set, invoice was generated from a finalized consultation encounter (at most one row per encounter).';
