-- Insurance × visit-type copay matrix, provider scheduling URL, appointment FKs.

-- ---------------------------------------------------------------------------
-- appointment_copay_matrix
-- ---------------------------------------------------------------------------
create table if not exists public.appointment_copay_matrix (
  id uuid primary key default gen_random_uuid(),
  visit_type_id uuid not null references public.visit_types (id) on delete cascade,
  insurance_option_id uuid not null references public.insurance_options (id) on delete cascade,
  copay_estimate numeric(12,2) not null,
  list_price numeric(12,2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (visit_type_id, insurance_option_id)
);

create index if not exists appointment_copay_matrix_visit_ins_idx
  on public.appointment_copay_matrix (visit_type_id, insurance_option_id)
  where active = true;

alter table public.appointment_copay_matrix enable row level security;

drop policy if exists appointment_copay_matrix_select_active on public.appointment_copay_matrix;
create policy appointment_copay_matrix_select_active on public.appointment_copay_matrix
  for select to anon, authenticated
  using (
    active = true
    and exists (
      select 1 from public.visit_types vt
      where vt.id = appointment_copay_matrix.visit_type_id and vt.active = true
    )
    and exists (
      select 1 from public.insurance_options io
      where io.id = appointment_copay_matrix.insurance_option_id and io.active = true
    )
  );

drop policy if exists appointment_copay_matrix_admin_all on public.appointment_copay_matrix;
create policy appointment_copay_matrix_admin_all on public.appointment_copay_matrix
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.appointment_copay_matrix to anon, authenticated;
grant select, insert, update, delete on public.appointment_copay_matrix to authenticated;

drop trigger if exists appointment_copay_matrix_updated_at on public.appointment_copay_matrix;
create trigger appointment_copay_matrix_updated_at
  before update on public.appointment_copay_matrix
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- providers.scheduling_url (Cal.com or other scheduling link)
-- ---------------------------------------------------------------------------
alter table public.providers add column if not exists scheduling_url text;

-- ---------------------------------------------------------------------------
-- appointments: optional FKs + meeting placeholder
-- ---------------------------------------------------------------------------
alter table public.appointments add column if not exists visit_type_id uuid references public.visit_types (id) on delete set null;
alter table public.appointments add column if not exists insurance_option_id uuid references public.insurance_options (id) on delete set null;
alter table public.appointments add column if not exists meeting_url text;

create index if not exists appointments_visit_type_id_idx on public.appointments (visit_type_id);
create index if not exists appointments_insurance_option_id_idx on public.appointments (insurance_option_id);

-- ---------------------------------------------------------------------------
-- Seed matrix: each active visit type × each active insurance; copay from insurance default
-- ---------------------------------------------------------------------------
insert into public.appointment_copay_matrix (visit_type_id, insurance_option_id, copay_estimate, list_price, active)
select
  vt.id,
  io.id,
  coalesce(io.copay_estimate, 0),
  null,
  true
from public.visit_types vt
cross join public.insurance_options io
where vt.active = true and io.active = true
on conflict (visit_type_id, insurance_option_id) do nothing;

grant all on public.appointment_copay_matrix to service_role;
