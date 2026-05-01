-- Integrated AI chat history (replaces PocketBase _integratedAiMessages).

create table if not exists public.integrated_ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists integrated_ai_messages_user_created_idx
  on public.integrated_ai_messages (user_id, created_at);

alter table public.integrated_ai_messages enable row level security;

drop policy if exists "integrated_ai_messages_own_select" on public.integrated_ai_messages;
create policy "integrated_ai_messages_own_select"
  on public.integrated_ai_messages for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "integrated_ai_messages_own_insert" on public.integrated_ai_messages;
create policy "integrated_ai_messages_own_insert"
  on public.integrated_ai_messages for insert to authenticated
  with check (auth.uid() = user_id);

grant select, insert on table public.integrated_ai_messages to authenticated;
grant all on table public.integrated_ai_messages to service_role;
