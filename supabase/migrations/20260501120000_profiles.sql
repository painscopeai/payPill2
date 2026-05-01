-- public.profiles: app user profile + role; one row per auth.users, created by trigger.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'individual',
  first_name text,
  last_name text,
  name text,
  phone text,
  date_of_birth text,
  terms_accepted boolean not null default false,
  privacy_preferences boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (
    role in ('individual', 'employer', 'insurance', 'provider', 'admin')
  )
);

comment on table public.profiles is 'Application profile; RLS restricts rows to auth.uid() = id.';

create index if not exists profiles_email_idx on public.profiles (email);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert policy for authenticated: rows are created by handle_new_user only.

grant usage on schema public to anon, authenticated, service_role;

grant select, update on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := coalesce(nullif(trim(meta->>'role'), ''), 'individual');
begin
  if r not in ('individual', 'employer', 'insurance', 'provider', 'admin') then
    r := 'individual';
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
    privacy_preferences
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
    end
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
