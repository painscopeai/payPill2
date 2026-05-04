import {
	ONBOARDING_STEP_LABELS,
	type RawOnboardingRow,
} from '@/server/patient-health/buildStructuredPatientOverview';

export const CLINICAL_AI_WEBHOOK_SCHEMA_VERSION = 3;

const MAX_NOTES_CHARS = 8000;

function stripUserId(row: Record<string, unknown>): Record<string, unknown> {
	const rest = { ...row };
	delete rest.user_id;
	return rest;
}

function truncateNote(notes: string | null | undefined): string | null {
	if (notes == null || notes === '') return null;
	if (notes.length <= MAX_NOTES_CHARS) return notes;
	return `${notes.slice(0, MAX_NOTES_CHARS)}…`;
}

/**
 * One JSON object for n8n: structured sections (no account), raw onboarding `data`,
 * health records with `user_id` stripped.
 */
export function buildClinicalAiWebhookPayload(input: {
	userId: string;
	fetchedAt: string;
	demographics: Record<string, string | number | boolean | null>;
	bodyMetrics: Record<string, string | number | boolean | null>;
	conditions: { byCategory: Record<string, string[]>; flatLabels: string[] };
	rawOnboardingSteps: RawOnboardingRow[];
	rawHealthRecords: Record<string, unknown>[];
}): {
	schemaVersion: number;
	kind: 'paypill-clinical-ai';
	userId: string;
	fetchedAt: string;
	counts: { onboardingStepRows: number; healthRecordRows: number };
	sections: {
		demographics: Record<string, string | number | boolean | null>;
		bodyMetrics: Record<string, string | number | boolean | null>;
		conditions: { byCategory: Record<string, string[]>; flatLabels: string[] };
	};
	onboarding: Array<{
		step: number;
		stepTitle: string;
		savedAt: string;
		data: Record<string, unknown>;
	}>;
	healthRecords: Array<Record<string, unknown>>;
} {
	const { userId, fetchedAt, demographics, bodyMetrics, conditions, rawOnboardingSteps, rawHealthRecords } =
		input;

	const onboarding = [...rawOnboardingSteps]
		.sort((a, b) => a.step - b.step)
		.map((row) => ({
			step: row.step,
			stepTitle: ONBOARDING_STEP_LABELS[row.step] ?? `Step ${row.step}`,
			savedAt: row.updated_at,
			data: (row.data && typeof row.data === 'object' ? row.data : {}) as Record<string, unknown>,
		}));

	const healthRecords = rawHealthRecords.map((r) => {
		const s = stripUserId(r as Record<string, unknown>);
		if (typeof s.notes === 'string') {
			s.notes = truncateNote(s.notes) ?? null;
		}
		return s;
	});

	return {
		schemaVersion: CLINICAL_AI_WEBHOOK_SCHEMA_VERSION,
		kind: 'paypill-clinical-ai',
		userId,
		fetchedAt,
		counts: {
			onboardingStepRows: rawOnboardingSteps.length,
			healthRecordRows: rawHealthRecords.length,
		},
		sections: {
			demographics,
			bodyMetrics,
			conditions,
		},
		onboarding,
		healthRecords,
	};
}
