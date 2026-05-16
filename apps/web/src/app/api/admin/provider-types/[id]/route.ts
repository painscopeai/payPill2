import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { deactivateProviderType, getProviderType, updateProviderType } from '@/server/admin/providerTypeService';
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
		const row = await getProviderType(id);
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

	let body: { label?: string; sort_order?: number; active?: boolean; operations_profile?: string };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	try {
		const row = await updateProviderType(id, {
			label: body.label,
			sort_order: typeof body.sort_order === 'number' ? body.sort_order : undefined,
			active: typeof body.active === 'boolean' ? body.active : undefined,
			operations_profile:
				typeof body.operations_profile === 'string' ? (body.operations_profile as 'doctor' | 'pharmacist' | 'laboratory') : undefined,
		});

		await auditLog({
			adminId: ctx.adminId,
			action: 'UPDATE_PROVIDER_TYPE',
			resourceType: 'provider_type',
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

/** Soft-delete: sets active = false */
export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await context.params;

	try {
		const row = await deactivateProviderType(id);

		await auditLog({
			adminId: ctx.adminId,
			action: 'DEACTIVATE_PROVIDER_TYPE',
			resourceType: 'provider_type',
			resourceId: id,
			changes: { active: false },
			ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
			userAgent: request.headers.get('user-agent'),
		});

		return NextResponse.json({ item: row });
	} catch (e) {
		return errResponse(e);
	}
}
