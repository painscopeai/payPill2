import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { listInsuranceOrganizations } from '@/server/patient/listInsuranceOrganizations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public list of insurance org accounts for patient signup (no auth). */
export async function GET() {
	const sb = getSupabaseAdmin();
	const organizations = await listInsuranceOrganizations(sb);
	return NextResponse.json({ organizations });
}
