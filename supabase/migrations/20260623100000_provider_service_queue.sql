-- Cross-portal fulfillment queue: clinical finalize routes Rx → pharmacy, labs → laboratory.

create table if not exists public.provider_service_queue_items (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.provider_consultation_encounters (id) on delete cascade,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  patient_user_id uuid not null references public.profiles (id) on delete cascade,
  clinical_org_id uuid not null references public.providers (id) on delete cascade,
  clinical_provider_user_id uuid references public.profiles (id) on delete set null,
  item_type text not null,
  routed_to text not null,
  source_line_id text not null,
  line_index int not null default 0,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  fulfilled_by uuid references public.profiles (id) on delete set null,
  fulfilled_at timestamptz,
  fulfillment_notes text,
  drug_catalog_id uuid references public.provider_drug_catalog (id) on delete set null,
  quantity_dispensed int,
  stock_movement_id uuid references public.provider_pharmacy_stock_movements (id) on delete set null,
  lab_result_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_service_queue_items_type_check check (item_type in ('prescription', 'lab')),
  constraint provider_service_queue_items_routed_to_check check (routed_to in ('pharmacist', 'laboratory')),
  constraint provider_service_queue_items_status_check check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  constraint provider_service_queue_items_line_unique unique (encounter_id, source_line_id)
);

comment on table public.provider_service_queue_items is
  'Work routed from finalized clinical encounters to pharmacy (Rx) or laboratory portals.';

create index if not exists provider_service_queue_routed_status_idx
  on public.provider_service_queue_items (routed_to, status, created_at desc);

create index if not exists provider_service_queue_patient_idx
  on public.provider_service_queue_items (patient_user_id);

drop trigger if exists provider_service_queue_items_updated_at on public.provider_service_queue_items;
create trigger provider_service_queue_items_updated_at
  before update on public.provider_service_queue_items
  for each row execute procedure public.set_updated_at();

alter table public.provider_service_queue_items enable row level security;
grant all on public.provider_service_queue_items to service_role;
