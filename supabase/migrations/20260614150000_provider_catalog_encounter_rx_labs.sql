-- Consultation encounter: structured prescription lines & lab orders (JSON arrays; API uses service_role).
-- Practice-scoped drug & lab catalogs for e-prescribe / order entry and bulk import.

alter table public.provider_consultation_encounters
  add column if not exists prescription_lines jsonb not null default '[]'::jsonb,
  add column if not exists lab_orders jsonb not null default '[]'::jsonb;

comment on column public.provider_consultation_encounters.prescription_lines is
  'JSON array of objects: medication_name, strength, dose, route, frequency, duration_days, quantity, refills, sig, catalog_id (optional).';
comment on column public.provider_consultation_encounters.lab_orders is
  'JSON array of objects: test_name, code, indication, priority (routine|stat), catalog_id (optional).';

create table if not exists public.provider_drug_catalog (
  id uuid primary key default gen_random_uuid(),
  provider_org_id uuid not null references public.providers (id) on delete cascade,
  name text not null,
  default_strength text,
  default_route text,
  default_frequency text,
  default_duration_days int,
  default_quantity int,
  default_refills int not null default 0,
  notes text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_drug_catalog_org_active_idx
  on public.provider_drug_catalog (provider_org_id, is_active, sort_order);

create table if not exists public.provider_lab_test_catalog (
  id uuid primary key default gen_random_uuid(),
  provider_org_id uuid not null references public.providers (id) on delete cascade,
  test_name text not null,
  code text,
  category text,
  notes text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_lab_test_catalog_org_active_idx
  on public.provider_lab_test_catalog (provider_org_id, is_active, sort_order);

drop trigger if exists provider_drug_catalog_updated_at on public.provider_drug_catalog;
create trigger provider_drug_catalog_updated_at
  before update on public.provider_drug_catalog
  for each row execute procedure public.set_updated_at();

drop trigger if exists provider_lab_test_catalog_updated_at on public.provider_lab_test_catalog;
create trigger provider_lab_test_catalog_updated_at
  before update on public.provider_lab_test_catalog
  for each row execute procedure public.set_updated_at();

alter table public.provider_drug_catalog enable row level security;
alter table public.provider_lab_test_catalog enable row level security;

grant all on public.provider_drug_catalog to service_role;
grant all on public.provider_lab_test_catalog to service_role;
