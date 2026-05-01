-- Provider intake: draft applications promoted to public.providers on admin approval.

create table if not exists public.provider_applications (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'rejected')),
  applicant_user_id uuid references public.profiles (id) on delete set null,
  applicant_email text not null,
  organization_name text,
  type text not null default '',
  category text,
  phone text,
  specialty text,
  payload jsonb not null default '{}'::jsonb,
  form_id uuid references public.forms (id) on delete set null,
  form_response_id uuid references public.form_responses (id) on delete set null,
  provider_id uuid references public.providers (id) on delete set null,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provider_applications_status_submitted_idx
  on public.provider_applications (status, submitted_at desc nulls last);

create index if not exists provider_applications_applicant_idx
  on public.provider_applications (applicant_user_id)
  where applicant_user_id is not null;

alter table public.provider_applications enable row level security;

drop policy if exists provider_applications_admin_all on public.provider_applications;
create policy provider_applications_admin_all on public.provider_applications
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.provider_applications to authenticated;
