import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { submitProviderApplication } from '@/server/admin/providerApplicationService';
import { notifyApplicationSubmitted } from '@/server/email/providerApplicationEmail';
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
		const row = await submitProviderApplication(id);

		await notifyApplicationSubmitted({
			applicationId: row.id,
			organizationName: row.organization_name || '',
			type: row.type,
			applicantEmail: row.applicant_email,
		});

		await auditLog({
			adminId: ctx.adminId,
			action: 'SUBMIT_PROVIDER_APPLICATION',
			resourceType: 'provider_application',
			resourceId: id,
			changes: { status: row.status },
			ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
			userAgent: request.headers.get('user-agent'),
		});

		return NextResponse.json({ application: row });
	} catch (e) {
		return errResponse(e);
	}
}
