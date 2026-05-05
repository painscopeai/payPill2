import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageAiAdmin } from '@/server/auth/requireManageAiAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { purgeUploadedFileAdmin } from '@/server/knowledge/purgeUploadedFile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * DELETE /api/admin/knowledge-base/:uploadedFileId
 * Removes storage object, uploaded_files row (cascades documents + knowledge_base when linked).
 */
export async function DELETE(
	_request: NextRequest,
	context: { params: Promise<{ uploadedFileId: string }> },
) {
	const ctx = await requireManageAiAdmin(_request);
	if (ctx instanceof NextResponse) return ctx;

	const { uploadedFileId } = await context.params;
	if (!uploadedFileId?.trim()) {
		return NextResponse.json({ error: 'Missing uploadedFileId' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	try {
		await purgeUploadedFileAdmin(sb, uploadedFileId.trim());
	} catch (e) {
		const err = e as { statusCode?: number; message?: string };
		return NextResponse.json({ error: err.message ?? 'Delete failed' }, { status: err.statusCode ?? 500 });
	}

	return NextResponse.json({ success: true, deletedId: uploadedFileId.trim() });
}
