import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { getPracticeRoleSlugForOrg, isPharmacyPracticeRole } from '@/server/provider/practiceRole';
import { resolveOperationsProfileForTypeSlug } from '@/server/provider/syncPracticeRoleFromProviderType';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/practice-context — org + practice_role_slug for UI gating. */
export async function GET(request: NextRequest) {
	void request;
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const sb = getSupabaseAdmin();
	const slug = await getPracticeRoleSlugForOrg(sb, ctx.providerOrgId);

	let provider_type_slug: string | null = null;
	let provider_type_label: string | null = null;
	let operations_profile: string | null = slug;
	if (ctx.providerOrgId) {
		const { data: org } = await sb.from('providers').select('type').eq('id', ctx.providerOrgId).maybeSingle();
		const typeSlug = org?.type ? String(org.type) : null;
		if (typeSlug) {
			provider_type_slug = typeSlug;
			const { data: typeRow } = await sb
				.from('provider_types')
				.select('label, operations_profile')
				.eq('slug', typeSlug)
				.maybeSingle();
			provider_type_label = typeRow?.label ? String(typeRow.label) : typeSlug;
			if (typeRow?.operations_profile) {
				operations_profile = String(typeRow.operations_profile);
			} else {
				const resolved = await resolveOperationsProfileForTypeSlug(sb, typeSlug);
				if (resolved) operations_profile = resolved;
			}
		}
	}

	const is_pharmacy = isPharmacyPracticeRole(slug) || operations_profile === 'pharmacist';

	return NextResponse.json({
		provider_org_id: ctx.providerOrgId,
		practice_role_slug: slug,
		operations_profile,
		provider_type_slug,
		provider_type_label,
		is_pharmacy,
	});
}
