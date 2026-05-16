-- Route Rx/lab fulfillment to a specific pharmacy/lab org or let the patient choose on booking.

alter table public.provider_service_queue_items
  add column if not exists fulfillment_org_id uuid references public.providers (id) on delete set null,
  add column if not exists assignment_mode text not null default 'assigned';

alter table public.provider_service_queue_items drop constraint if exists provider_service_queue_items_assignment_mode_check;
alter table public.provider_service_queue_items add constraint provider_service_queue_items_assignment_mode_check
  check (assignment_mode in ('assigned', 'patient_choice'));

comment on column public.provider_service_queue_items.fulfillment_org_id is
  'Target pharmacy or laboratory org; null when assignment_mode is patient_choice until patient assigns.';
comment on column public.provider_service_queue_items.assignment_mode is
  'assigned: routed to fulfillment_org_id at finalize; patient_choice: patient picks org on booking.';

create index if not exists provider_service_queue_fulfillment_org_idx
  on public.provider_service_queue_items (fulfillment_org_id, routed_to, status, created_at desc)
  where fulfillment_org_id is not null;

create index if not exists provider_service_queue_patient_choice_idx
  on public.provider_service_queue_items (patient_user_id, assignment_mode, routed_to)
  where assignment_mode = 'patient_choice' and fulfillment_org_id is null;

alter table public.provider_consultation_encounters
  add column if not exists prescription_fulfillment jsonb,
  add column if not exists lab_fulfillment jsonb;

comment on column public.provider_consultation_encounters.prescription_fulfillment is
  'Section-level Rx routing: { mode, fulfillment_org_id, fulfillment_org_name }.';
comment on column public.provider_consultation_encounters.lab_fulfillment is
  'Section-level lab routing: { mode, fulfillment_org_id, fulfillment_org_name }.';
