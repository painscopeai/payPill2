import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { getPracticeRoleSlugForOrg } from '@/server/provider/practiceRole';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/practice-context — org + practice_role_slug for UI gating. */
export async function GET(request: NextRequest) {
	void request;
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const sb = getSupabaseAdmin();
	const slug = await getPracticeRoleSlugForOrg(sb, ctx.providerOrgId);

	return NextResponse.json({
		provider_org_id: ctx.providerOrgId,
		practice_role_slug: slug,
	});
}
