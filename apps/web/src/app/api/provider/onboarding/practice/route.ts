import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PracticeBody = {
	practiceName?: string;
	address?: string | null;
	phone?: string | null;
};

/** PUT /api/provider/onboarding/practice — create or update directory org + link profile */
export async function PUT(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	let body: PracticeBody = {};
	try {
		body = (await request.json()) as PracticeBody;
	} catch {
		body = {};
	}

	const practiceName = String(body.practiceName || '').trim();
	if (!practiceName) {
		return NextResponse.json({ error: 'practiceName is required' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const address = typeof body.address === 'string' ? body.address.trim() || null : null;
	const phoneFinal = typeof body.phone === 'string' ? body.phone.trim() || null : null;

	const { data: profile } = await sb
		.from('profiles')
		.select('id, email, provider_org_id')
		.eq('id', ctx.userId)
		.maybeSingle();

	if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

	const displayEmail = (profile.email as string) || ctx.email || '';

	if (!profile.provider_org_id) {
		const { data: inserted, error: insErr } = await sb
			.from('providers')
			.insert({
				name: practiceName.slice(0, 500),
				provider_name: practiceName.slice(0, 500),
				email: displayEmail || null,
				phone: phoneFinal,
				address: address,
				status: 'pending',
				verification_status: 'pending',
				type: 'clinic',
			})
			.select('id')
			.single();

		if (insErr || !inserted?.id) {
			console.error('[onboarding/practice] insert provider', insErr?.message);
			return NextResponse.json({ error: insErr?.message || 'Failed to create practice' }, { status: 500 });
		}

		const { error: linkErr } = await sb
			.from('profiles')
			.update({ provider_org_id: inserted.id, updated_at: new Date().toISOString() })
			.eq('id', ctx.userId);

		if (linkErr) {
			console.error('[onboarding/practice] link profile', linkErr.message);
			return NextResponse.json({ error: linkErr.message }, { status: 500 });
		}

		const { data: prov } = await sb.from('providers').select('*').eq('id', inserted.id).maybeSingle();
		return NextResponse.json({ ok: true, practice: prov });
	}

	const { data: updated, error: upErr } = await sb
		.from('providers')
		.update({
			name: practiceName.slice(0, 500),
			provider_name: practiceName.slice(0, 500),
			email: displayEmail || null,
			phone: phoneFinal,
			address,
			updated_at: new Date().toISOString(),
		})
		.eq('id', profile.provider_org_id as string)
		.select('*')
		.maybeSingle();

	if (upErr) {
		console.error('[onboarding/practice] update', upErr.message);
		return NextResponse.json({ error: upErr.message }, { status: 500 });
	}

	return NextResponse.json({ ok: true, practice: updated });
}
