-- Support date-range analytics queries (PostgREST .gte/.lte on created_at).
create index if not exists appointments_created_at_idx on public.appointments (created_at);
create index if not exists ai_logs_created_at_idx on public.ai_logs (created_at);
create index if not exists form_responses_created_at_idx on public.form_responses (created_at);
create index if not exists claims_created_at_idx on public.claims (created_at);
