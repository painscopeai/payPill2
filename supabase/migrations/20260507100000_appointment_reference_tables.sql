-- Admin-managed visit types and insurance options for patient booking.

create table if not exists public.visit_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visit_types_active_sort_idx
  on public.visit_types (active, sort_order, label);

create table if not exists public.insurance_options (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  copay_estimate numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists insurance_options_active_sort_idx
  on public.insurance_options (active, sort_order, label);

alter table public.visit_types enable row level security;
alter table public.insurance_options enable row level security;

-- Patient booking dropdowns: read active rows (no admin required)
drop policy if exists visit_types_select_active on public.visit_types;
create policy visit_types_select_active on public.visit_types
  for select to anon, authenticated
  using (active = true);

drop policy if exists insurance_options_select_active on public.insurance_options;
create policy insurance_options_select_active on public.insurance_options
  for select to anon, authenticated
  using (active = true);

-- Admin full access
drop policy if exists visit_types_admin_all on public.visit_types;
create policy visit_types_admin_all on public.visit_types
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists insurance_options_admin_all on public.insurance_options;
create policy insurance_options_admin_all on public.insurance_options
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.visit_types to anon, authenticated;
grant select on public.insurance_options to anon, authenticated;
grant select, insert, update, delete on public.visit_types to authenticated;
grant select, insert, update, delete on public.insurance_options to authenticated;

insert into public.visit_types (slug, label, sort_order, active)
values
  ('consultation', 'Consultation', 10, true),
  ('follow-up', 'Follow-up', 20, true),
  ('annual-physical', 'Annual Physical', 30, true),
  ('urgent-care', 'Urgent care', 40, true)
on conflict (slug) do nothing;

insert into public.insurance_options (slug, label, sort_order, active, copay_estimate)
values
  ('blue-cross', 'Blue Cross Blue Shield', 10, true, 25.00),
  ('aetna', 'Aetna', 20, true, 30.00),
  ('united', 'UnitedHealthcare', 30, true, 28.00),
  ('self-pay', 'Self-pay', 90, true, 0)
on conflict (slug) do nothing;
