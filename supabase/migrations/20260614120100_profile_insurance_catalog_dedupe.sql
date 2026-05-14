-- Deprecate redundant patient-facing insurance carrier catalog (canonical fields: profiles.primary_insurance_user_id + insurance_member_id).
update public.profile_option_sets
set active = false, updated_at = now()
where key = 'insurance_carrier';
