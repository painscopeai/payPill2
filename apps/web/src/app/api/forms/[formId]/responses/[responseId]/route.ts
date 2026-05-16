import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { requireManageFormsAdmin } from '@/server/auth/requireManageFormsAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ formId: string; responseId: string }> },
) {
	const ctx = await requireManageFormsAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	const { formId, responseId } = await context.params;
	const sb = getSupabaseAdmin();

	try {
		const { data: row, error: findErr } = await sb
			.from('form_responses')
			.select('id')
			.eq('id', responseId)
			.eq('form_id', formId)
			.maybeSingle();
		if (findErr) throw findErr;
		if (!row) {
			return NextResponse.json({ error: 'Response not found' }, { status: 404 });
		}

		const { error: delErr } = await sb.from('form_responses').delete().eq('id', responseId);
		if (delErr) throw delErr;

		return NextResponse.json({ ok: true });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Failed to delete response';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
