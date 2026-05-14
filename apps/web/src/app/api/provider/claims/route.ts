import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { profileDisplayName } from '@/server/provider/profileDisplayName';
import { buildPatientCoverageSummary } from '@/server/patient/buildPatientCoverageSummary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Meta = Record<string, unknown> | null;

function isClaimCandidate(metadata: unknown): boolean {
	const m = metadata as Meta;
	if (!m || typeof m !== 'object') return false;
	if (m.claim_ready === false) return false;
	return Boolean(m.source || m.claim_ready === true);
}

/** Service date for sorting/filtering: visit date when present, else invoice date. */
function serviceDateIso(inv: {
	created_at?: string | null;
	metadata?: Meta;
}): string {
	const meta = (inv.metadata || {}) as Record<string, unknown>;
	const apt = typeof meta.appointment_date === 'string' ? meta.appointment_date.trim() : '';
	if (/^\d{4}-\d{2}-\d{2}/.test(apt)) return apt.slice(0, 10);
	const cr = inv.created_at ? String(inv.created_at) : '';
	if (/^\d{4}-\d{2}-\d{2}/.test(cr)) return cr.slice(0, 10);
	return '';
}

/** GET /api/provider/claims — charges grouped-ready data with coverage / payer labels. */
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
		.limit(500);

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

	const coverageByPatient = new Map<string, Awaited<ReturnType<typeof buildPatientCoverageSummary>>>();
	await Promise.all(
		patientIds.map(async (pid) => {
			try {
				const cov = await buildPatientCoverageSummary(sb, pid);
				coverageByPatient.set(pid, cov);
			} catch (e) {
				console.warn('[api/provider/claims] coverage', pid, e);
				coverageByPatient.set(pid, null);
			}
		}),
	);

	const UNSPECIFIED = 'Unspecified payer';

	const items = filtered.map((inv) => {
		const meta = (inv.metadata || {}) as Record<string, unknown>;
		const pid = inv.patient_user_id || '';
		const prof = pid ? profileById.get(pid) : undefined;
		const cov = pid ? coverageByPatient.get(pid) : undefined;
		const insurancePlanLabel = cov?.insurance_label?.trim() || null;
		const insurance_group = insurancePlanLabel || UNSPECIFIED;
		const serviceLabel = typeof meta.service_label === 'string' ? meta.service_label : inv.description;
		const dateIso = serviceDateIso(inv);

		return {
			invoice_id: inv.id,
			patient_user_id: inv.patient_user_id,
			patient_display: profileDisplayName(prof || null) || (pid ? 'Patient' : ''),
			amount: Number(inv.amount) || 0,
			currency: inv.currency || 'USD',
			invoice_status: inv.status,
			description: inv.description,
			service_name: (typeof serviceLabel === 'string' && serviceLabel.trim()) || inv.description || '—',
			source: typeof meta.source === 'string' ? meta.source : null,
			claim_status: typeof meta.claim_status === 'string' ? meta.claim_status : 'ready_to_file',
			created_at: inv.created_at,
			service_date: dateIso,
			insurance_plan_label: insurancePlanLabel,
			insurance_group,
			encounter_id: inv.encounter_id,
			appointment_id: inv.appointment_id,
			provider_service_id: inv.provider_service_id,
		};
	});

	return NextResponse.json({
		items,
		note:
			items.length === 0
				? 'When you finalize consultations or add charges in Billing, eligible lines appear here grouped by the patient’s insurance on file.'
				: 'Charges are grouped by insurance plan. Use filters to narrow by date, patient, or payer. Connect a clearinghouse when you are ready to submit electronically.',
	});
}
