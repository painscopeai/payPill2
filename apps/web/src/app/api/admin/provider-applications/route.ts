import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import {
	createDraftApplication,
	listProviderApplications,
} from '@/server/admin/providerApplicationService';
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

/** GET: list applications. Query: status, page, limit, mine=1 (drafts for current admin). */
export async function GET(request: NextRequest) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	const url = new URL(request.url);
	const rawStatus = url.searchParams.get('status');
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '50', 10);
	const mine = url.searchParams.get('mine') === '1';

	let statusFilter;
	if (rawStatus === 'all') statusFilter = undefined;
	else if (rawStatus) statusFilter = rawStatus;
	else if (mine) statusFilter = 'draft';
	else statusFilter = 'submitted';

	try {
		const applicantUserId = mine ? ctx.adminId : url.searchParams.get('applicant_user_id') || undefined;
		const result = await listProviderApplications({
			status: statusFilter,
			applicantUserId,
			page,
			limit,
		});
		return NextResponse.json(result);
	} catch (e) {
		return errResponse(e);
	}
}

/** POST: create draft application */
export async function POST(request: NextRequest) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const applicant_email = typeof body.applicant_email === 'string' ? body.applicant_email.trim() : '';
	if (!applicant_email) {
		return NextResponse.json({ error: 'applicant_email is required' }, { status: 400 });
	}

	try {
		const row = await createDraftApplication({
			applicant_email,
			organization_name: typeof body.organization_name === 'string' ? body.organization_name : null,
			type: typeof body.type === 'string' ? body.type : undefined,
			category: typeof body.category === 'string' ? body.category : null,
			phone: typeof body.phone === 'string' ? body.phone : null,
			specialty: typeof body.specialty === 'string' ? body.specialty : null,
			payload: typeof body.payload === 'object' && body.payload !== null ? (body.payload as Record<string, unknown>) : {},
			applicant_user_id:
				typeof body.applicant_user_id === 'string' ? body.applicant_user_id : ctx.adminId,
			form_id: typeof body.form_id === 'string' ? body.form_id : null,
			form_response_id: typeof body.form_response_id === 'string' ? body.form_response_id : null,
		});

		await auditLog({
			adminId: ctx.adminId,
			action: 'CREATE_PROVIDER_APPLICATION',
			resourceType: 'provider_application',
			resourceId: row.id,
			changes: { status: row.status },
			ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
			userAgent: request.headers.get('user-agent'),
		});

		return NextResponse.json({ application: row }, { status: 201 });
	} catch (e) {
		return errResponse(e);
	}
}
