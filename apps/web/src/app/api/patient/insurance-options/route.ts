import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { listInsuranceOrganizations } from '@/server/patient/listInsuranceOrganizations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/patient/insurance-options — authenticated; same payload as public list. */
export async function GET(request: NextRequest) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const sb = getSupabaseAdmin();
	const organizations = await listInsuranceOrganizations(sb);
	return NextResponse.json({ organizations });
}
