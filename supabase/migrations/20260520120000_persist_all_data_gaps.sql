-- Gap-fill migration: uploads bucket + uploaded_files, link documents to KB/user/file,
-- patient self-service RLS on domain tables, profile_overview aggregate view.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- pgvector (for documents.embedding if table is created here)
-- ---------------------------------------------------------------------------
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Storage bucket for user/admin uploads (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- uploaded_files: metadata for objects in Supabase Storage (+ polymorphic parent)
-- ---------------------------------------------------------------------------
create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  bucket text not null default 'uploads',
  path text not null,
  file_name text not null,
  file_extension text,
  mime_type text,
  size_bytes bigint,
  checksum_sha256 text,
  source text not null default 'other',
  parent_type text,
  parent_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uploaded_files_source_check check (
    source in ('patient_record', 'admin_kb', 'onboarding', 'other')
  ),
  constraint uploaded_files_bucket_path_unique unique (bucket, path)
);

comment on table public.uploaded_files is 'References files in Supabase Storage; links to knowledge_base, records, etc. via parent_type/parent_id.';

create index if not exists uploaded_files_user_id_idx on public.uploaded_files (user_id);
create index if not exists uploaded_files_source_idx on public.uploaded_files (source);
create index if not exists uploaded_files_parent_idx on public.uploaded_files (parent_type, parent_id);

drop trigger if exists uploaded_files_updated_at on public.uploaded_files;
create trigger uploaded_files_updated_at
  before update on public.uploaded_files
  for each row execute procedure public.set_updated_at();

alter table public.uploaded_files enable row level security;

drop policy if exists uploaded_files_select_own_or_admin on public.uploaded_files;
create policy uploaded_files_select_own_or_admin
  on public.uploaded_files for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists uploaded_files_insert_own_or_admin on public.uploaded_files;
create policy uploaded_files_insert_own_or_admin
  on public.uploaded_files for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists uploaded_files_update_own_or_admin on public.uploaded_files;
create policy uploaded_files_update_own_or_admin
  on public.uploaded_files for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists uploaded_files_delete_own_or_admin on public.uploaded_files;
create policy uploaded_files_delete_own_or_admin
  on public.uploaded_files for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on table public.uploaded_files to authenticated;
grant all on table public.uploaded_files to service_role;

-- ---------------------------------------------------------------------------
-- documents: ensure table exists (LangChain / n8n vector store), then link FKs
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

comment on table public.documents is 'Vector chunks for RAG; embedding dim must match OpenAI text-embedding-3-small (1536).';

alter table public.documents
  add column if not exists user_id uuid references public.profiles (id) on delete cascade;

alter table public.documents
  add column if not exists knowledge_base_id uuid references public.knowledge_base (id) on delete cascade;

alter table public.documents
  add column if not exists uploaded_file_id uuid references public.uploaded_files (id) on delete set null;

alter table public.documents
  add column if not exists chunk_index int;

create index if not exists documents_user_id_idx on public.documents (user_id);
create index if not exists documents_knowledge_base_id_idx on public.documents (knowledge_base_id);
create index if not exists documents_uploaded_file_id_idx on public.documents (uploaded_file_id);

alter table public.documents enable row level security;

drop policy if exists documents_select_own_or_admin on public.documents;
create policy documents_select_own_or_admin
  on public.documents for select to authenticated
  using (
    public.is_admin()
    or (user_id is not null and user_id = auth.uid())
  );

drop policy if exists documents_admin_modify on public.documents;
create policy documents_admin_modify
  on public.documents for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on table public.documents to authenticated;
grant all on table public.documents to service_role;

-- ---------------------------------------------------------------------------
-- Storage RLS: objects in uploads/{auth.uid()}/...
-- ---------------------------------------------------------------------------
drop policy if exists storage_uploads_insert_own on storage.objects;
create policy storage_uploads_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'uploads'
    and coalesce((storage.foldername(name))[1], '') = auth.uid()::text
  );

drop policy if exists storage_uploads_select_own on storage.objects;
create policy storage_uploads_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'uploads'
    and coalesce((storage.foldername(name))[1], '') = auth.uid()::text
  );

drop policy if exists storage_uploads_update_own on storage.objects;
create policy storage_uploads_update_own
  on storage.objects for update to authenticated
  using (
    bucket_id = 'uploads'
    and coalesce((storage.foldername(name))[1], '') = auth.uid()::text
  )
  with check (
    bucket_id = 'uploads'
    and coalesce((storage.foldername(name))[1], '') = auth.uid()::text
  );

drop policy if exists storage_uploads_delete_own on storage.objects;
create policy storage_uploads_delete_own
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'uploads'
    and coalesce((storage.foldername(name))[1], '') = auth.uid()::text
  );

drop policy if exists storage_uploads_select_admin on storage.objects;
create policy storage_uploads_select_admin
  on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Patient self-service RLS (OR with existing *_admin_all policies)
-- ---------------------------------------------------------------------------

-- appointments
drop policy if exists appointments_self_select on public.appointments;
create policy appointments_self_select
  on public.appointments for select to authenticated
  using (user_id is not null and user_id = auth.uid());

drop policy if exists appointments_self_insert on public.appointments;
create policy appointments_self_insert
  on public.appointments for insert to authenticated
  with check (user_id is not null and user_id = auth.uid());

drop policy if exists appointments_self_update on public.appointments;
create policy appointments_self_update
  on public.appointments for update to authenticated
  using (user_id is not null and user_id = auth.uid())
  with check (user_id is not null and user_id = auth.uid());

