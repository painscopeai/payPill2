import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { getCopayMatrixRow, updateCopayMatrix } from '@/server/admin/appointmentReferenceService';
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

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await context.params;
	try {
		const row = await getCopayMatrixRow(id);
		if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
		return NextResponse.json({ item: row });
	} catch (e) {
		return errResponse(e);
	}
}

export async function PATCH(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await context.params;

	let body: {
		copay_estimate?: number;
		list_price?: number | null;
		active?: boolean;
	};
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	try {
		const row = await updateCopayMatrix(id, {
			copay_estimate: typeof body.copay_estimate === 'number' ? body.copay_estimate : undefined,
			list_price:
				body.list_price === undefined
					? undefined
					: body.list_price === null
						? null
						: Number(body.list_price),
			active: typeof body.active === 'boolean' ? body.active : undefined,
		});

		await auditLog({
			adminId: ctx.adminId,
			action: 'UPDATE_COPAY_MATRIX',
			resourceType: 'appointment_copay_matrix',
			resourceId: id,
			changes: body,
			ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
			userAgent: request.headers.get('user-agent'),
		});

		return NextResponse.json({ item: row });
	} catch (e) {
		return errResponse(e);
	}
}
