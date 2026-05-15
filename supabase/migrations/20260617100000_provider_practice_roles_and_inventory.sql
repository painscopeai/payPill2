-- Practice taxonomy (doctor / pharmacist / laboratory), lab pricing, pharmacy stock + ledger,
-- atomic patient pharmacy checkout.

-- ---------------------------------------------------------------------------
-- Provider practice roles (admin-managed; distinct from public.provider_types)
-- ---------------------------------------------------------------------------
create table if not exists public.provider_practice_roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists provider_practice_roles_updated_at on public.provider_practice_roles;
create trigger provider_practice_roles_updated_at
  before update on public.provider_practice_roles
  for each row execute procedure public.set_updated_at();

alter table public.provider_practice_roles enable row level security;

drop policy if exists provider_practice_roles_select on public.provider_practice_roles;
create policy provider_practice_roles_select on public.provider_practice_roles
  for select to authenticated using (true);

drop policy if exists provider_practice_roles_admin_all on public.provider_practice_roles;
create policy provider_practice_roles_admin_all on public.provider_practice_roles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.provider_practice_roles to authenticated;
grant all on public.provider_practice_roles to service_role;

insert into public.provider_practice_roles (slug, label, sort_order, active)
values
  ('doctor', 'Doctors', 10, true),
  ('pharmacist', 'Pharmacist', 20, true),
  ('laboratory', 'Laboratory', 30, true)
on conflict (slug) do nothing;

alter table public.providers
  add column if not exists practice_role_id uuid references public.provider_practice_roles (id) on delete set null;

create index if not exists providers_practice_role_id_idx
  on public.providers (practice_role_id) where practice_role_id is not null;

-- Backfill existing orgs to doctor (preserves current behavior).
update public.providers p
set practice_role_id = r.id
from public.provider_practice_roles r
where p.practice_role_id is null and r.slug = 'doctor' and r.active = true;

-- ---------------------------------------------------------------------------
-- Lab catalog pricing
-- ---------------------------------------------------------------------------
alter table public.provider_lab_test_catalog
  add column if not exists list_price numeric(12, 2) not null default 0 check (list_price >= 0);

alter table public.provider_lab_test_catalog
  add column if not exists currency text not null default 'USD';

-- ---------------------------------------------------------------------------
-- Drug catalog: sell price + inventory
-- ---------------------------------------------------------------------------
alter table public.provider_drug_catalog
  add column if not exists quantity_on_hand int not null default 0 check (quantity_on_hand >= 0);

alter table public.provider_drug_catalog
  add column if not exists low_stock_threshold int null check (low_stock_threshold is null or low_stock_threshold >= 0);

alter table public.provider_drug_catalog
  add column if not exists unit_price numeric(12, 2) not null default 0 check (unit_price >= 0);

alter table public.provider_drug_catalog
  add column if not exists currency text not null default 'USD';

comment on column public.provider_drug_catalog.quantity_on_hand is 'On-hand units for pharmacy inventory.';
comment on column public.provider_drug_catalog.low_stock_threshold is 'When set and quantity_on_hand <= threshold, low-stock alerts may fire.';
comment on column public.provider_drug_catalog.unit_price is 'Patient-facing unit price for pharmacy checkout.';

