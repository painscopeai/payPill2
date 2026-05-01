-- Optional UI field for legacy "recommendations" flows mapped to patient_recommendations.

alter table public.patient_recommendations
  add column if not exists status text default 'active';

drop policy if exists "patient_recommendations_own_update" on public.patient_recommendations;
create policy "patient_recommendations_own_update"
  on public.patient_recommendations for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant update on table public.patient_recommendations to authenticated;
