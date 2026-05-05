import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const userId = await getBearerUserId(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = await context.params;
	if (!id?.trim()) {
		return NextResponse.json({ error: 'Missing id' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const { error } = await sb
		.from('patient_ai_reports')
		.delete()
		.eq('id', id.trim())
		.eq('user_id', userId);

	if (error) {
		console.error('[api/patient-ai-reports/:id] DELETE', error.message);
		return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
	}

	return NextResponse.json({ success: true, id: id.trim() });
}
