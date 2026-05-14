import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { profileDisplayName } from '@/server/provider/profileDisplayName';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Meta = Record<string, unknown> | null;

function isClaimCandidate(metadata: unknown): boolean {
	const m = metadata as Meta;
	if (!m || typeof m !== 'object') return false;
	if (m.claim_ready === false) return false;
	return Boolean(m.source || m.claim_ready === true);
}

/** GET /api/provider/claims — draft lines sourced from billing (payer integrations can extend this). */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	void request;

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('provider_invoices')
		.select(
			'id, patient_user_id, amount, currency, status, description, metadata, created_at, encounter_id, appointment_id, provider_service_id',
		)
		.eq('provider_user_id', ctx.userId)
		.in('status', ['draft', 'sent', 'open', 'unpaid'])
		.order('created_at', { ascending: false })
		.limit(200);

	if (error) {
		console.error('[api/provider/claims GET]', error.message);
		return NextResponse.json({ error: 'Failed to load claims queue' }, { status: 500 });
	}

	const rows = (data || []) as {
		id: string;
		patient_user_id?: string | null;
		amount?: number | string;
		currency?: string;
		status?: string;
		description?: string | null;
		metadata?: Meta;
		created_at?: string;
		encounter_id?: string | null;
		appointment_id?: string | null;
		provider_service_id?: string | null;
	}[];

	const filtered = rows.filter((r) => isClaimCandidate(r.metadata));
	const patientIds = [...new Set(filtered.map((r) => r.patient_user_id).filter(Boolean))] as string[];
	let profileById = new Map<string, { first_name?: string | null; last_name?: string | null; email?: string | null }>();
	if (patientIds.length) {
		const { data: profs } = await sb.from('profiles').select('id, first_name, last_name, email').in('id', patientIds);
		if (profs) {
			profileById = new Map(
				(profs as { id: string; first_name?: string | null; last_name?: string | null; email?: string | null }[]).map(
					(p) => [p.id, p],
				),
			);
		}
	}

	const items = filtered.map((inv) => {
		const meta = (inv.metadata || {}) as Record<string, unknown>;
		const pid = inv.patient_user_id || '';
		const prof = pid ? profileById.get(pid) : undefined;
		return {
			invoice_id: inv.id,
			patient_user_id: inv.patient_user_id,
			patient_display: profileDisplayName(prof || null) || (pid ? 'Patient' : ''),
			amount: Number(inv.amount) || 0,
			currency: inv.currency || 'USD',
			invoice_status: inv.status,
			description: inv.description,
			service_label: typeof meta.service_label === 'string' ? meta.service_label : inv.description,
			source: typeof meta.source === 'string' ? meta.source : null,
			claim_status: typeof meta.claim_status === 'string' ? meta.claim_status : 'ready_to_file',
			created_at: inv.created_at,
			encounter_id: inv.encounter_id,
			appointment_id: inv.appointment_id,
			provider_service_id: inv.provider_service_id,
		};
	});

	return NextResponse.json({
		items,
		note:
			items.length === 0
				? 'When you finalize consultations or create draft invoices in Billing, eligible lines appear here for insurance filing.'
				: 'These draft charges are linked from Billing. Connect a clearinghouse when you are ready to submit electronically.',
	});
}
