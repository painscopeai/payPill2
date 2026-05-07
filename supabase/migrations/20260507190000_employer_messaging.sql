-- Employer broadcast messaging + threaded replies + notifications.
-- Employers compose to all/selected employees; patients reply per-broadcast; both sides see read-state.

-- ---------------------------------------------------------------------------
-- employer_broadcasts: one row per compose action (subject + body + audience)
-- ---------------------------------------------------------------------------
create table if not exists public.employer_broadcasts (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  body text not null,
  audience text not null default 'all',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employer_broadcasts_audience_check
    check (audience in ('all', 'department', 'custom'))
);

create index if not exists employer_broadcasts_employer_idx
  on public.employer_broadcasts (employer_id, created_at desc);

drop trigger if exists employer_broadcasts_updated_at on public.employer_broadcasts;
create trigger employer_broadcasts_updated_at
  before update on public.employer_broadcasts
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- employer_broadcast_recipients: one row per delivered patient (read state)
-- ---------------------------------------------------------------------------
create table if not exists public.employer_broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.employer_broadcasts (id) on delete cascade,
  employer_id uuid not null references public.profiles (id) on delete cascade,
  patient_user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint employer_broadcast_recipients_unique unique (broadcast_id, patient_user_id)
);

create index if not exists employer_broadcast_recipients_patient_idx
  on public.employer_broadcast_recipients (patient_user_id, created_at desc);
create index if not exists employer_broadcast_recipients_broadcast_idx
  on public.employer_broadcast_recipients (broadcast_id);
create index if not exists employer_broadcast_recipients_employer_idx
  on public.employer_broadcast_recipients (employer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- employer_broadcast_replies: threaded back-and-forth between patient & employer
-- ---------------------------------------------------------------------------
create table if not exists public.employer_broadcast_replies (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.employer_broadcasts (id) on delete cascade,
  recipient_id uuid not null references public.employer_broadcast_recipients (id) on delete cascade,
  employer_id uuid not null references public.profiles (id) on delete cascade,
  patient_user_id uuid not null references public.profiles (id) on delete cascade,
  sender_user_id uuid not null references public.profiles (id) on delete cascade,
  sender_role text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint employer_broadcast_replies_role_check
    check (sender_role in ('employer', 'patient'))
);

create index if not exists employer_broadcast_replies_thread_idx
  on public.employer_broadcast_replies (recipient_id, created_at);
create index if not exists employer_broadcast_replies_employer_idx
  on public.employer_broadcast_replies (employer_id, created_at desc);
create index if not exists employer_broadcast_replies_patient_idx
  on public.employer_broadcast_replies (patient_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS — employers see their own; patients see only their own recipient row
-- ---------------------------------------------------------------------------
alter table public.employer_broadcasts enable row level security;
alter table public.employer_broadcast_recipients enable row level security;
alter table public.employer_broadcast_replies enable row level security;

drop policy if exists employer_broadcasts_employer_select on public.employer_broadcasts;
create policy employer_broadcasts_employer_select on public.employer_broadcasts
  for select to authenticated
  using (employer_id = auth.uid());

drop policy if exists employer_broadcasts_employer_modify on public.employer_broadcasts;
create policy employer_broadcasts_employer_modify on public.employer_broadcasts
  for all to authenticated
  using (employer_id = auth.uid())
  with check (employer_id = auth.uid());

drop policy if exists employer_broadcasts_patient_select on public.employer_broadcasts;
create policy employer_broadcasts_patient_select on public.employer_broadcasts
  for select to authenticated
  using (
    exists (
      select 1 from public.employer_broadcast_recipients r
      where r.broadcast_id = employer_broadcasts.id
        and r.patient_user_id = auth.uid()
    )
  );

drop policy if exists employer_broadcasts_admin_all on public.employer_broadcasts;
create policy employer_broadcasts_admin_all on public.employer_broadcasts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- recipients
drop policy if exists employer_broadcast_recipients_employer_all on public.employer_broadcast_recipients;
create policy employer_broadcast_recipients_employer_all on public.employer_broadcast_recipients
  for all to authenticated
  using (employer_id = auth.uid())
  with check (employer_id = auth.uid());

drop policy if exists employer_broadcast_recipients_patient_select on public.employer_broadcast_recipients;
create policy employer_broadcast_recipients_patient_select on public.employer_broadcast_recipients
  for select to authenticated
  using (patient_user_id = auth.uid());

drop policy if exists employer_broadcast_recipients_patient_update on public.employer_broadcast_recipients;
create policy employer_broadcast_recipients_patient_update on public.employer_broadcast_recipients
  for update to authenticated
  using (patient_user_id = auth.uid())
  with check (patient_user_id = auth.uid());

drop policy if exists employer_broadcast_recipients_admin_all on public.employer_broadcast_recipients;
create policy employer_broadcast_recipients_admin_all on public.employer_broadcast_recipients
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- replies
drop policy if exists employer_broadcast_replies_thread_select on public.employer_broadcast_replies;
create policy employer_broadcast_replies_thread_select on public.employer_broadcast_replies
  for select to authenticated
  using (
    employer_id = auth.uid()
    or patient_user_id = auth.uid()
  );

drop policy if exists employer_broadcast_replies_thread_insert on public.employer_broadcast_replies;
create policy employer_broadcast_replies_thread_insert on public.employer_broadcast_replies
  for insert to authenticated
  with check (
    sender_user_id = auth.uid()
    and (employer_id = auth.uid() or patient_user_id = auth.uid())
  );

drop policy if exists employer_broadcast_replies_thread_update on public.employer_broadcast_replies;
create policy employer_broadcast_replies_thread_update on public.employer_broadcast_replies
  for update to authenticated
  using (employer_id = auth.uid() or patient_user_id = auth.uid())
  with check (employer_id = auth.uid() or patient_user_id = auth.uid());

drop policy if exists employer_broadcast_replies_admin_all on public.employer_broadcast_replies;
create policy employer_broadcast_replies_admin_all on public.employer_broadcast_replies
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.employer_broadcasts to authenticated;
grant select, insert, update, delete on public.employer_broadcast_recipients to authenticated;
grant select, insert, update, delete on public.employer_broadcast_replies to authenticated;
grant all on public.employer_broadcasts to service_role;
grant all on public.employer_broadcast_recipients to service_role;
grant all on public.employer_broadcast_replies to service_role;

-- ---------------------------------------------------------------------------
-- notifications: enrich with link/category for routing in patient inbox
-- ---------------------------------------------------------------------------
alter table public.notifications add column if not exists category text;
alter table public.notifications add column if not exists link text;

drop policy if exists notifications_self_select on public.notifications;
create policy notifications_self_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_self_update on public.notifications;
create policy notifications_self_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

notify pgrst, 'reload schema';
