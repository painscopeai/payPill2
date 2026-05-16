import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { getPharmacyAccessForOrg } from '@/server/provider/practiceRole';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/practice-context — org + practice_role_slug for UI gating. */
export async function GET(request: NextRequest) {
	void request;
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const sb = getSupabaseAdmin();
	const access = await getPharmacyAccessForOrg(sb, ctx.providerOrgId);

	return NextResponse.json({
		provider_org_id: ctx.providerOrgId,
		practice_org_name: access.practiceOrgName,
		practice_org_address: access.practiceOrgAddress,
		practice_role_slug: access.practiceRoleSlug,
		operations_profile: access.operationsProfile,
		provider_type_slug: access.providerTypeSlug,
		provider_type_label: access.providerTypeLabel,
		is_pharmacy: access.isPharmacy,
		is_laboratory: access.isLaboratory,
	});
}
