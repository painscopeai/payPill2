-- Admin-managed provider taxonomy (slug stored on provider_applications.type / providers.type).

create table if not exists public.provider_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_types_active_sort_idx
  on public.provider_types (active, sort_order, label);

alter table public.provider_types enable row level security;

drop policy if exists provider_types_admin_all on public.provider_types;
create policy provider_types_admin_all on public.provider_types
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.provider_types to authenticated;

insert into public.provider_types (slug, label, sort_order, active)
values
  ('hospital', 'Hospital', 10, true),
  ('pharmacy', 'Pharmacy', 20, true),
  ('clinic', 'Clinic', 30, true),
  ('specialist', 'Specialist', 40, true),
  ('other', 'Other', 50, true)
on conflict (slug) do nothing;
