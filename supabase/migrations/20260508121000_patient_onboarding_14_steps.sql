-- Align onboarding storage with 14-step patient UI.

alter table public.patient_onboarding_steps drop constraint if exists patient_onboarding_steps_step_check;

alter table public.patient_onboarding_steps
  add constraint patient_onboarding_steps_step_check check (step >= 1 and step <= 14);
