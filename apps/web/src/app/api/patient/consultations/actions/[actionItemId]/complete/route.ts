import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { completeConsultationActionItem } from '@/server/patient/completeConsultationActionItem';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/patient/consultations/actions/[actionItemId]/complete */
export async function POST(request: NextRequest, ctx: { params: Promise<{ actionItemId: string }> }) {
	void request;
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { actionItemId } = await ctx.params;
	const sb = getSupabaseAdmin();

	const result = await completeConsultationActionItem(sb, uid, actionItemId);
	if (!result.ok) {
		return NextResponse.json({ error: result.error }, { status: result.status });
	}
	if ('already' in result && result.already) {
		return NextResponse.json({ ok: true, already: true, health_record_id: result.health_record_id });
	}
	return NextResponse.json({ ok: true, health_record_id: result.health_record_id });
}
