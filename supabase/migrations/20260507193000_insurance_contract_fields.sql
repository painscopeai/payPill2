alter table public.employer_contracts
  add column if not exists insurance_user_id uuid references public.profiles (id) on delete set null,
  add column if not exists contract_type text,
  add column if not exists member_count int default 0,
  add column if not exists contract_value numeric(14,2),
  add column if not exists start_date date,
  add column if not exists end_date date;

create index if not exists employer_contracts_insurance_user_idx
  on public.employer_contracts (insurance_user_id);
