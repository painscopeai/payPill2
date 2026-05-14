import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { clinicalMessagingAllowed } from '@/server/messaging/clinicalChannelEligibility';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const badApt = new Set(['cancelled', 'canceled', 'no_show', 'no-show']);

function aptOpen(status: string | null | undefined) {
	const s = String(status || '').toLowerCase();
	return !badApt.has(s);
}

type AptRow = { provider_id: string | null; provider_service_id: string | null; status: string | null };

/**
 * GET — provider profiles this patient may message (relationship or practice visit).
 */
export async function GET(request: NextRequest) {
	void request;
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const sb = getSupabaseAdmin();
	const candidateIds = new Set<string>();

	const { data: rels } = await sb.from('patient_provider_relationships').select('provider_id').eq('patient_id', uid);
	for (const r of rels || []) {
		const id = (r as { provider_id: string }).provider_id;
		if (id) candidateIds.add(id);
	}

	const { data: apts } = await sb
		.from('appointments')
		.select('provider_id, provider_service_id, status')
		.eq('user_id', uid)
		.limit(300);

	const orgIds = new Set<string>();
	for (const a of apts || []) {
		const row = a as { provider_id: string | null; provider_service_id: string | null; status: string | null };
		if (!aptOpen(row.status)) continue;
		if (row.provider_id) orgIds.add(row.provider_id);
	}

	const svcIds = Array.from(
		new Set(
			((apts || []) as AptRow[])
				.filter((a) => aptOpen(a.status))
				.map((a) => a.provider_service_id)
				.filter(Boolean),
		),
	) as string[];
	if (svcIds.length) {
		const { data: svcs } = await sb.from('provider_services').select('provider_id').in('id', svcIds);
		for (const s of svcs || []) {
			const pid = (s as { provider_id: string }).provider_id;
			if (pid) orgIds.add(pid);
		}
	}

	if (orgIds.size) {
		const { data: staff } = await sb
			.from('profiles')
			.select('id')
			.eq('role', 'provider')
			.in('provider_org_id', Array.from(orgIds))
			.limit(80);
		for (const p of staff || []) {
			candidateIds.add((p as { id: string }).id);
		}
	}

	const ids = Array.from(candidateIds).slice(0, 48);
	if (!ids.length) return NextResponse.json({ items: [] });

	const { data: profs } = await sb
		.from('profiles')
		.select('id, first_name, last_name, email')
		.in('id', ids);

	const checks = await Promise.all(
		ids.map(async (pid) => ({ pid, ok: await clinicalMessagingAllowed(sb, pid, uid) })),
	);
	const okSet = new Set(checks.filter((c) => c.ok).map((c) => c.pid));

	const allowed: { id: string; label: string }[] = [];
	for (const pr of profs || []) {
		const p = pr as { id: string; first_name: string | null; last_name: string | null; email: string | null };
		if (!okSet.has(p.id)) continue;
		allowed.push({
			id: p.id,
			label: [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || p.email || 'Provider',
		});
	}

	allowed.sort((a, b) => a.label.localeCompare(b.label));
	return NextResponse.json({ items: allowed });
}
