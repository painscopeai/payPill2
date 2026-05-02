import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';
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

function isValidHttpsUrl(s: string): boolean {
	try {
		const u = new URL(s);
		return u.protocol === 'https:' || u.protocol === 'http:';
	} catch {
		return false;
	}
}

export async function PATCH(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await context.params;

	let body: { scheduling_url?: string | null };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (body.scheduling_url === undefined) {
		return NextResponse.json({ error: 'scheduling_url is required (use null to clear)' }, { status: 400 });
	}

	const trimmed =
		body.scheduling_url === null || body.scheduling_url === ''
			? null
			: String(body.scheduling_url).trim();
	if (trimmed !== null && !isValidHttpsUrl(trimmed)) {
		return NextResponse.json(
			{ error: 'scheduling_url must be a valid http(s) URL (e.g. Cal.com link)' },
			{ status: 400 },
		);
	}

	try {
		const sb = getSupabaseAdmin();
		const { data: existing, error: gErr } = await sb.from('providers').select('id').eq('id', id).maybeSingle();
		if (gErr) throw gErr;
		if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

		const { data: row, error: uErr } = await sb
			.from('providers')
			.update({
				scheduling_url: trimmed,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id)
			.select('*')
			.single();
		if (uErr) throw uErr;

		await auditLog({
			adminId: ctx.adminId,
			action: 'UPDATE_PROVIDER_SCHEDULING_URL',
			resourceType: 'provider',
			resourceId: id,
			changes: { scheduling_url: trimmed },
			ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
			userAgent: request.headers.get('user-agent'),
		});

		return NextResponse.json({ item: row });
	} catch (e) {
		return errResponse(e);
	}
}
