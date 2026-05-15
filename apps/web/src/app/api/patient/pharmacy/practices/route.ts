import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/patient/pharmacy/practices — directory orgs with pharmacist practice role (for shop picker).
 */
export async function GET(request: NextRequest) {
	void request;
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const sb = getSupabaseAdmin();
	const { data: roleRow, error: rErr } = await sb
		.from('provider_practice_roles')
		.select('id')
		.eq('slug', 'pharmacist')
		.eq('active', true)
		.maybeSingle();
	if (rErr || !roleRow?.id) return NextResponse.json({ items: [] });

	const { data, error } = await sb
		.from('providers')
		.select('id, name, address, phone, status')
		.eq('practice_role_id', roleRow.id as string)
		.neq('status', 'inactive')
		.order('name', { ascending: true })
		.limit(500);

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json({ items: data || [] });
}
