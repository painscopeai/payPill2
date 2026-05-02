/**
 * Form types whose published templates can be chosen in Provider Onboarding
 * and linked from provider application invite emails. Keep in sync with
 * `GET /api/admin/provider-application-forms`.
 */
export const PROVIDER_ONBOARDING_INVITE_FORM_TYPES = [
	'provider_application',
	'health_assessment',
] as const;

export type ProviderOnboardingInviteFormType = (typeof PROVIDER_ONBOARDING_INVITE_FORM_TYPES)[number];

const TYPE_LABEL: Record<ProviderOnboardingInviteFormType, string> = {
	provider_application: 'Provider application',
	health_assessment: 'Health assessment',
};

export function labelForOnboardingFormType(formType: string | null | undefined): string {
	if (!formType) return '';
	const t = formType as ProviderOnboardingInviteFormType;
	return TYPE_LABEL[t] || formType.replace(/_/g, ' ');
}
