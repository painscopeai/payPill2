-- 1:1 employer ↔ employee direct messages (separate from multi-recipient broadcasts).

create table if not exists public.workplace_direct_threads (
  id uuid primary key default gen_random_uuid(),
  employer_user_id uuid not null references public.profiles (id) on delete cascade,
  employee_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workplace_direct_threads_distinct check (employer_user_id <> employee_user_id),
  constraint workplace_direct_threads_pair unique (employer_user_id, employee_user_id)
);

create index if not exists workplace_direct_threads_employer_idx
  on public.workplace_direct_threads (employer_user_id, updated_at desc);
create index if not exists workplace_direct_threads_employee_idx
  on public.workplace_direct_threads (employee_user_id, updated_at desc);

comment on table public.workplace_direct_threads is 'Direct DM thread between employer profile and rostered employee (individual user).';

create table if not exists public.workplace_direct_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.workplace_direct_threads (id) on delete cascade,
  sender_user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists workplace_direct_messages_thread_created_idx
  on public.workplace_direct_messages (thread_id, created_at desc);

create or replace function public.workplace_direct_touch_thread()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.workplace_direct_threads
  set updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists workplace_direct_threads_updated_at on public.workplace_direct_threads;
create trigger workplace_direct_threads_updated_at
  before update on public.workplace_direct_threads
  for each row execute procedure public.set_updated_at();

drop trigger if exists workplace_direct_messages_touch_thread on public.workplace_direct_messages;
create trigger workplace_direct_messages_touch_thread
  after insert on public.workplace_direct_messages
  for each row execute procedure public.workplace_direct_touch_thread();

alter table public.workplace_direct_threads enable row level security;
alter table public.workplace_direct_messages enable row level security;

drop policy if exists workplace_direct_threads_participant_select on public.workplace_direct_threads;
create policy workplace_direct_threads_participant_select on public.workplace_direct_threads
  for select to authenticated
  using (employer_user_id = auth.uid() or employee_user_id = auth.uid());

drop policy if exists workplace_direct_threads_participant_insert on public.workplace_direct_threads;
create policy workplace_direct_threads_participant_insert on public.workplace_direct_threads
  for insert to authenticated
  with check (employer_user_id = auth.uid() or employee_user_id = auth.uid());

drop policy if exists workplace_direct_threads_admin_all on public.workplace_direct_threads;
create policy workplace_direct_threads_admin_all on public.workplace_direct_threads
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists workplace_direct_messages_participant_select on public.workplace_direct_messages;
create policy workplace_direct_messages_participant_select on public.workplace_direct_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.workplace_direct_threads t
      where t.id = workplace_direct_messages.thread_id
        and (t.employer_user_id = auth.uid() or t.employee_user_id = auth.uid())
    )
  );

drop policy if exists workplace_direct_messages_participant_insert on public.workplace_direct_messages;
create policy workplace_direct_messages_participant_insert on public.workplace_direct_messages
  for insert to authenticated
  with check (
    sender_user_id = auth.uid()
    and exists (
      select 1 from public.workplace_direct_threads t
      where t.id = workplace_direct_messages.thread_id
        and (t.employer_user_id = auth.uid() or t.employee_user_id = auth.uid())
    )
  );

drop policy if exists workplace_direct_messages_participant_update on public.workplace_direct_messages;
create policy workplace_direct_messages_participant_update on public.workplace_direct_messages
  for update to authenticated
  using (
    exists (
      select 1 from public.workplace_direct_threads t
      where t.id = workplace_direct_messages.thread_id
        and (t.employer_user_id = auth.uid() or t.employee_user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workplace_direct_threads t
      where t.id = workplace_direct_messages.thread_id
        and (t.employer_user_id = auth.uid() or t.employee_user_id = auth.uid())
    )
  );

drop policy if exists workplace_direct_messages_admin_all on public.workplace_direct_messages;
create policy workplace_direct_messages_admin_all on public.workplace_direct_messages
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.workplace_direct_threads to authenticated;
grant select, insert, update on public.workplace_direct_messages to authenticated;
grant all on public.workplace_direct_threads to service_role;
grant all on public.workplace_direct_messages to service_role;

notify pgrst, 'reload schema';
