import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { assertPatientLinkedToProviderPractice } from '@/server/provider/assertPatientLinkedToProviderPractice';
import { profileDisplayName } from '@/server/provider/profileDisplayName';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type InvoiceRow = {
	id: string;
	patient_user_id?: string | null;
	amount?: number | string;
	currency?: string;
	status?: string;
	description?: string | null;
	metadata?: Record<string, unknown> | null;
	encounter_id?: string | null;
	appointment_id?: string | null;
	provider_service_id?: string | null;
	created_at?: string;
};

function sourceLabel(meta: Record<string, unknown> | null | undefined): string {
	if (!meta || typeof meta !== 'object') return '';
	const s = meta.source;
	if (s === 'consultation_complete') return 'Consultation';
	if (s === 'manual_catalog') return 'Manual · catalog';
	if (s === 'manual_open') return 'Manual · custom';
	return '';
}

function consultationSummaryLine(inv: InvoiceRow): string | null {
	const m = inv.metadata;
	if (!m || typeof m !== 'object' || m.source !== 'consultation_complete') return null;
	const visit = typeof m.visit_label === 'string' ? m.visit_label : '';
	const ad = typeof m.appointment_date === 'string' ? m.appointment_date.slice(0, 10) : '';
	if (visit && ad) return `Finalized consultation · ${visit} · ${ad}`;
	if (visit) return `Finalized consultation · ${visit}`;
	if (ad) return `Finalized consultation · ${ad}`;
	return 'Finalized consultation';
}

/** GET /api/provider/billing/invoices */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const url = new URL(request.url);
	const status = String(url.searchParams.get('status') || '').trim();

	const sb = getSupabaseAdmin();
	let q = sb
		.from('provider_invoices')
		.select('*')
		.eq('provider_user_id', ctx.userId)
		.order('created_at', { ascending: false })
		.limit(100);
	if (status) q = q.eq('status', status);

	const { data, error } = await q;
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	const rows = (data || []) as InvoiceRow[];
	const patientIds = [...new Set(rows.map((r) => r.patient_user_id).filter(Boolean))] as string[];
	let profileById = new Map<string, { first_name?: string | null; last_name?: string | null; email?: string | null }>();
	if (patientIds.length) {
		const { data: profs, error: pErr } = await sb
			.from('profiles')
			.select('id, first_name, last_name, email')
			.in('id', patientIds);
		if (!pErr && profs) {
			profileById = new Map(
				(profs as { id: string; first_name?: string | null; last_name?: string | null; email?: string | null }[]).map(
					(p) => [p.id, p],
				),
			);
		}
	}

	const items = rows.map((inv) => {
		const pid = inv.patient_user_id || '';
		const p = pid ? profileById.get(pid) : undefined;
		return {
			...inv,
			patient_display: profileDisplayName(p || null) || (pid ? 'Patient' : ''),
			source_label: sourceLabel(inv.metadata as Record<string, unknown> | null),
			consultation_summary: consultationSummaryLine(inv),
		};
	});

	return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const body = (await request.json().catch(() => ({}))) as {
		patient_user_id?: string | null;
		mode?: string;
		provider_service_id?: string | null;
		amount?: number;
		currency?: string;
		description?: string | null;
		due_date?: string | null;
		status?: string;
	};

	const patientUserId = String(body.patient_user_id || '').trim();
	if (!patientUserId) {
		return NextResponse.json({ error: 'Patient is required' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const linked = await assertPatientLinkedToProviderPractice(sb, {
		providerUserId: ctx.userId,
		providerOrgId: ctx.providerOrgId,
		patientUserId,
	});
	if (!linked) {
		return NextResponse.json({ error: 'That patient is not linked to your practice.' }, { status: 403 });
	}

	const mode = body.mode === 'catalog' ? 'catalog' : 'open';

	if (mode === 'catalog') {
		if (!ctx.providerOrgId) {
			return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });
		}
		const sid = String(body.provider_service_id || '').trim();
		if (!sid) {
			return NextResponse.json({ error: 'Select a service from your catalog.' }, { status: 400 });
		}
		const { data: svc, error: sErr } = await sb
			.from('provider_services')
			.select('id, name, price, currency')
			.eq('id', sid)
			.eq('provider_id', ctx.providerOrgId)
			.eq('is_active', true)
			.maybeSingle();
		if (sErr || !svc) {
			return NextResponse.json({ error: 'Service not found in your catalog.' }, { status: 400 });
		}
		const s = svc as { id: string; name?: string; price?: number | string; currency?: string };
		const amount = typeof s.price === 'number' ? s.price : Number(s.price) || 0;
		const currency = String(s.currency || body.currency || 'USD');
		const serviceName = String(s.name || 'Service').trim() || 'Service';
		const metadata = {
			source: 'manual_catalog',
			service_label: serviceName,
			claim_ready: true,
			claim_status: 'ready_to_file',
			line_items: [
				{
					kind: 'catalog',
					provider_service_id: s.id,
					description: serviceName,
					quantity: 1,
					unit_amount: amount,
				},
			],
		};
		const { data, error } = await sb
			.from('provider_invoices')
			.insert({
				provider_user_id: ctx.userId,
				patient_user_id: patientUserId,
				amount,
				currency,
				description: serviceName,
				due_date: body.due_date || null,
				status: body.status || 'draft',
				metadata,
				provider_service_id: s.id,
			})
			.select('*')
			.single();
		if (error) {
			console.error('[api/provider/billing/invoices POST]', error.message);
			return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
		}
		return NextResponse.json(data);
	}

	const amount = Number(body.amount);
	if (!Number.isFinite(amount) || amount <= 0) {
		return NextResponse.json({ error: 'Enter a valid amount greater than zero.' }, { status: 400 });
	}
	const desc = String(body.description || '').trim();
	if (!desc) {
		return NextResponse.json({ error: 'Description is required for a custom line item.' }, { status: 400 });
	}
	const metadata = {
		source: 'manual_open',
		service_label: desc,
		claim_ready: true,
		claim_status: 'ready_to_file',
		line_items: [
			{
				kind: 'custom',
				description: desc,
				quantity: 1,
				unit_amount: amount,
			},
		],
	};

	const { data, error } = await sb
		.from('provider_invoices')
		.insert({
			provider_user_id: ctx.userId,
			patient_user_id: patientUserId,
			amount,
			currency: body.currency || 'USD',
			description: desc,
			due_date: body.due_date || null,
			status: body.status || 'draft',
			metadata,
		})
		.select('*')
		.single();

	if (error) {
		console.error('[api/provider/billing/invoices POST]', error.message);
		return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
	}
	return NextResponse.json(data);
}
