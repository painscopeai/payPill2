import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { getProviderApplication, updateDraftApplication } from '@/server/admin/providerApplicationService';
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
		const row = await getProviderApplication(id);
		if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
		return NextResponse.json({ application: row });
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

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	try {
		const row = await updateDraftApplication(id, {
			applicant_email: typeof body.applicant_email === 'string' ? body.applicant_email : undefined,
			organization_name:
				body.organization_name === undefined
					? undefined
					: typeof body.organization_name === 'string'
						? body.organization_name
						: null,
			type: typeof body.type === 'string' ? body.type : undefined,
			category:
				body.category === undefined ? undefined : typeof body.category === 'string' ? body.category : null,
			phone: body.phone === undefined ? undefined : typeof body.phone === 'string' ? body.phone : null,
			specialty:
				body.specialty === undefined ? undefined : typeof body.specialty === 'string' ? body.specialty : null,
			payload:
				body.payload === undefined
					? undefined
					: typeof body.payload === 'object' && body.payload !== null
						? (body.payload as Record<string, unknown>)
						: {},
			form_id: body.form_id === undefined ? undefined : typeof body.form_id === 'string' ? body.form_id : null,
			form_response_id:
				body.form_response_id === undefined
					? undefined
					: typeof body.form_response_id === 'string'
						? body.form_response_id
						: null,
		});

		await auditLog({
			adminId: ctx.adminId,
			action: 'UPDATE_PROVIDER_APPLICATION',
			resourceType: 'provider_application',
			resourceId: id,
			changes: body,
			ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
			userAgent: request.headers.get('user-agent'),
		});

		return NextResponse.json({ application: row });
	} catch (e) {
		return errResponse(e);
	}
}
