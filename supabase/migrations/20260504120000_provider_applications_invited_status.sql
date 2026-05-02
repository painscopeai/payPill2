-- Allow pipeline status between draft and submitted (admin sent invite, applicant not finished).

alter table public.provider_applications
  drop constraint if exists provider_applications_status_check;

alter table public.provider_applications
  add constraint provider_applications_status_check
  check (status in ('draft', 'invited', 'submitted', 'approved', 'rejected'));
