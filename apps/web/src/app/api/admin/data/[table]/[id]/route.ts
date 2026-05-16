import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/server/auth/requirePlatformAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { auditLog } from '@/server/express-api/middleware/rbac.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DELETABLE_TABLES = new Set([
	'ai_logs',
	'subscription_plans',
	'subscriptions',
	'subscription_logs',
	'transactions',
]);

export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ table: string; id: string }> },
) {
	const ctx = await requirePlatformAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	const { table, id } = await context.params;
	if (!DELETABLE_TABLES.has(table)) {
		return NextResponse.json({ error: 'Table not allowed for delete' }, { status: 400 });
	}
	if (!id) {
		return NextResponse.json({ error: 'Missing id' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	try {
		const { data: existing, error: exErr } = await sb.from(table).select('id').eq('id', id).maybeSingle();
		if (exErr) throw exErr;
		if (!existing) {
			return NextResponse.json({ error: 'Not found' }, { status: 404 });
		}

		const { error: delErr } = await sb.from(table).delete().eq('id', id);
		if (delErr) throw delErr;

		await auditLog({
			adminId: ctx.adminId,
			action: 'ADMIN_DELETE_RECORD',
			resourceType: table,
			resourceId: id,
			changes: { deleted: true },
			ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
			userAgent: request.headers.get('user-agent'),
		});

		return NextResponse.json({ ok: true });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Delete failed';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