-- ---------------------------------------------------------------------------
-- Stock movement ledger
-- ---------------------------------------------------------------------------
create table if not exists public.provider_pharmacy_stock_movements (
  id uuid primary key default gen_random_uuid(),
  provider_org_id uuid not null references public.providers (id) on delete cascade,
  drug_catalog_id uuid not null references public.provider_drug_catalog (id) on delete cascade,
  delta_qty int not null,
  reason text not null check (reason in ('sale', 'restock', 'adjustment')),
  reference_invoice_id uuid null references public.provider_invoices (id) on delete set null,
  notes text null,
  created_by uuid null references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists provider_pharmacy_stock_movements_org_created_idx
  on public.provider_pharmacy_stock_movements (provider_org_id, created_at desc);

create index if not exists provider_pharmacy_stock_movements_drug_idx
  on public.provider_pharmacy_stock_movements (drug_catalog_id);

alter table public.provider_pharmacy_stock_movements enable row level security;

grant all on public.provider_pharmacy_stock_movements to service_role;

-- ---------------------------------------------------------------------------
-- Atomic patient pharmacy checkout (stock + invoice in one transaction)
-- ---------------------------------------------------------------------------
create or replace function public.patient_pharmacy_checkout(
  p_provider_org_id uuid,
  p_patient_user_id uuid,
  p_billing_provider_user_id uuid,
  p_lines jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pharmacist_role_id uuid;
  v_invoice_id uuid;
  v_currency text := 'USD';
  invoice_amount numeric(12, 2) := 0;
  line_items jsonb := '[]'::jsonb;
  merged jsonb := '{}'::jsonb;
  line record;
  drug_row public.provider_drug_catalog%rowtype;
  drug_ids uuid[];
  did uuid;
  total_qty int;
  line_total numeric(12, 2);
  meta jsonb;
begin
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'no_lines' using errcode = 'P0001';
  end if;

  -- Billing user must belong to org as provider and not inactive.
  if not exists (
    select 1
    from profiles p
    where p.id = p_billing_provider_user_id
      and p.role = 'provider'
      and p.provider_org_id = p_provider_org_id
      and coalesce(lower(trim(p.status)), 'active') != 'inactive'
  ) then
    raise exception 'billing_provider_invalid' using errcode = 'P0001';
  end if;

  select r.id into pharmacist_role_id from provider_practice_roles r where r.slug = 'pharmacist' and r.active limit 1;

  if pharmacist_role_id is null then
    raise exception 'pharmacist_role_missing' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from providers pr
    where pr.id = p_provider_org_id
      and pr.practice_role_id = pharmacist_role_id
  ) then
    raise exception 'not_pharmacy_org' using errcode = 'P0001';
  end if;

  -- Merge quantities per drug_catalog_id.
  for line in
    select (e->>'drug_catalog_id')::uuid as did, (e->>'quantity')::int as q
    from jsonb_array_elements(p_lines) as t(e)
  loop
    if line.did is null or line.q <= 0 then
      raise exception 'invalid_line' using errcode = 'P0001';
    end if;
    merged := jsonb_set(
      merged,
      ARRAY[line.did::text],
      to_jsonb(coalesce((merged->>(line.did::text))::int, 0) + line.q),
      true
    );
  end loop;

  select coalesce(array_agg(key::uuid order by key), '{}'::uuid[])
  into drug_ids
  from jsonb_object_keys(merged) as t(key);

  if drug_ids is null or array_length(drug_ids, 1) is null then
    raise exception 'no_lines' using errcode = 'P0001';
  end if;

  -- Phase 1: lock rows in deterministic order, validate, build line items.
  foreach did in array drug_ids
  loop
    total_qty := (merged->>(did::text))::int;
    select * into drug_row
    from provider_drug_catalog
    where id = did
    for update;

    if not found then
      raise exception 'drug_not_found' using errcode = 'P0001';
    end if;

    if drug_row.provider_org_id <> p_provider_org_id then
      raise exception 'drug_wrong_org' using errcode = 'P0001';
    end if;

    if not drug_row.is_active then
      raise exception 'drug_inactive' using errcode = 'P0001';
    end if;

    if drug_row.quantity_on_hand < total_qty then
      raise exception 'insufficient_stock' using errcode = 'P0001';
    end if;

    line_total := round(drug_row.unit_price * total_qty, 2);
    invoice_amount := invoice_amount + line_total;
    v_currency := coalesce(nullif(trim(drug_row.currency), ''), 'USD');

    line_items := line_items || jsonb_build_array(
      jsonb_build_object(
        'kind', 'pharmacy',
        'drug_catalog_id', did,
        'description', drug_row.name,
        'quantity', total_qty,
        'unit_amount', drug_row.unit_price
      )
    );
  end loop;

  meta := jsonb_build_object(
    'source', 'pharmacy_patient_order',
    'claim_ready', false,
    'line_items', line_items
  );

  insert into provider_invoices (
    provider_user_id,
    patient_user_id,
    amount,
    currency,
    status,
    description,
    metadata
  )
  values (
    p_billing_provider_user_id,
    p_patient_user_id,
    invoice_amount,
    v_currency,
    'draft',
    'Pharmacy order',
    meta
  )
  returning id into v_invoice_id;

  -- Phase 2: apply stock and ledger.
  foreach did in array drug_ids
  loop
    total_qty := (merged->>(did::text))::int;

    update provider_drug_catalog
    set quantity_on_hand = quantity_on_hand - total_qty,
        updated_at = now()
    where id = did;

    insert into provider_pharmacy_stock_movements (
      provider_org_id,
      drug_catalog_id,
      delta_qty,
      reason,
      reference_invoice_id,
      notes
    )
    values (
      p_provider_org_id,
      did,
      -total_qty,
      'sale',
      v_invoice_id,
      null
    );
  end loop;

  return jsonb_build_object(
    'invoice_id', v_invoice_id,
    'amount', invoice_amount,
    'currency', v_currency
  );
end;
$$;

comment on function public.patient_pharmacy_checkout is
  'Patient pharmacy order: validates pharmacist org, locks catalog rows, creates invoice + stock movements atomically.';

revoke all on function public.patient_pharmacy_checkout from public;
grant execute on function public.patient_pharmacy_checkout to service_role;
