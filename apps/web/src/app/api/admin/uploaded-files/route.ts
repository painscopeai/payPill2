import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageAiAdmin } from '@/server/auth/requireManageAiAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/uploaded-files?limit=25
 * Lists admin knowledge-base uploads (for dashboard / delete actions).
 */
export async function GET(request: NextRequest) {
	const ctx = await requireManageAiAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	const { searchParams } = new URL(request.url);
	const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('uploaded_files')
		.select(
			'id, file_name, size_bytes, mime_type, created_at, checksum_sha256, path, bucket, metadata',
		)
		.eq('source', 'admin_kb')
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({
		items: data ?? [],
	});
}
