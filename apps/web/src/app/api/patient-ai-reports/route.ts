import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
	const userId = await getBearerUserId(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('patient_ai_reports')
		.select('id,title,report_markdown,source,created_at')
		.eq('user_id', userId)
		.order('created_at', { ascending: false })
		.limit(100);

	if (error) {
		console.error('[api/patient-ai-reports] GET', error.message);
		return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 });
	}

	return NextResponse.json({ items: data || [] });
}
