create table if not exists public.employer_broadcasts (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  body text not null,
  audience text not null default 'all',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employer_broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.employer_broadcasts (id) on delete cascade,
  employer_id uuid not null references public.profiles (id) on delete cascade,
  patient_user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (broadcast_id, patient_user_id)
);

create table if not exists public.employer_broadcast_replies (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.employer_broadcasts (id) on delete cascade,
  recipient_id uuid not null references public.employer_broadcast_recipients (id) on delete cascade,
  employer_id uuid not null references public.profiles (id) on delete cascade,
  patient_user_id uuid not null references public.profiles (id) on delete cascade,
  sender_user_id uuid not null references public.profiles (id) on delete cascade,
  sender_role text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists employer_broadcasts_employer_idx
  on public.employer_broadcasts (employer_id, created_at desc);
create index if not exists employer_broadcast_recipients_patient_idx
  on public.employer_broadcast_recipients (patient_user_id, created_at desc);
create index if not exists employer_broadcast_replies_recipient_idx
  on public.employer_broadcast_replies (recipient_id, created_at asc);
create index if not exists employer_broadcast_replies_broadcast_idx
  on public.employer_broadcast_replies (broadcast_id, created_at asc);

drop trigger if exists employer_broadcasts_updated_at on public.employer_broadcasts;
create trigger employer_broadcasts_updated_at
  before update on public.employer_broadcasts
  for each row execute procedure public.set_updated_at();

alter table public.employer_broadcasts enable row level security;
alter table public.employer_broadcast_recipients enable row level security;
alter table public.employer_broadcast_replies enable row level security;

drop policy if exists employer_broadcasts_admin_all on public.employer_broadcasts;
create policy employer_broadcasts_admin_all on public.employer_broadcasts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists employer_broadcast_recipients_admin_all on public.employer_broadcast_recipients;
create policy employer_broadcast_recipients_admin_all on public.employer_broadcast_recipients
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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
