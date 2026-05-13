import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayISO() {
	return new Date().toISOString().slice(0, 10);
}

/** GET /api/provider/dashboard/summary */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	void request;

	const sb = getSupabaseAdmin();
	const uid = ctx.userId;
	const orgId = ctx.providerOrgId;
	const today = todayISO();

	const { count: patientCount, error: pRelErr } = await sb
		.from('patient_provider_relationships')
		.select('*', { count: 'exact', head: true })
		.eq('provider_id', uid);
	if (pRelErr) console.error('[api/provider/dashboard/summary] relationships', pRelErr.message);

	let todayAppointments = 0;
	if (orgId) {
		const { data: appts, error: apErr } = await sb
			.from('appointments')
			.select('id')
			.eq('provider_id', orgId)
			.eq('appointment_date', today);
		if (apErr) console.error('[api/provider/dashboard/summary] appointments', apErr.message);
		todayAppointments = (appts || []).length;
	}

	const { data: invoices } = await sb
		.from('provider_invoices')
		.select('id, amount, status')
		.eq('provider_user_id', uid)
		.limit(500);
	const pendingInvoices = (invoices || []).filter((r: { status?: string }) => (r.status || '') === 'draft').length;

	const { data: messages } = await sb
		.from('provider_secure_messages')
		.select('id, read_at, sender_user_id')
		.eq('provider_user_id', uid)
		.limit(500);
	const unreadMessages = (messages || []).filter(
		(m: { read_at?: string | null; sender_user_id: string }) => !m.read_at && m.sender_user_id !== uid,
	).length;

	return NextResponse.json({
		todayAppointments,
		totalPatients: patientCount ?? 0,
		pendingTasks: pendingInvoices,
		unreadMessages,
		providerOrgLinked: Boolean(orgId),
	});
}
