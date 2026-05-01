import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { createProviderType, listProviderTypes } from '@/server/admin/providerTypeService';
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

export async function GET(request: NextRequest) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	const url = new URL(request.url);
	const includeInactive = url.searchParams.get('include_inactive') === '1';

	try {
		const items = await listProviderTypes(includeInactive);
		return NextResponse.json({ items });
	} catch (e) {
		return errResponse(e);
	}
}

export async function POST(request: NextRequest) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	let body: { slug?: string; label?: string; sort_order?: number; active?: boolean };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (typeof body.slug !== 'string' || typeof body.label !== 'string') {
		return NextResponse.json({ error: 'slug and label are required' }, { status: 400 });
	}

	try {
		const row = await createProviderType({
			slug: body.slug,
			label: body.label,
			sort_order: typeof body.sort_order === 'number' ? body.sort_order : undefined,
			active: body.active,
		});

		await auditLog({
			adminId: ctx.adminId,
			action: 'CREATE_PROVIDER_TYPE',
			resourceType: 'provider_type',
			resourceId: row.id,
			changes: { slug: row.slug, label: row.label },
			ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
			userAgent: request.headers.get('user-agent'),
		});

		return NextResponse.json({ item: row }, { status: 201 });
	} catch (e) {
		return errResponse(e);
	}
}
