-- Remove legacy admin-invite provider credentialing (provider_applications + application-scoped services).

delete from public.provider_services
where provider_id is null
  and provider_application_id is not null;

alter table public.provider_services
  drop constraint if exists provider_services_scope_ck;

alter table public.provider_services
  drop column if exists provider_application_id;

drop index if exists provider_services_application_idx;

alter table public.provider_services
  add constraint provider_services_provider_id_required
  check (provider_id is not null);

drop table if exists public.provider_applications cascade;
