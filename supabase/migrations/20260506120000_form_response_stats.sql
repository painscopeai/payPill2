-- Aggregated response counts per form (admin hub). Read via service role / GET /api/forms?include_response_stats=1

create or replace view public.form_response_stats as
select
  form_id,
  count(*)::bigint as response_count,
  max(submitted_at) as last_submitted_at
from public.form_responses
group by form_id;

comment on view public.form_response_stats is 'Per-form response totals for admin dashboards (merged into GET /api/forms when include_response_stats=1).';
