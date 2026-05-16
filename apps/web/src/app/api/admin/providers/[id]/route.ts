import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { syncPracticeRoleFromProviderType } from '@/server/provider/syncPracticeRoleFromProviderType';
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
		type?: string | null;
		provider_type_slug?: string | null;
		practice_role_id?: string | null;
		practice_role_slug?: string | null;
	};
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const hasScheduling = body.scheduling_url !== undefined;
	const hasType = body.type !== undefined || body.provider_type_slug !== undefined;
	const hasRoleId = body.practice_role_id !== undefined;
	const hasRoleSlug = body.practice_role_slug !== undefined;

	if (!hasScheduling && !hasType && !hasRoleId && !hasRoleSlug) {
		return NextResponse.json(
			{
				error:
					'Provide at least one of: scheduling_url, type, provider_type_slug, practice_role_id, practice_role_slug',
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

		const { data: existing, error: gErr } = await sb.from('providers').select('id').eq('id', id).maybeSingle();
		if (gErr) throw gErr;
		if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

		if (hasType) {
			const raw = body.type !== undefined ? body.type : body.provider_type_slug;
			if (raw === null || raw === '') {
				return NextResponse.json({ error: 'type cannot be cleared; assign an active specialty slug' }, { status: 400 });
			}
			const typeSlug = String(raw).trim().toLowerCase();
			const synced = await syncPracticeRoleFromProviderType(sb, id, typeSlug);
			changes.type = synced.type;
			changes.practice_role_id = synced.practice_role_id;
		} else if (hasRoleId) {
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

		let row;
		if (Object.keys(updates).length > 1) {
			const { data, error: uErr } = await sb
				.from('providers')
				.update(updates)
				.eq('id', id)
				.select('*')
				.single();
			if (uErr) throw uErr;
			row = data;
		} else {
			const { data, error: uErr } = await sb.from('providers').select('*').eq('id', id).single();
			if (uErr) throw uErr;
			row = data;
		}

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
