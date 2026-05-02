import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { inviteOrResendProviderApplication } from '@/server/admin/providerApplicationService';
import { notifyApplicantInvite } from '@/server/email/providerApplicationEmail';
import { getPublicAppOrigin } from '@/server/utils/providerApplicationInvite';
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

	try {
		const { application, inviteToken } = await inviteOrResendProviderApplication(id);

		const origin = getPublicAppOrigin();
		const formId = application.form_id as string;
		const inviteUrl = `${origin}/forms/${formId}?application_token=${encodeURIComponent(inviteToken)}`;

		await notifyApplicantInvite({
			to: application.applicant_email,
			organizationName: application.organization_name || '',
			inviteUrl,
		});

		await auditLog({
			adminId: ctx.adminId,
			action: 'INVITE_PROVIDER_APPLICATION',
			resourceType: 'provider_application',
			resourceId: id,
			changes: { status: application.status },
			ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
			userAgent: request.headers.get('user-agent'),
		});

		return NextResponse.json({ application });
	} catch (e) {
		return errResponse(e);
	}
}
