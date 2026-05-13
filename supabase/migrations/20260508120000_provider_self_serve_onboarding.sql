-- Self-serve provider onboarding: completion flag + weekly availability (session-based).

alter table public.profiles add column if not exists provider_onboarding_completed boolean not null default false;

comment on column public.profiles.provider_onboarding_completed is 'True after provider finishes self-serve practice/services/schedule setup.';

update public.profiles
set provider_onboarding_completed = true
where role = 'provider' and provider_org_id is not null;

create table if not exists public.provider_schedule_settings (
  provider_user_id uuid primary key references public.profiles (id) on delete cascade,
  timezone text not null default 'UTC',
  slot_duration_minutes int not null default 30,
  weekly_hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_schedule_settings_slot_ck check (
    slot_duration_minutes >= 10 and slot_duration_minutes <= 120
  )
);

drop trigger if exists provider_schedule_settings_updated_at on public.provider_schedule_settings;
create trigger provider_schedule_settings_updated_at
  before update on public.provider_schedule_settings
  for each row execute procedure public.set_updated_at();

alter table public.provider_schedule_settings enable row level security;

drop policy if exists provider_schedule_settings_own on public.provider_schedule_settings;
create policy provider_schedule_settings_own
  on public.provider_schedule_settings for all to authenticated
  using (provider_user_id = auth.uid())
  with check (provider_user_id = auth.uid());

grant select, insert, update, delete on public.provider_schedule_settings to authenticated;
grant all on public.provider_schedule_settings to service_role;

-- Signup: providers start incomplete; employer/insurance/admin skip provider wizard.
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
    provider_onboarding_completed
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
    prov_onboarding_done
  );

  return new;
end;
$$;
