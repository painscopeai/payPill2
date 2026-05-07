import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageUsersAdmin } from '@/server/auth/requireManageUsersAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { auditLog } from '@/server/express-api/middleware/rbac.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ALLOWED_STATUS = new Set(['active', 'inactive', 'suspended', 'pending']);

type PatchBody = {
	first_name?: string;
	last_name?: string;
	name?: string;
	phone?: string;
	company_name?: string;
	status?: string;
	subscription_status?: string;
	subscription_plan?: string;
	admin_notes?: string;
};

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const ctx = await requireManageUsersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await params;
	const sb = getSupabaseAdmin();
	const { data, error } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
	return NextResponse.json(data);
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const ctx = await requireManageUsersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await params;

	let body: PatchBody;
	try {
		body = (await request.json()) as PatchBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const updatable: PatchBody = {};
	if (body.first_name !== undefined) updatable.first_name = String(body.first_name).slice(0, 200);
	if (body.last_name !== undefined) updatable.last_name = String(body.last_name).slice(0, 200);
	if (body.name !== undefined) updatable.name = String(body.name).slice(0, 200);
	if (body.phone !== undefined) updatable.phone = String(body.phone).slice(0, 60);
	if (body.company_name !== undefined) updatable.company_name = String(body.company_name).slice(0, 300);
	if (body.subscription_status !== undefined)
		updatable.subscription_status = String(body.subscription_status).slice(0, 60);
	if (body.subscription_plan !== undefined)
		updatable.subscription_plan = String(body.subscription_plan).slice(0, 200);
	if (body.admin_notes !== undefined) updatable.admin_notes = String(body.admin_notes).slice(0, 2000);
	if (body.status !== undefined) {
		const v = String(body.status).toLowerCase();
		if (!ALLOWED_STATUS.has(v)) {
			return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
		}
		updatable.status = v;
	}

	if (Object.keys(updatable).length === 0) {
		return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const { data: existing, error: getErr } = await sb
		.from('profiles')
		.select('id, role')
		.eq('id', id)
		.maybeSingle();
	if (getErr) return NextResponse.json({ error: getErr.message }, { status: 500 });
	if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const { data, error } = await sb
		.from('profiles')
		.update({ ...updatable, updated_at: new Date().toISOString() })
		.eq('id', id)
		.select('*')
		.maybeSingle();

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });

	if (updatable.status === 'inactive' || updatable.status === 'suspended') {
		try {
			await sb.auth.admin.updateUserById(id, { ban_duration: '876000h' });
		} catch (e) {
			console.warn('[admin/users PATCH] ban failed:', (e as Error).message);
		}
	} else if (updatable.status === 'active') {
		try {
			await sb.auth.admin.updateUserById(id, { ban_duration: 'none' });
		} catch (e) {
			console.warn('[admin/users PATCH] unban failed:', (e as Error).message);
		}
	}

	await auditLog({
		adminId: ctx.adminId,
		action: 'ADMIN_USER_PATCH',
		resourceType: 'profiles',
		resourceId: id,
		changes: updatable as Record<string, unknown>,
		ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
		userAgent: request.headers.get('user-agent'),
	});

	return NextResponse.json(data);
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const ctx = await requireManageUsersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await params;

	if (id === ctx.adminId) {
		return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const { data: existing, error: existingErr } = await sb
		.from('profiles')
		.select('id')
		.eq('id', id)
		.maybeSingle();
	if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 });
	if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const { error: patchErr } = await sb
		.from('profiles')
		.update({ status: 'inactive', updated_at: new Date().toISOString() })
		.eq('id', id);
	if (patchErr) return NextResponse.json({ error: patchErr.message }, { status: 500 });

	await sb.auth.admin.updateUserById(id, { ban_duration: '876000h' });

	await auditLog({
		adminId: ctx.adminId,
		action: 'ADMIN_USER_SOFT_DISABLE',
		resourceType: 'profiles',
		resourceId: id,
		changes: { status: 'inactive' },
		ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
		userAgent: request.headers.get('user-agent'),
	});

	return NextResponse.json({ ok: true, softDisabled: true });
}
