-- Walk-in patient insurance (payer org profile + member id), change requests, and signup metadata.

-- ---------------------------------------------------------------------------
-- profiles: canonical walk-in coverage (employees use employer_employees)
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists primary_insurance_user_id uuid references public.profiles (id) on delete set null;
alter table public.profiles add column if not exists insurance_member_id text;
alter table public.profiles add column if not exists patient_coverage_source text;

alter table public.profiles drop constraint if exists profiles_patient_coverage_source_ck;
alter table public.profiles add constraint profiles_patient_coverage_source_ck
  check (patient_coverage_source is null or patient_coverage_source in ('walk_in', 'employer'));

comment on column public.profiles.primary_insurance_user_id is 'For individuals: insurance org profile id (profiles.id where role=insurance).';
comment on column public.profiles.insurance_member_id is 'Member/policy id for billing; required for walk-ins when booking.';
comment on column public.profiles.patient_coverage_source is 'walk_in | employer when set; derived in app if null.';

create index if not exists profiles_primary_insurance_user_id_idx
  on public.profiles (primary_insurance_user_id)
  where primary_insurance_user_id is not null;

-- Ensure primary_insurance_user_id points at an insurance-role profile when set.
create or replace function public.enforce_primary_insurance_is_insurance_org()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  pr record;
begin
  if new.primary_insurance_user_id is null then
    return new;
  end if;
  select id, role, coalesce(status, 'active') as st into pr
  from public.profiles
  where id = new.primary_insurance_user_id;
  if not found then
    raise exception 'primary_insurance_user_id must reference an existing profile';
  end if;
  if pr.role <> 'insurance' then
    raise exception 'primary_insurance_user_id must reference role=insurance';
  end if;
  if lower(pr.st) = 'inactive' then
    raise exception 'primary_insurance_user_id cannot be an inactive insurance profile';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_primary_insurance_trg on public.profiles;
create trigger profiles_enforce_primary_insurance_trg
  before insert or update of primary_insurance_user_id on public.profiles
  for each row execute procedure public.enforce_primary_insurance_is_insurance_org();

-- ---------------------------------------------------------------------------
-- patient_insurance_change_requests
-- ---------------------------------------------------------------------------
create table if not exists public.patient_insurance_change_requests (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references public.profiles (id) on delete cascade,
  previous_insurance_user_id uuid references public.profiles (id) on delete set null,
  previous_member_id text,
  requested_insurance_user_id uuid not null references public.profiles (id) on delete cascade,
  requested_member_id text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists patient_insurance_change_requests_patient_idx
  on public.patient_insurance_change_requests (patient_user_id, created_at desc);
create index if not exists patient_insurance_change_requests_target_idx
  on public.patient_insurance_change_requests (requested_insurance_user_id, status);

comment on table public.patient_insurance_change_requests is 'Walk-in insurance changes; insurance admin approves before profiles update.';

alter table public.patient_insurance_change_requests enable row level security;

drop policy if exists patient_insurance_change_requests_select_own on public.patient_insurance_change_requests;
create policy patient_insurance_change_requests_select_own
  on public.patient_insurance_change_requests for select to authenticated
  using (patient_user_id = auth.uid());

drop policy if exists patient_insurance_change_requests_insert_own on public.patient_insurance_change_requests;
create policy patient_insurance_change_requests_insert_own
  on public.patient_insurance_change_requests for insert to authenticated
  with check (patient_user_id = auth.uid());

drop policy if exists patient_insurance_change_requests_select_target_insurer on public.patient_insurance_change_requests;
create policy patient_insurance_change_requests_select_target_insurer
  on public.patient_insurance_change_requests for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'insurance' and p.id = requested_insurance_user_id
    )
  );

drop policy if exists patient_insurance_change_requests_update_target_insurer on public.patient_insurance_change_requests;
create policy patient_insurance_change_requests_update_target_insurer
  on public.patient_insurance_change_requests for update to authenticated
  using (
    requested_insurance_user_id = auth.uid()
    and status = 'pending'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'insurance')
  )
  with check (
    requested_insurance_user_id = auth.uid()
    and status in ('pending', 'approved', 'rejected')
  );

drop policy if exists patient_insurance_change_requests_admin_all on public.patient_insurance_change_requests;
create policy patient_insurance_change_requests_admin_all
  on public.patient_insurance_change_requests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert on public.patient_insurance_change_requests to authenticated;
grant update on public.patient_insurance_change_requests to authenticated;
grant all on public.patient_insurance_change_requests to service_role;

-- Validate requested_insurance_user_id is insurance org (same as profiles trigger target)
create or replace function public.enforce_change_request_insurance_target()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  pr record;
begin
  select id, role, coalesce(status, 'active') as st into pr
  from public.profiles
  where id = new.requested_insurance_user_id;
  if not found or pr.role <> 'insurance' or lower(pr.st) = 'inactive' then
    raise exception 'requested_insurance_user_id must be an active insurance profile';
  end if;
  return new;
end;
$$;

drop trigger if exists patient_insurance_change_requests_target_trg on public.patient_insurance_change_requests;
create trigger patient_insurance_change_requests_target_trg
  before insert on public.patient_insurance_change_requests
  for each row execute procedure public.enforce_change_request_insurance_target();

-- ---------------------------------------------------------------------------
-- handle_new_user: copy walk-in insurance from auth metadata
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := coalesce(nullif(trim(meta->>'role'), ''), 'individual');
  prov_onboarding_done boolean;
  ins_user uuid;
  member_id text;
begin
  if r not in ('individual', 'employer', 'insurance', 'provider', 'admin') then
    r := 'individual';
  end if;

  if r = 'provider' then
    prov_onboarding_done := false;
  elsif r in ('employer', 'insurance', 'admin') then
    prov_onboarding_done := true;
  else
    prov_onboarding_done := false;
  end if;

  ins_user := null;
  member_id := nullif(trim(meta->>'insurance_member_id'), '');
  if nullif(trim(meta->>'primary_insurance_user_id'), '') is not null then
    begin
      ins_user := trim(meta->>'primary_insurance_user_id')::uuid;
    exception
      when invalid_text_representation then
        ins_user := null;
    end;
  end if;

  insert into public.profiles (
    id,
    email,
    role,
    first_name,
    last_name,
    name,
    phone,
    date_of_birth,
    terms_accepted,
    privacy_preferences,
    specialty,
    npi,
    provider_onboarding_completed,
    primary_insurance_user_id,
    insurance_member_id,
    patient_coverage_source
  )
  values (
    new.id,
    new.email,
    r,
    nullif(trim(meta->>'first_name'), ''),
    nullif(trim(meta->>'last_name'), ''),
    nullif(trim(meta->>'name'), ''),
    nullif(trim(meta->>'phone'), ''),
    nullif(trim(meta->>'date_of_birth'), ''),
    case lower(coalesce(meta->>'terms_accepted', 'false'))
      when 'true' then true when '1' then true else false
    end,
    case lower(coalesce(meta->>'privacy_preferences', 'false'))
      when 'true' then true when '1' then true else false
    end,
    nullif(trim(meta->>'specialty'), ''),
    nullif(trim(meta->>'npi'), ''),
    prov_onboarding_done,
    case when r = 'individual' then ins_user else null end,
    case when r = 'individual' then member_id else null end,
    case when r = 'individual' and ins_user is not null then 'walk_in' else null end
  );

  return new;
end;
$$;
