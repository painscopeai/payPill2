import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { approveProviderApplication } from '@/server/admin/providerApplicationService';
import { notifyApplicantApproved } from '@/server/email/providerApplicationEmail';
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
		const { application, provider } = await approveProviderApplication(id, ctx.adminId);

		let email: { sent: true; resendEmailId?: string } | { sent: false; error: string };
		try {
			const r = await notifyApplicantApproved({
				to: application.applicant_email,
				organizationName: application.organization_name || 'Your organization',
				providerId: String(provider.id),
			});
			email = { sent: true, resendEmailId: r.resendEmailId };
		} catch (mailErr) {
			const errMsg = mailErr instanceof Error ? mailErr.message : 'Failed to send onboarding email';
			console.error('[approve] applicant onboarding email failed after approval:', mailErr);
			email = { sent: false, error: errMsg };
		}

		await auditLog({
			adminId: ctx.adminId,
			action: 'APPROVE_PROVIDER_APPLICATION',
			resourceType: 'provider_application',
			resourceId: id,
			changes: { provider_id: provider.id },
			ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
			userAgent: request.headers.get('user-agent'),
		});

		return NextResponse.json({ application, provider, email });
	} catch (e) {
		return errResponse(e);
	}
}
