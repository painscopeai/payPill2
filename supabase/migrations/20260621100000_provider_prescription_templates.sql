-- Predefined multi-medication prescription templates per practice (selectable during consultations).

create table if not exists public.provider_prescription_templates (
  id uuid primary key default gen_random_uuid(),
  provider_org_id uuid not null references public.providers (id) on delete cascade,
  name text not null,
  description text,
  lines jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_prescription_templates_org_sort_idx
  on public.provider_prescription_templates (provider_org_id, sort_order, name);

comment on table public.provider_prescription_templates is
  'Named prescription templates (array of medication lines) for quick apply during consultations.';

alter table public.provider_prescription_templates enable row level security;

grant all on public.provider_prescription_templates to service_role;
