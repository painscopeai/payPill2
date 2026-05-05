-- Per-provider service & drug pricing rows (normalized). Linked from provider onboarding intake,
-- then provider_id set when an application is approved.

create table if not exists public.provider_services (
  id uuid primary key default gen_random_uuid(),
  provider_application_id uuid references public.provider_applications (id) on delete cascade,
  provider_id uuid references public.providers (id) on delete cascade,
  name text not null,
  category text not null default 'service'
    check (category in ('service', 'drug', 'other')),
  unit text not null default 'per_visit'
    check (unit in ('per_visit', 'per_dose', 'flat', 'monthly')),
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'USD',
  notes text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_services_scope_ck check (
    provider_application_id is not null or provider_id is not null
  )
);

create index if not exists provider_services_provider_sort_idx
  on public.provider_services (provider_id, sort_order);

create index if not exists provider_services_application_idx
  on public.provider_services (provider_application_id);

drop trigger if exists provider_services_updated_at on public.provider_services;
create trigger provider_services_updated_at
  before update on public.provider_services
  for each row execute procedure public.set_updated_at();

alter table public.provider_services enable row level security;

drop policy if exists provider_services_admin_all on public.provider_services;
create policy provider_services_admin_all on public.provider_services
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on table public.provider_services to authenticated;
grant all on table public.provider_services to service_role;
