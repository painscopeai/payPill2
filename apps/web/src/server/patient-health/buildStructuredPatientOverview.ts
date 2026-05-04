/**
 * Normalizes Supabase profile + onboarding steps + health records into a stable,
 * UI-friendly shape (camelCase, grouped sections, human-readable labels).
 */

export const PATIENT_HEALTH_OVERVIEW_SCHEMA_VERSION = 1;

/** Labels aligned with `PatientOnboardingPage` / step components */
const STEP_LABELS: Record<number, string> = {
	1: 'Welcome & profile setup',
	2: 'Basic health information',
	3: 'Body measurements & vitals',
	4: 'Pre-existing conditions',
	5: 'Current medications',
	6: 'Allergies',
	7: 'Family medical history',
	8: 'Surgical history',
	9: 'Immunization history',
	10: 'Lab history',
	11: 'Habits & lifestyle',
	12: 'Healthcare providers',
	13: 'Health insurance',
	14: 'Review & consent',
};

function humanizeKey(key: string): string {
	return key
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Convert slug-or-kebab to readable label */
function humanizeValue(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value === 'boolean') return value;
	if (typeof value === 'number') return value;
	if (typeof value !== 'string') return value;
	const v = value.replace(/-/g, ' ');
	return v.replace(/\b\w/g, (c) => c.toUpperCase());
}

function omitKeys<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
	const out = { ...obj };
	for (const k of keys) delete out[k];
	return out;
}

/** Flatten one level of nesting for display maps */
function flattenForDisplay(
	obj: Record<string, unknown>,
	keyPrefix = '',
): Record<string, string | number | boolean | null> {
	const out: Record<string, string | number | boolean | null> = {};
	for (const [k, v] of Object.entries(obj)) {
		if (k === 'updated_at') continue;
		const label = keyPrefix ? `${keyPrefix} › ${humanizeKey(k)}` : humanizeKey(k);
		if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
			Object.assign(out, flattenForDisplay(v as Record<string, unknown>, label));
		} else if (Array.isArray(v)) {
			out[label] = v.map((x) => humanizeValue(x) as string).join(', ');
		} else {
			out[label] = v as string | number | boolean | null;
		}
	}
	return out;
}

function isSparseStepData(data: Record<string, unknown>): boolean {
	const keys = Object.keys(data).filter((k) => k !== 'updated_at');
	return keys.length === 0;
}

export type RawOnboardingRow = {
	step: number;
	data: Record<string, unknown>;
	created_at: string;
	updated_at: string;
};

