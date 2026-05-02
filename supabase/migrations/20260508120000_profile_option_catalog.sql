-- Profile / onboarding reference options (admin-managed; patient-facing dropdowns).

create table if not exists public.profile_option_sets (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  group_slug text not null default 'general',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_option_sets_group_sort_idx
  on public.profile_option_sets (group_slug, sort_order, label);

create table if not exists public.profile_option_values (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.profile_option_sets (id) on delete cascade,
  slug text not null,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (set_id, slug)
);

create index if not exists profile_option_values_set_active_sort_idx
  on public.profile_option_values (set_id, active, sort_order, label);

drop trigger if exists profile_option_sets_updated_at on public.profile_option_sets;
create trigger profile_option_sets_updated_at
  before update on public.profile_option_sets
  for each row execute procedure public.set_updated_at();

drop trigger if exists profile_option_values_updated_at on public.profile_option_values;
create trigger profile_option_values_updated_at
  before update on public.profile_option_values
  for each row execute procedure public.set_updated_at();

alter table public.profile_option_sets enable row level security;
alter table public.profile_option_values enable row level security;

-- Patients read active sets + active values (booking-style public catalog)
drop policy if exists profile_option_sets_select_active on public.profile_option_sets;
create policy profile_option_sets_select_active on public.profile_option_sets
  for select to anon, authenticated
  using (active = true);

drop policy if exists profile_option_values_select_active on public.profile_option_values;
create policy profile_option_values_select_active on public.profile_option_values
  for select to anon, authenticated
  using (active = true);

drop policy if exists profile_option_sets_admin_all on public.profile_option_sets;
create policy profile_option_sets_admin_all on public.profile_option_sets
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists profile_option_values_admin_all on public.profile_option_values;
create policy profile_option_values_admin_all on public.profile_option_values
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.profile_option_sets to anon, authenticated;
grant select on public.profile_option_values to anon, authenticated;
grant select, insert, update, delete on public.profile_option_sets to authenticated;
grant select, insert, update, delete on public.profile_option_values to authenticated;
