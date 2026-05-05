-- Optional link from a booked appointment to a provider's catalog line (services & pricing).

alter table public.appointments
  add column if not exists provider_service_id uuid references public.provider_services (id) on delete set null;

create index if not exists appointments_provider_service_id_idx
  on public.appointments (provider_service_id);
