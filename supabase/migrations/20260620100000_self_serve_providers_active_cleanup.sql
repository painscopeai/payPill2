-- Self-serve signup practices are active immediately (no legacy credentialing queue).
update public.providers
set
  status = 'active',
  verification_status = 'verified',
  approved_at = coalesce(approved_at, now()),
  updated_at = now()
where lower(trim(coalesce(email, ''))) = 'eleshoayodimeji47@gmail.com';

-- Remove directory rows from the previous credentialing / bulk workflow; keep the real signup org.
with keep as (
  select id
  from public.providers
  where lower(trim(coalesce(email, ''))) = 'eleshoayodimeji47@gmail.com'
  order by created_at desc
  limit 1
)
delete from public.providers
where id not in (select id from keep);
