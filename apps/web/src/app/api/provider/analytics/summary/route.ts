import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/analytics/summary — lightweight KPIs for provider analytics page */
export async function GET(_request: NextRequest) {
	const ctx = await requireProvider(_request);
	if (ctx instanceof NextResponse) return ctx;

	const sb = getSupabaseAdmin();
	const uid = ctx.userId;
	const orgId = ctx.providerOrgId;

	const { count: relCount, error: relErr } = await sb
		.from('patient_provider_relationships')
		.select('*', { count: 'exact', head: true })
		.eq('provider_id', uid);
	if (relErr) console.error('[api/provider/analytics/summary] relationships', relErr.message);

	const { data: invoices } = await sb.from('provider_invoices').select('amount, status').eq('provider_user_id', uid).limit(2000);
	const paid = (invoices || []).filter((i: { status?: string }) => i.status === 'paid');
	const invoiceTotal = paid.reduce((s: number, i: { amount?: string | number | null }) => s + Number(i.amount || 0), 0);

	const { data: payments } = await sb.from('provider_payments').select('amount, status').eq('provider_user_id', uid).limit(2000);
	const paymentTotal = (payments || [])
		.filter((p: { status?: string }) => (p.status || '') === 'completed')
		.reduce((s: number, p: { amount?: string | number | null }) => s + Number(p.amount || 0), 0);

	let appts: { id: string; status?: string | null }[] = [];
	if (orgId) {
		const { data, error } = await sb.from('appointments').select('id, status').eq('provider_id', orgId).limit(2000);
		if (error) console.error('[api/provider/analytics/summary] appointments', error.message);
		appts = data || [];
	}

	const completedAppts = appts.filter((a) => (a.status || '').toLowerCase() === 'completed').length;

	return NextResponse.json({
		activePatients: relCount ?? 0,
		appointmentsTotal: appts.length,
		appointmentsCompleted: completedAppts,
		revenueInvoiced: invoiceTotal,
		revenuePayments: paymentTotal,
	});
}
