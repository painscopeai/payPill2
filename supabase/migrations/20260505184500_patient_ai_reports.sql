-- Persist generated patient AI reports for view/delete management.

create table if not exists public.patient_ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Health Action Report',
  report_markdown text not null,
  source text not null default 'clinical_ai_webhook',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists patient_ai_reports_user_created_idx
  on public.patient_ai_reports (user_id, created_at desc);

alter table public.patient_ai_reports enable row level security;

drop policy if exists "patient_ai_reports_own_select" on public.patient_ai_reports;
create policy "patient_ai_reports_own_select"
  on public.patient_ai_reports for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "patient_ai_reports_own_delete" on public.patient_ai_reports;
create policy "patient_ai_reports_own_delete"
  on public.patient_ai_reports for delete to authenticated
  using (auth.uid() = user_id);

grant select, delete on table public.patient_ai_reports to authenticated;
grant all on table public.patient_ai_reports to service_role;
