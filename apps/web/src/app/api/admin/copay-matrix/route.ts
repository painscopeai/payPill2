import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { createCopayMatrix, listCopayMatrix } from '@/server/admin/appointmentReferenceService';
import { auditLog } from '@/server/express-api/middleware/rbac.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function errResponse(e: unknown, fallback = 500) {
	const msg = e instanceof Error ? e.message : 'Server error';
	const status =
		typeof e === 'object' && e !== null && 'status' in e && typeof (e as { status: unknown }).status === 'number'
			? (e as { status: number }).status
			: fallback;
	return NextResponse.json({ error: msg }, { status });
}

export async function GET(request: NextRequest) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	const url = new URL(request.url);
	const includeInactive = url.searchParams.get('include_inactive') === '1';

	try {
		const items = await listCopayMatrix(includeInactive);
		return NextResponse.json({ items });
	} catch (e) {
		return errResponse(e);
	}
}

export async function POST(request: NextRequest) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	let body: {
		visit_type_id?: string;
		insurance_option_id?: string;
		copay_estimate?: number;
		list_price?: number | null;
		active?: boolean;
	};
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (typeof body.visit_type_id !== 'string' || typeof body.insurance_option_id !== 'string') {
		return NextResponse.json({ error: 'visit_type_id and insurance_option_id are required' }, { status: 400 });
	}
	if (typeof body.copay_estimate !== 'number' || Number.isNaN(body.copay_estimate)) {
		return NextResponse.json({ error: 'copay_estimate is required' }, { status: 400 });
	}

	try {
		const row = await createCopayMatrix({
			visit_type_id: body.visit_type_id,
			insurance_option_id: body.insurance_option_id,
			copay_estimate: body.copay_estimate,
			list_price: body.list_price,
			active: body.active,
		});

		await auditLog({
			adminId: ctx.adminId,
			action: 'CREATE_COPAY_MATRIX',
			resourceType: 'appointment_copay_matrix',
			resourceId: row.id,
			changes: {
				visit_type_id: row.visit_type_id,
				insurance_option_id: row.insurance_option_id,
			},
			ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
			userAgent: request.headers.get('user-agent'),
		});

		return NextResponse.json({ item: row }, { status: 201 });
	} catch (e) {
		return errResponse(e);
	}
}
