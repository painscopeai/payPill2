import { getSupabaseAdmin } from '@/server/supabase/admin';
import { loadPatientHealthSources } from '@/server/patient-health/loadPatientHealthSources';

export type PreventiveCareGap = {
	label: string;
	status: string;
};

const REVIEW_RESULT_PATTERN = /\breview|abnormal|elevated|positive|critical|high|low\b/i;
const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

function parseDate(value: unknown): Date | null {
	if (!value) return null;
	const raw = String(value).trim();
	const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
	return Number.isNaN(d.getTime()) ? null : d;
}

function monthsSince(date: Date): number {
	const now = new Date();
	return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
}

function priorityToStatus(priority: unknown): string {
	const p = String(priority || '').toLowerCase();
	if (p === 'high') return 'Overdue';
	if (p === 'medium') return 'Due';
	return 'Due';
}

function isOpenRecommendationStatus(status: unknown): boolean {
	const s = String(status || 'active').trim().toLowerCase();
	return s !== 'accepted' && s !== 'declined';
}

function actionItemLabel(item: { item_type: string; payload: Record<string, unknown> }): string {
	const p = item.payload || {};
	if (item.item_type === 'lab') {
		const name = String(p.test_name || 'Lab order').trim() || 'Lab order';
		return `Complete lab: ${name}`;
	}
	const name = String(p.medication_name || 'Medication').trim() || 'Medication';
	return `Fill prescription: ${name}`;
}

function getImmunizationVaccines(onboardingSteps: { step: number; data?: Record<string, unknown> }[]): unknown[] {
	const step9 = onboardingSteps.find((s) => Number(s.step) === 9);
	const vaccines = step9?.data?.vaccines;
	return Array.isArray(vaccines) ? vaccines : [];
}

function findLatestFluVaccine(vaccines: unknown[]): Date | null {
	let latest: Date | null = null;
	for (const v of vaccines) {
		if (!v || typeof v !== 'object') continue;
		const row = v as Record<string, unknown>;
		const name = String(row.vaccine_name || row.vaccineName || '').toLowerCase();
		if (!/flu|influenza/.test(name)) continue;
		const d = parseDate(row.date_administered || row.dateAdministered);
		if (d && (!latest || d > latest)) latest = d;
	}
	return latest;
}

function findLatestLipidTest(
	labResults: { test_name?: string | null; test_date?: string | null; date_tested?: string | null }[],
): Date | null {
	let latest: Date | null = null;
	for (const lab of labResults) {
		const name = String(lab.test_name || '').toLowerCase();
		if (!/lipid|cholesterol|hdl|ldl|triglyceride/.test(name)) continue;
		const d = parseDate(lab.test_date || lab.date_tested);
		if (d && (!latest || d > latest)) latest = d;
	}
	return latest;
}

/**
 * Aggregates actionable preventive-care rows from Supabase (no static placeholders).
 */
export async function buildPreventiveCareGaps(userId: string): Promise<PreventiveCareGap[]> {
	const sb = getSupabaseAdmin();
	const gaps: PreventiveCareGap[] = [];
	const seen = new Set<string>();

	const pushGap = (label: string, status: string) => {
		const key = label.trim().toLowerCase();
		if (!label.trim() || seen.has(key)) return;
		seen.add(key);
		gaps.push({ label: label.trim(), status });
	};

	const [
		actionsRes,
		recsRes,
		rxRes,
		labsRes,
		goalsRes,
		healthLoad,
	] = await Promise.all([
		sb
			.from('patient_consultation_action_items')
			.select('id, item_type, payload, status, created_at')
			.eq('patient_user_id', userId)
			.eq('status', 'pending')
			.order('created_at', { ascending: false })
			.limit(10),
		sb
			.from('patient_recommendations')
			.select('id, title, description, priority, status, created_at')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.limit(20),
		sb
			.from('prescriptions')
			.select('id, medication_name, refills_remaining, status')
			.eq('user_id', userId)
			.eq('status', 'active')
			.order('date_prescribed', { ascending: false })
			.limit(20),
		sb
			.from('lab_results')
			.select('id, test_name, result_value, test_date, created_at')
			.eq('user_id', userId)
			.order('test_date', { ascending: false })
			.limit(30),
		sb
			.from('health_goals')
			.select('id, goal_name, target_date, status')
			.eq('user_id', userId)
			.eq('status', 'active')
			.limit(20),
		loadPatientHealthSources(userId),
	]);

	if (!actionsRes.error && actionsRes.data?.length) {
		for (const row of actionsRes.data) {
			const payload =
				row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
					? (row.payload as Record<string, unknown>)
					: {};
			pushGap(actionItemLabel({ item_type: row.item_type, payload }), 'Action needed');
		}
	}

	if (!recsRes.error && recsRes.data?.length) {
		const open = recsRes.data
			.filter((r) => isOpenRecommendationStatus(r.status))
			.sort((a, b) => {
				const pa = PRIORITY_RANK[String(a.priority || '').toLowerCase()] ?? 2;
				const pb = PRIORITY_RANK[String(b.priority || '').toLowerCase()] ?? 2;
				return pa - pb;
			});
		for (const rec of open) {
			const title = String(rec.title || '').trim();
			if (!title) continue;
			pushGap(title, priorityToStatus(rec.priority));
		}
	}

	if (!rxRes.error && rxRes.data?.length) {
		for (const rx of rxRes.data) {
			if ((rx.refills_remaining ?? 0) > 0) continue;
			const name = String(rx.medication_name || 'Medication').trim() || 'Medication';
			pushGap(`${name} refill`, 'Due');
		}
	}

	if (!labsRes.error && labsRes.data?.length) {
		for (const lab of labsRes.data) {
			const result = String(lab.result_value || '').trim();
			if (!result || !REVIEW_RESULT_PATTERN.test(result)) continue;
			const name = String(lab.test_name || 'Lab result').trim() || 'Lab result';
			pushGap(`${name} — review results`, 'Review');
		}
	}

	if (healthLoad.ok) {
		const vaccines = getImmunizationVaccines(healthLoad.onboardingSteps);
		const fluDate = findLatestFluVaccine(vaccines);
		if (fluDate) {
			const months = monthsSince(fluDate);
			if (months >= 12) {
				pushGap('Annual flu vaccine', months >= 18 ? 'Overdue' : 'Due');
			}
		}

		const lipidDate = findLatestLipidTest(labsRes.data || []);
		if (lipidDate) {
			const months = monthsSince(lipidDate);
			if (months >= 12) {
				pushGap('Lipid panel screening', months >= 24 ? 'Overdue' : 'Due');
			}
		}
	}

	if (!goalsRes.error && goalsRes.data?.length) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		for (const goal of goalsRes.data) {
			const target = parseDate(goal.target_date);
			if (!target || target >= today) continue;
			const name = String(goal.goal_name || 'Health goal').trim() || 'Health goal';
			pushGap(name, 'Overdue');
		}
	}

	return gaps.slice(0, 5);
}
