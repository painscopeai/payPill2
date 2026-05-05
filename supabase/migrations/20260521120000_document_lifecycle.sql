-- Document lifecycle: cascade delete chunks with upload, dedupe by checksum, link knowledge_base to upload.
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- knowledge_base: link to uploaded_files for cascade delete
-- ---------------------------------------------------------------------------
alter table public.knowledge_base
  add column if not exists uploaded_file_id uuid references public.uploaded_files (id) on delete cascade;

create index if not exists knowledge_base_uploaded_file_id_idx
  on public.knowledge_base (uploaded_file_id);

-- ---------------------------------------------------------------------------
-- documents.uploaded_file_id: ON DELETE CASCADE (remove chunks when upload row deleted)
-- ---------------------------------------------------------------------------
alter table public.documents drop constraint if exists documents_uploaded_file_id_fkey;

alter table public.documents
  add constraint documents_uploaded_file_id_fkey
  foreign key (uploaded_file_id) references public.uploaded_files (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- uploaded_files: soft-delete column (optional audit); checksum dedupe
-- ---------------------------------------------------------------------------
alter table public.uploaded_files add column if not exists deleted_at timestamptz;

-- One active row per user+source+checksum (re-upload replaces after purge of old row)
create unique index if not exists uploaded_files_user_source_checksum_uidx
  on public.uploaded_files (user_id, source, checksum_sha256)
  where checksum_sha256 is not null;

-- ---------------------------------------------------------------------------
-- Server-side purge: delete DB rows (storage must be removed in app layer)
-- ---------------------------------------------------------------------------
create or replace function public.purge_uploaded_file(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Cascades: knowledge_base.uploaded_file_id and documents.uploaded_file_id both ON DELETE CASCADE
  delete from public.uploaded_files where id = p_id;
end;
$$;

comment on function public.purge_uploaded_file(uuid) is
  'Deletes uploaded_files row; cascades to linked knowledge_base and documents chunks. Remove storage object in app before calling.';

grant execute on function public.purge_uploaded_file(uuid) to service_role;
