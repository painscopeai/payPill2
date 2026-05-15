import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { auditLog } from '@/server/express-api/middleware/rbac.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** PATCH /api/admin/practice-roles/[id] */
export async function PATCH(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await context.params;

	const body = (await request.json().catch(() => ({}))) as {
		label?: string;
		sort_order?: number;
		active?: boolean;
	};

	const patch: Record<string, unknown> = {};
	if (typeof body.label === 'string' && body.label.trim()) patch.label = body.label.trim();
	if (typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)) {
		patch.sort_order = Math.floor(body.sort_order);
	}
	if (typeof body.active === 'boolean') patch.active = body.active;

	if (Object.keys(patch).length === 0) {
		return NextResponse.json({ error: 'No updatable fields' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('provider_practice_roles')
		.update({ ...patch, updated_at: new Date().toISOString() })
		.eq('id', id)
		.select('*')
		.maybeSingle();

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	await auditLog({
		adminId: ctx.adminId,
		action: 'UPDATE_PRACTICE_ROLE',
		resourceType: 'provider_practice_role',
		resourceId: id,
		changes: patch,
		ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
		userAgent: request.headers.get('user-agent'),
	});

	return NextResponse.json({ item: data });
}
