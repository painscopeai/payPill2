import { getSupabaseAdmin } from '@/server/supabase/admin';

export type UpcomingLaboratoryInvestigation = {
	id: string;
	label: string;
	status: string;
};

function isLaboratoryProvider(prov: Record<string, unknown> | null | undefined): boolean {
	if (!prov) return false;
	const type = String(prov.type || '').trim().toLowerCase();
	const specialty = String(prov.specialty || '').trim().toLowerCase();
	return type === 'laboratory' || specialty === 'laboratory' || /laboratory|lab\b/.test(specialty);
}

function parseLocalDay(dateStr: string | null | undefined): Date | null {
	if (!dateStr) return null;
	const [y, mo, d] = String(dateStr).split('-').map(Number);
	if (!y || !mo || !d) return null;
	return new Date(y, mo - 1, d);
}

function startOfTodayLocal(): Date {
	const n = new Date();
	return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/**
 * Pending lab orders from consultations and upcoming laboratory appointments.
 */
export async function buildUpcomingLaboratoryInvestigations(
	userId: string,
): Promise<UpcomingLaboratoryInvestigation[]> {
	const sb = getSupabaseAdmin();
	const items: UpcomingLaboratoryInvestigation[] = [];
	const seen = new Set<string>();

	const push = (id: string, label: string, status: string) => {
		const key = label.trim().toLowerCase();
		if (!label.trim() || seen.has(key)) return;
		seen.add(key);
		items.push({ id, label: label.trim(), status });
	};

	const { data: actionRows, error: actErr } = await sb
		.from('patient_consultation_action_items')
		.select('id, payload, created_at')
		.eq('patient_user_id', userId)
		.eq('item_type', 'lab')
		.eq('status', 'pending')
		.order('created_at', { ascending: false })
		.limit(15);

	if (actErr && !/does not exist|schema cache/i.test(actErr.message)) {
		throw actErr;
	}

	for (const row of actionRows || []) {
		const r = row as { id: string; payload?: Record<string, unknown> | null };
		const payload =
			r.payload && typeof r.payload === 'object' && !Array.isArray(r.payload)
				? r.payload
				: {};
		const testName = String(payload.test_name || 'Laboratory test').trim() || 'Laboratory test';
		push(r.id, testName, 'Due');
	}

	const today = startOfTodayLocal();
	const { data: apts, error: aptErr } = await sb
		.from('appointments')
		.select('id, provider_id, appointment_date, appointment_time, status, reason, provider_name')
		.eq('user_id', userId)
		.order('appointment_date', { ascending: true })
		.limit(40);

	if (aptErr) throw aptErr;

	const aptList = (apts || []) as Record<string, unknown>[];
	const providerIds = [
		...new Set(aptList.map((a) => a.provider_id).filter((id): id is string => typeof id === 'string')),
	];

	const provById = new Map<string, Record<string, unknown>>();
	if (providerIds.length) {
		const { data: provs } = await sb.from('providers').select('*').in('id', providerIds);
		for (const p of provs || []) {
			const row = p as Record<string, unknown> & { id: string };
			provById.set(row.id, row);
		}
	}

	for (const apt of aptList) {
		const st = String(apt.status || '').toLowerCase();
		if (st === 'cancelled' || st === 'completed') continue;
		const day = parseLocalDay(apt.appointment_date as string);
		if (day && day < today) continue;

		const pid = apt.provider_id as string | undefined;
		const prov = pid ? provById.get(pid) : null;
		if (!isLaboratoryProvider(prov)) continue;

		const provName =
			String(prov?.provider_name || prov?.name || apt.provider_name || 'Laboratory').trim() ||
			'Laboratory';
		const reason = String(apt.reason || '').trim();
		const label = reason ? `${reason} — ${provName}` : `Laboratory visit — ${provName}`;
		push(String(apt.id), label, 'Scheduled');
	}

	return items.slice(0, 10);
}
