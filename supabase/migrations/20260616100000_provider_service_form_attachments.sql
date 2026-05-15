-- Provider-owned forms + attach consent/intake forms to catalog services (patient booking, etc.).

alter table public.forms
  add column if not exists owner_scope text not null default 'admin'
    check (owner_scope in ('admin', 'provider', 'employer', 'insurance'));

alter table public.forms
  add column if not exists owner_profile_id uuid references public.profiles (id) on delete set null;

create index if not exists forms_owner_scope_profile_idx
  on public.forms (owner_scope, owner_profile_id);

comment on column public.forms.owner_scope is 'admin = platform forms; provider/employer/insurance = portal-owned copies.';
comment on column public.forms.owner_profile_id is 'Profile id of the owning portal user when owner_scope is not admin.';

create table if not exists public.provider_service_form_attachments (
  id uuid primary key default gen_random_uuid(),
  provider_service_id uuid not null references public.provider_services (id) on delete cascade,
  form_id uuid not null references public.forms (id) on delete cascade,
  attachment_kind text not null default 'intake'
    check (attachment_kind in ('consent', 'intake')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (provider_service_id, attachment_kind)
);

create index if not exists provider_service_form_attachments_service_idx
  on public.provider_service_form_attachments (provider_service_id);

create index if not exists provider_service_form_attachments_form_idx
  on public.provider_service_form_attachments (form_id);

comment on table public.provider_service_form_attachments is 'At most one consent and one intake form per provider_services row; forms should be published for patient-facing links.';

alter table public.provider_service_form_attachments enable row level security;

grant select, insert, update, delete on public.provider_service_form_attachments to service_role;
grant select on public.provider_service_form_attachments to authenticated;
