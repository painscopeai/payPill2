-- Allow rostered patients to read their own employer_employees row (for client-side nav / flags).
-- Employers still use employer_employees_select_own (employer_id = auth.uid()).

drop policy if exists employer_employees_select_as_rostered_patient on public.employer_employees;
create policy employer_employees_select_as_rostered_patient on public.employer_employees
  for select to authenticated
  using (user_id is not null and user_id = auth.uid());
