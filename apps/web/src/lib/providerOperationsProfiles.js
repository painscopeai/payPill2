/** Operational profiles for provider signup and practice role sync (matches provider_types.operations_profile). */
export const PROVIDER_OPERATIONS_PROFILE_OPTIONS = [
	{ value: 'doctor', label: 'Clinical (doctor)' },
	{ value: 'pharmacist', label: 'Pharmacy (inventory & shop)' },
	{ value: 'laboratory', label: 'Laboratory' },
];

export const PROVIDER_OPERATIONS_PROFILE_VALUES = new Set(
	PROVIDER_OPERATIONS_PROFILE_OPTIONS.map((o) => o.value),
);

export function isProviderOperationsProfile(value) {
	return PROVIDER_OPERATIONS_PROFILE_VALUES.has(String(value || '').trim().toLowerCase());
}
