import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { rejectProviderApplication } from '@/server/admin/providerApplicationService';
import { notifyApplicantRejected } from '@/server/email/providerApplicationEmail';
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

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await context.params;

	let body: { reason?: string };
	try {
		body = (await request.json()) as { reason?: string };
	} catch {
		body = {};
	}
	const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
	if (!reason) {
		return NextResponse.json({ error: 'reason is required' }, { status: 400 });
	}

	try {
		const application = await rejectProviderApplication(id, ctx.adminId, reason);

		await notifyApplicantRejected({
			to: application.applicant_email,
			organizationName: application.organization_name || '',
			reason,
		});

		await auditLog({
			adminId: ctx.adminId,
			action: 'REJECT_PROVIDER_APPLICATION',
			resourceType: 'provider_application',
			resourceId: id,
			changes: { reason },
			ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
			userAgent: request.headers.get('user-agent'),
		});

		return NextResponse.json({ application });
	} catch (e) {
		return errResponse(e);
	}
}
