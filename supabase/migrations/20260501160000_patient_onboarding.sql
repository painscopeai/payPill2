-- Patient onboarding step payloads (replaces legacy PocketBase collections).

create table if not exists public.patient_onboarding_steps (
  user_id uuid not null references public.profiles (id) on delete cascade,
  step int not null check (step >= 1 and step <= 13),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, step)
);

create index if not exists patient_onboarding_steps_user_idx on public.patient_onboarding_steps (user_id);

alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;

drop trigger if exists patient_onboarding_steps_updated_at on public.patient_onboarding_steps;
create trigger patient_onboarding_steps_updated_at
  before update on public.patient_onboarding_steps
  for each row execute procedure public.set_updated_at();

alter table public.patient_onboarding_steps enable row level security;

drop policy if exists "patient_onboarding_steps_own_select" on public.patient_onboarding_steps;
create policy "patient_onboarding_steps_own_select"
  on public.patient_onboarding_steps for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "patient_onboarding_steps_own_insert" on public.patient_onboarding_steps;
create policy "patient_onboarding_steps_own_insert"
  on public.patient_onboarding_steps for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "patient_onboarding_steps_own_update" on public.patient_onboarding_steps;
create policy "patient_onboarding_steps_own_update"
  on public.patient_onboarding_steps for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "patient_onboarding_steps_own_delete" on public.patient_onboarding_steps;
create policy "patient_onboarding_steps_own_delete"
  on public.patient_onboarding_steps for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on table public.patient_onboarding_steps to authenticated;
grant all on table public.patient_onboarding_steps to service_role;

-- Persisted AI recommendations (optional history for GET /ai-recommendations)

create table if not exists public.patient_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  description text,
  priority text,
  related_conditions jsonb default '[]'::jsonb,
  suggested_actions jsonb default '[]'::jsonb,
  sources jsonb default '[]'::jsonb,
  confidence_score numeric,
  created_at timestamptz not null default now()
);

create index if not exists patient_recommendations_user_idx on public.patient_recommendations (user_id);

alter table public.patient_recommendations enable row level security;

drop policy if exists "patient_recommendations_own_select" on public.patient_recommendations;
create policy "patient_recommendations_own_select"
  on public.patient_recommendations for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "patient_recommendations_own_insert" on public.patient_recommendations;
create policy "patient_recommendations_own_insert"
  on public.patient_recommendations for insert to authenticated
  with check (auth.uid() = user_id);

grant select, insert on table public.patient_recommendations to authenticated;
grant all on table public.patient_recommendations to service_role;
