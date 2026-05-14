-- Patient-visible consultation action plans (Rx + lab lines) after provider finalizes an encounter.
-- Completing an item creates a patient_health_records row (lab_result or medication).

alter table public.patient_health_records drop constraint if exists patient_health_records_type_check;
alter table public.patient_health_records add constraint patient_health_records_type_check check (
  record_type in ('condition', 'lab_result', 'allergy', 'surgery', 'medication')
);

create table if not exists public.patient_consultation_action_items (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references public.provider_consultation_encounters (id) on delete cascade,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  patient_user_id uuid not null references public.profiles (id) on delete cascade,
  item_type text not null,
  source_line_id text not null,
  line_index int not null default 0,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  completed_at timestamptz,
  health_record_id uuid references public.patient_health_records (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_consultation_action_items_type_check check (item_type in ('prescription', 'lab')),
  constraint patient_consultation_action_items_status_check check (status in ('pending', 'completed')),
  constraint patient_consultation_action_items_encounter_line_unique unique (encounter_id, source_line_id)
);

comment on table public.patient_consultation_action_items is
  'Per-line Rx/lab actions from a finalized encounter; patient completion inserts patient_health_records.';

create index if not exists patient_consultation_action_items_patient_idx
  on public.patient_consultation_action_items (patient_user_id, status);

create index if not exists patient_consultation_action_items_encounter_idx
  on public.patient_consultation_action_items (encounter_id);

drop trigger if exists patient_consultation_action_items_updated_at on public.patient_consultation_action_items;
create trigger patient_consultation_action_items_updated_at
  before update on public.patient_consultation_action_items
  for each row execute procedure public.set_updated_at();

alter table public.patient_consultation_action_items enable row level security;

drop policy if exists patient_consultation_action_items_select_own on public.patient_consultation_action_items;
create policy patient_consultation_action_items_select_own
  on public.patient_consultation_action_items for select to authenticated
  using (patient_user_id = auth.uid());

grant select on public.patient_consultation_action_items to authenticated;
grant all on public.patient_consultation_action_items to service_role;