drop policy if exists appointments_self_delete on public.appointments;
create policy appointments_self_delete
  on public.appointments for delete to authenticated
  using (user_id is not null and user_id = auth.uid());

-- prescriptions
drop policy if exists prescriptions_self_select on public.prescriptions;
create policy prescriptions_self_select
  on public.prescriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists prescriptions_self_insert on public.prescriptions;
create policy prescriptions_self_insert
  on public.prescriptions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists prescriptions_self_update on public.prescriptions;
create policy prescriptions_self_update
  on public.prescriptions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists prescriptions_self_delete on public.prescriptions;
create policy prescriptions_self_delete
  on public.prescriptions for delete to authenticated
  using (user_id = auth.uid());

-- refill_requests
drop policy if exists refill_requests_self_select on public.refill_requests;
create policy refill_requests_self_select
  on public.refill_requests for select to authenticated
  using (user_id = auth.uid());

drop policy if exists refill_requests_self_insert on public.refill_requests;
create policy refill_requests_self_insert
  on public.refill_requests for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists refill_requests_self_update on public.refill_requests;
create policy refill_requests_self_update
  on public.refill_requests for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists refill_requests_self_delete on public.refill_requests;
create policy refill_requests_self_delete
  on public.refill_requests for delete to authenticated
  using (user_id = auth.uid());

-- health_goals
drop policy if exists health_goals_self_select on public.health_goals;
create policy health_goals_self_select
  on public.health_goals for select to authenticated
  using (user_id = auth.uid());

drop policy if exists health_goals_self_insert on public.health_goals;
create policy health_goals_self_insert
  on public.health_goals for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists health_goals_self_update on public.health_goals;
create policy health_goals_self_update
  on public.health_goals for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists health_goals_self_delete on public.health_goals;
create policy health_goals_self_delete
  on public.health_goals for delete to authenticated
  using (user_id = auth.uid());

-- wellness_activities
drop policy if exists wellness_activities_self_select on public.wellness_activities;
create policy wellness_activities_self_select
  on public.wellness_activities for select to authenticated
  using (user_id = auth.uid());

drop policy if exists wellness_activities_self_insert on public.wellness_activities;
create policy wellness_activities_self_insert
  on public.wellness_activities for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists wellness_activities_self_update on public.wellness_activities;
create policy wellness_activities_self_update
  on public.wellness_activities for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists wellness_activities_self_delete on public.wellness_activities;
create policy wellness_activities_self_delete
  on public.wellness_activities for delete to authenticated
  using (user_id = auth.uid());

-- lab_results
drop policy if exists lab_results_self_select on public.lab_results;
create policy lab_results_self_select
  on public.lab_results for select to authenticated
  using (user_id = auth.uid());

drop policy if exists lab_results_self_insert on public.lab_results;
create policy lab_results_self_insert
  on public.lab_results for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists lab_results_self_update on public.lab_results;
create policy lab_results_self_update
  on public.lab_results for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists lab_results_self_delete on public.lab_results;
create policy lab_results_self_delete
  on public.lab_results for delete to authenticated
  using (user_id = auth.uid());

-- clinical_notes: patient sees rows where they are the patient (user_id)
drop policy if exists clinical_notes_self_select_patient on public.clinical_notes;
create policy clinical_notes_self_select_patient
  on public.clinical_notes for select to authenticated
  using (user_id = auth.uid());

-- Ensure RLS is active on extended health domain tables
alter table public.prescriptions enable row level security;
alter table public.refill_requests enable row level security;
alter table public.health_goals enable row level security;
alter table public.wellness_activities enable row level security;
alter table public.lab_results enable row level security;
alter table public.clinical_notes enable row level security;

-- Ensure authenticated role can use patient-facing tables (service_role grants already existed)
grant select, insert, update, delete on public.prescriptions to authenticated;
grant select, insert, update, delete on public.refill_requests to authenticated;
grant select, insert, update, delete on public.health_goals to authenticated;
grant select, insert, update, delete on public.wellness_activities to authenticated;
grant select, insert, update, delete on public.lab_results to authenticated;
grant select on public.clinical_notes to authenticated;

-- ---------------------------------------------------------------------------
-- profile_overview: aggregate row per profile (RLS on profiles limits rows)
-- ---------------------------------------------------------------------------
drop view if exists public.profile_overview;

create view public.profile_overview
with (security_invoker = true)
as
select
  p.id as user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.name,
  p.phone,
  p.date_of_birth,
  p.gender,
  p.role,
  p.onboarding_completed,
  p.onboarding_completed_at,
  (
    select count(*)::bigint
    from public.patient_health_records r
    where r.user_id = p.id
  ) as records_count,
  (
    select count(*)::bigint
    from public.appointments a
    where a.user_id = p.id
  ) as appointments_count,
  (
    select count(*)::bigint
    from public.prescriptions pr
    where pr.user_id = p.id
  ) as prescriptions_count,
  (
    select count(*)::bigint
    from public.patient_recommendations rec
    where rec.user_id = p.id
  ) as recommendations_count,
  (
    select max(s.updated_at)
    from public.patient_onboarding_steps s
    where s.user_id = p.id
  ) as onboarding_last_updated
from public.profiles p;

comment on view public.profile_overview is 'One row per profile with counts; uses security_invoker so RLS on profiles applies.';

grant select on public.profile_overview to authenticated;
grant select on public.profile_overview to service_role;
