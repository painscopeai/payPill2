import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { fetchAppointmentsForPracticeOrg } from '@/server/provider/fetchAppointmentsForPracticeOrg';
import { getPharmacyAccessForOrg } from '@/server/provider/practiceRole';
import {
	backfillServiceQueueFromPendingActions,
	countOrgServiceQueueItems,
} from '@/server/provider/serviceQueueOrgAccess';

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

	const access = await getPharmacyAccessForOrg(sb, orgId);

	let pharmacy: { catalogItems: number; lowStockCount: number } | undefined;
	if (access.isPharmacy && orgId) {
		const { data: catalogRows, error: catErr } = await sb
			.from('provider_drug_catalog')
			.select('quantity_on_hand, low_stock_threshold')
			.eq('provider_org_id', orgId);
		if (catErr) console.error('[api/provider/dashboard/summary] pharmacy catalog', catErr.message);
		let lowStockCount = 0;
		for (const row of catalogRows || []) {
			const qty = typeof row.quantity_on_hand === 'number' ? row.quantity_on_hand : 0;
			const th = row.low_stock_threshold;
			if (th != null && qty <= th) lowStockCount += 1;
		}
		pharmacy = { catalogItems: (catalogRows || []).length, lowStockCount };
	}

	type ServiceSummaryRow = {
		id: string;
		name: string;
		price: number;
		unit: string;
		is_active: boolean;
	};

	let services: { total: number; active: number; recent: ServiceSummaryRow[] } | undefined;
	if (orgId) {
		const { data: svcRows, error: svcErr } = await sb
			.from('provider_services')
			.select('id, name, price, unit, is_active, sort_order')
			.eq('provider_id', orgId)
			.order('sort_order', { ascending: true })
			.order('name', { ascending: true })
			.limit(200);
		if (svcErr) {
			console.error('[api/provider/dashboard/summary] services', svcErr.message);
		} else {
			const rows = (svcRows || []) as {
				id: string;
				name: string;
				price: number;
				unit: string;
				is_active?: boolean | null;
			}[];
			services = {
				total: rows.length,
				active: rows.filter((r) => r.is_active !== false).length,
				recent: rows.slice(0, 8).map(
					(r): ServiceSummaryRow => ({
						id: r.id,
						name: r.name,
						price: Number(r.price) || 0,
						unit: r.unit || 'per_visit',
						is_active: r.is_active !== false,
					}),
				),
			};
		}
	}

	let laboratory: { openLabOrders: number; draftEncounters: number } | undefined;
	if (access.isLaboratory && orgId) {
		await backfillServiceQueueFromPendingActions(sb, 'laboratory');
		let openLabOrders = 0;
		try {
			openLabOrders = await countOrgServiceQueueItems(sb, {
				orgId,
				routedTo: 'laboratory',
				statuses: ['pending', 'in_progress'],
			});
		} catch (e) {
			console.error('[api/provider/dashboard/summary] lab queue count', e);
		}
		const { data: encRows, error: encErr } = await sb
			.from('provider_consultation_encounters')
			.select('status')
			.eq('provider_user_id', uid)
			.limit(300);
		if (encErr) console.error('[api/provider/dashboard/summary] lab encounters', encErr.message);
		let draftEncounters = 0;
		for (const row of encRows || []) {
			if (String((row as { status?: string }).status || '') === 'draft') draftEncounters += 1;
		}
		laboratory = { openLabOrders, draftEncounters };
	}

	return NextResponse.json({
		todayAppointments,
		totalPatients,
		pendingTasks: pendingInvoices,
		unreadMessages,
		providerOrgLinked: Boolean(orgId),
		operations_profile: access.operationsProfile,
		...(services ? { services } : {}),
		...(pharmacy ? { pharmacy } : {}),
		...(laboratory ? { laboratory } : {}),
	});
}
