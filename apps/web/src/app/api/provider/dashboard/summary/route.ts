import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { fetchAppointmentsForPracticeOrg } from '@/server/provider/fetchAppointmentsForPracticeOrg';

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

	const { data: relRows, error: pRelErr } = await sb
		.from('patient_provider_relationships')
		.select('patient_id')
		.eq('provider_id', uid);
	if (pRelErr) console.error('[api/provider/dashboard/summary] relationships', pRelErr.message);

	const rosterIds = new Set<string>();
	for (const r of relRows || []) {
		const pid = (r as { patient_id?: string | null }).patient_id;
		if (pid) rosterIds.add(pid);
	}
	let todayAppointments = 0;
	if (orgId) {
		const { rows: aptRows, error: aptUserErr } = await fetchAppointmentsForPracticeOrg(
			sb,
			orgId,
			'id, user_id, appointment_date',
			{ limitDirect: 4000, limitService: 4000 },
		);
		if (aptUserErr) {
			console.error('[api/provider/dashboard/summary] appointment patients', aptUserErr);
		} else {
			for (const row of aptRows || []) {
				const u = (row as { user_id?: string | null }).user_id;
				if (u) rosterIds.add(u);
				if (String((row as { appointment_date?: string | null }).appointment_date || '') === today) {
					todayAppointments += 1;
				}
			}
		}
	}
	const totalPatients = rosterIds.size;

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
		totalPatients,
		pendingTasks: pendingInvoices,
		unreadMessages,
		providerOrgLinked: Boolean(orgId),
	});
}
