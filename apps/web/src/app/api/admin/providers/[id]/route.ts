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

	let body: {
		scheduling_url?: string | null;
		practice_role_id?: string | null;
		practice_role_slug?: string | null;
	};
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const hasScheduling = body.scheduling_url !== undefined;
	const hasRoleId = body.practice_role_id !== undefined;
	const hasRoleSlug = body.practice_role_slug !== undefined;

	if (!hasScheduling && !hasRoleId && !hasRoleSlug) {
		return NextResponse.json(
			{
				error:
					'Provide at least one of: scheduling_url, practice_role_id, practice_role_slug',
			},
			{ status: 400 },
		);
	}

	const updates: Record<string, unknown> = {
		updated_at: new Date().toISOString(),
	};
	const changes: Record<string, unknown> = {};

	if (hasScheduling) {
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
		updates.scheduling_url = trimmed;
		changes.scheduling_url = trimmed;
	}

	try {
		const sb = getSupabaseAdmin();

		if (hasRoleId) {
			if (body.practice_role_id === null) {
				updates.practice_role_id = null;
				changes.practice_role_id = null;
			} else {
				const rid = String(body.practice_role_id).trim();
				const { data: role, error: roleErr } = await sb
					.from('provider_practice_roles')
					.select('id')
					.eq('id', rid)
					.eq('active', true)
					.maybeSingle();
				if (roleErr) throw roleErr;
				if (!role) return NextResponse.json({ error: 'practice_role_id not found' }, { status: 400 });
				updates.practice_role_id = rid;
				changes.practice_role_id = rid;
			}
		} else if (hasRoleSlug) {
			if (body.practice_role_slug === null) {
				updates.practice_role_id = null;
				changes.practice_role_slug = null;
			} else {
				const slug = String(body.practice_role_slug).trim().toLowerCase();
				const { data: role, error: roleErr } = await sb
					.from('provider_practice_roles')
					.select('id')
					.eq('slug', slug)
					.eq('active', true)
					.maybeSingle();
				if (roleErr) throw roleErr;
				if (!role) return NextResponse.json({ error: 'practice_role_slug not found' }, { status: 400 });
				updates.practice_role_id = role.id;
				changes.practice_role_slug = slug;
			}
		}

		const { data: existing, error: gErr } = await sb.from('providers').select('id').eq('id', id).maybeSingle();
		if (gErr) throw gErr;
		if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

		const { data: row, error: uErr } = await sb
			.from('providers')
			.update(updates)
			.eq('id', id)
			.select('*')
			.single();
		if (uErr) throw uErr;

		await auditLog({
			adminId: ctx.adminId,
			action: 'UPDATE_PROVIDER',
			resourceType: 'provider',
			resourceId: id,
			changes,
			ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
			userAgent: request.headers.get('user-agent'),
		});

		return NextResponse.json({ item: row });
	} catch (e) {
		return errResponse(e);
	}
}
