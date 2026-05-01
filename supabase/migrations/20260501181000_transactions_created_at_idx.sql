-- Speed admin financial analytics range queries (PostgREST .gte/.lte on created_at).
create index if not exists transactions_created_at_idx on public.transactions (created_at);
