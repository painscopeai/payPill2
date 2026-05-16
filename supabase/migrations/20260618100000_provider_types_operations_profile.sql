-- Link provider_types (admin "Provider Specialties") to internal practice_role for operations (pharmacy, lab, clinical).

alter table public.provider_types
  add column if not exists operations_profile text not null default 'doctor'
  check (operations_profile in ('doctor', 'pharmacist', 'laboratory'));

comment on column public.provider_types.operations_profile is
  'Maps to provider_practice_roles.slug for providers.practice_role_id sync (doctor, pharmacist, laboratory).';

-- Backfill known slugs
update public.provider_types
set operations_profile = 'pharmacist'
where slug = 'pharmacy';

update public.provider_types
set operations_profile = 'laboratory'
where slug in ('laboratory', 'lab');

-- Optional laboratory specialty in catalog
insert into public.provider_types (slug, label, sort_order, active, operations_profile)
values ('laboratory', 'Laboratory', 35, true, 'laboratory')
on conflict (slug) do update
set operations_profile = excluded.operations_profile,
    label = excluded.label,
    active = excluded.active;

-- Sync existing org practice_role_id from their type slug
update public.providers p
set practice_role_id = r.id,
    updated_at = now()
from public.provider_types t
join public.provider_practice_roles r on r.slug = t.operations_profile and r.active = true
where p.type = t.slug
  and t.active = true;
