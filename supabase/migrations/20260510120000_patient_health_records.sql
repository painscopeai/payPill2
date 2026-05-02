-- Patient-entered health records (conditions, lab results, allergies, surgeries).
-- RLS: users manage own rows; admins have full access via is_admin().

create table if not exists public.patient_health_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  record_type text not null,
  title text not null,
  record_date date,
  status text,
  provider_or_facility text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_health_records_type_check check (
    record_type in ('condition', 'lab_result', 'allergy', 'surgery')
  )
);

comment on table public.patient_health_records is 'User-owned health records entered from the patient Records UI; not a legal medical record system of record.';

create index if not exists patient_health_records_user_type_idx
  on public.patient_health_records (user_id, record_type);

create index if not exists patient_health_records_user_created_idx
  on public.patient_health_records (user_id, created_at desc);

drop trigger if exists patient_health_records_updated_at on public.patient_health_records;
create trigger patient_health_records_updated_at
  before update on public.patient_health_records
  for each row execute procedure public.set_updated_at();

alter table public.patient_health_records enable row level security;

drop policy if exists patient_health_records_select_own on public.patient_health_records;
create policy patient_health_records_select_own
  on public.patient_health_records for select to authenticated
  using (user_id = auth.uid());

drop policy if exists patient_health_records_insert_own on public.patient_health_records;
create policy patient_health_records_insert_own
  on public.patient_health_records for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists patient_health_records_update_own on public.patient_health_records;
create policy patient_health_records_update_own
  on public.patient_health_records for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists patient_health_records_delete_own on public.patient_health_records;
create policy patient_health_records_delete_own
  on public.patient_health_records for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists patient_health_records_admin_all on public.patient_health_records;
create policy patient_health_records_admin_all
  on public.patient_health_records for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.patient_health_records to authenticated;
grant all on public.patient_health_records to service_role;