export function buildStructuredPatientOverview(input: {
	userId: string;
	fetchedAt: string;
	profile: Record<string, unknown> | null;
	onboardingSteps: RawOnboardingRow[];
	healthRecords: Record<string, unknown>[];
}): {
	meta: {
		schemaVersion: number;
		userId: string;
		fetchedAt: string;
		counts: {
			hasProfile: boolean;
			onboardingStepRows: number;
			healthRecords: number;
		};
	};
	account: Record<string, unknown> | null;
	demographics: Record<string, string | number | boolean | null>;
	bodyMetrics: Record<string, string | number | boolean | null>;
	conditions: {
		byCategory: Record<string, string[]>;
		flatLabels: string[];
	};
	onboardingSteps: Array<{
		stepNumber: number;
		stepTitle: string;
		lastSavedAt: string;
		firstSavedAt: string;
		isSparse: boolean;
		fields: Record<string, string | number | boolean | null>;
	}>;
	healthRecords: Array<{
		id: string;
		recordType: string;
		title: string;
		recordDate: string | null;
		status: string | null;
		providerOrFacility: string | null;
		notes: string | null;
		createdAt: string;
		updatedAt: string;
	}>;
} {
	const { userId, fetchedAt, profile, onboardingSteps, healthRecords } = input;

	const account = profile
		? omitKeys(profile, ['api_key', 'admin_notes']) // never expose secrets in overview
		: null;

	const normalizedAccount = account
		? {
				id: account.id,
				email: account.email,
				displayName:
					(account.name as string) ||
					[account.first_name, account.last_name].filter(Boolean).join(' ').trim() ||
					null,
				firstName: account.first_name ?? null,
				lastName: account.last_name ?? null,
				phone: account.phone ?? null,
				dateOfBirth: account.date_of_birth ?? null,
				role: account.role ?? null,
				onboardingCompleted: Boolean(account.onboarding_completed),
				onboardingCompletedAt: account.onboarding_completed_at ?? null,
				termsAccepted: Boolean(account.terms_accepted),
				privacyPreferencesAccepted: Boolean(account.privacy_preferences),
				subscriptionStatus: account.subscription_status ?? null,
				subscriptionPlan: account.subscription_plan ?? null,
				accountStatus: account.status ?? null,
				createdAt: account.created_at ?? null,
				updatedAt: account.updated_at ?? null,
			}
		: null;

	const byStep = new Map<number, RawOnboardingRow>();
	for (const row of onboardingSteps) {
		byStep.set(row.step, row);
	}

	const step2 = byStep.get(2)?.data ?? {};
	const step3 = byStep.get(3)?.data ?? {};
	const step4 = byStep.get(4)?.data ?? {};

	const demographics: Record<string, string | number | boolean | null> = {};
	const demoFlat = flattenForDisplay(
		omitKeys(step2 as Record<string, unknown>, []) as Record<string, unknown>,
	);
	Object.assign(demographics, demoFlat);
	if (normalizedAccount?.dateOfBirth && !demographics['Date Of Birth']) {
		demographics['Date of birth (profile)'] = String(normalizedAccount.dateOfBirth);
	}

	const bodyMetrics = flattenForDisplay(
		omitKeys(step3 as Record<string, unknown>, []) as Record<string, unknown>,
	);

	const conditionsByCategory: Record<string, string[]> = {};
	const flatLabels: string[] = [];
	const cbc = step4.conditions_by_category;
	if (cbc && typeof cbc === 'object' && !Array.isArray(cbc)) {
		for (const [catKey, arr] of Object.entries(cbc as Record<string, unknown>)) {
			const catLabel = humanizeKey(catKey.replace(/^conditions_/, ''));
			const slugs = Array.isArray(arr) ? arr : [];
			const readable = slugs.map((s) => String(humanizeValue(s)));
			conditionsByCategory[catLabel] = readable;
			flatLabels.push(...readable);
		}
	}

	const structuredSteps = onboardingSteps
		.sort((a, b) => a.step - b.step)
		.map((row) => {
			const data = (row.data ?? {}) as Record<string, unknown>;
			const sparse = isSparseStepData(data);
			const display = flattenForDisplay(omitKeys(data, []) as Record<string, unknown>);
			return {
				stepNumber: row.step,
				stepTitle: STEP_LABELS[row.step] ?? `Step ${row.step}`,
				lastSavedAt: row.updated_at,
				firstSavedAt: row.created_at,
				isSparse: sparse,
				fields: display,
			};
		});

	const recordsOut = healthRecords.map((r) => ({
		id: String(r.id ?? ''),
		recordType: String(r.record_type ?? ''),
		title: String(r.title ?? ''),
		recordDate: r.record_date != null ? String(r.record_date) : null,
		status: r.status != null ? String(r.status) : null,
		providerOrFacility: r.provider_or_facility != null ? String(r.provider_or_facility) : null,
		notes: r.notes != null ? String(r.notes) : null,
		createdAt: String(r.created_at ?? ''),
		updatedAt: String(r.updated_at ?? ''),
	}));

	return {
		meta: {
			schemaVersion: PATIENT_HEALTH_OVERVIEW_SCHEMA_VERSION,
			userId,
			fetchedAt,
			counts: {
				hasProfile: Boolean(profile),
				onboardingStepRows: onboardingSteps.length,
				healthRecords: healthRecords.length,
			},
		},
		account: normalizedAccount,
		demographics,
		bodyMetrics,
		conditions: {
			byCategory: conditionsByCategory,
			flatLabels: [...new Set(flatLabels)],
		},
		onboardingSteps: structuredSteps,
		healthRecords: recordsOut,
	};
}
