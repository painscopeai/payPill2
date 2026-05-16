import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import {
	assertValidOperationsProfile,
	resolveDefaultProviderTypeSlugForOperationsProfile,
} from '@/server/admin/providerTypeService';
import { syncPracticeRoleFromProviderType } from '@/server/provider/syncPracticeRoleFromProviderType';
import type { OperationsProfile } from '@/server/provider/syncPracticeRoleFromProviderType';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PracticeBody = {
	practiceName?: string;
	address?: string | null;
	phone?: string | null;
	providerTypeSlug?: string | null;
	operationsProfile?: string | null;
};

const OPS_PROFILES = new Set(['doctor', 'pharmacist', 'laboratory']);

async function isActiveProviderTypeSlug(sb: ReturnType<typeof getSupabaseAdmin>, slug: string): Promise<boolean> {
	const { data, error } = await sb.from('provider_types').select('slug').eq('slug', slug).eq('active', true).maybeSingle();
	if (error) throw error;
	return Boolean(data?.slug);
}

async function resolveProviderTypeSlug(
	sb: ReturnType<typeof getSupabaseAdmin>,
	userId: string,
	bodySlug: string | null | undefined,
	bodyOperationsProfile: string | null | undefined,
): Promise<string> {
	const fromBodySlug = typeof bodySlug === 'string' ? bodySlug.trim().toLowerCase() : '';
	const fromBodyOps =
		typeof bodyOperationsProfile === 'string' ? bodyOperationsProfile.trim().toLowerCase() : '';

	if (fromBodyOps && OPS_PROFILES.has(fromBodyOps)) {
		return resolveDefaultProviderTypeSlugForOperationsProfile(
			assertValidOperationsProfile(fromBodyOps) as OperationsProfile,
		);
	}
	if (fromBodySlug) {
		if (OPS_PROFILES.has(fromBodySlug)) {
			return resolveDefaultProviderTypeSlugForOperationsProfile(
				assertValidOperationsProfile(fromBodySlug) as OperationsProfile,
			);
		}
		if (await isActiveProviderTypeSlug(sb, fromBodySlug)) return fromBodySlug;
	}

	const { data: authUser, error } = await sb.auth.admin.getUserById(userId);
	if (!error && authUser?.user?.user_metadata) {
		const meta = authUser.user.user_metadata as Record<string, unknown>;
		const fromMetaOps = String(meta.operations_profile || meta.operationsProfile || '')
			.trim()
			.toLowerCase();
		if (fromMetaOps && OPS_PROFILES.has(fromMetaOps)) {
			return resolveDefaultProviderTypeSlugForOperationsProfile(
				assertValidOperationsProfile(fromMetaOps) as OperationsProfile,
			);
		}
		const fromMeta = String(meta.provider_type || meta.providerType || '').trim().toLowerCase();
		if (fromMeta) {
			if (OPS_PROFILES.has(fromMeta)) {
				return resolveDefaultProviderTypeSlugForOperationsProfile(
					assertValidOperationsProfile(fromMeta) as OperationsProfile,
				);
			}
			if (await isActiveProviderTypeSlug(sb, fromMeta)) return fromMeta;
		}
	}

	console.warn('[onboarding/practice] No operations profile or provider type in metadata; defaulting to clinic');
	return resolveDefaultProviderTypeSlugForOperationsProfile('doctor');
}

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
	const typeSlug = await resolveProviderTypeSlug(
		sb,
		ctx.userId,
		body.providerTypeSlug,
		body.operationsProfile,
	);

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
				status: 'active',
				verification_status: 'verified',
				type: typeSlug,
			})
			.select('id')
			.single();

		if (insErr || !inserted?.id) {
			console.error('[onboarding/practice] insert provider', insErr?.message);
			return NextResponse.json({ error: insErr?.message || 'Failed to create practice' }, { status: 500 });
		}

		const orgId = inserted.id as string;

		try {
			await syncPracticeRoleFromProviderType(sb, orgId, typeSlug);
		} catch (syncErr) {
			console.error('[onboarding/practice] sync practice role', syncErr);
			return NextResponse.json(
				{ error: syncErr instanceof Error ? syncErr.message : 'Invalid practice specialty' },
				{ status: 400 },
			);
		}

		const { error: linkErr } = await sb
			.from('profiles')
			.update({ provider_org_id: orgId, updated_at: new Date().toISOString() })
			.eq('id', ctx.userId);

		if (linkErr) {
			console.error('[onboarding/practice] link profile', linkErr.message);
			return NextResponse.json({ error: linkErr.message }, { status: 500 });
		}

		const { data: prov } = await sb.from('providers').select('*').eq('id', orgId).maybeSingle();
		return NextResponse.json({ ok: true, practice: prov });
	}

	const orgId = profile.provider_org_id as string;

	const { error: upErr } = await sb
		.from('providers')
		.update({
			name: practiceName.slice(0, 500),
			provider_name: practiceName.slice(0, 500),
			email: displayEmail || null,
			phone: phoneFinal,
			address,
			status: 'active',
			verification_status: 'verified',
			updated_at: new Date().toISOString(),
		})
		.eq('id', orgId);

	if (upErr) {
		console.error('[onboarding/practice] update', upErr.message);
		return NextResponse.json({ error: upErr.message }, { status: 500 });
	}

	try {
		await syncPracticeRoleFromProviderType(sb, orgId, typeSlug);
	} catch (syncErr) {
		console.error('[onboarding/practice] sync practice role', syncErr);
		return NextResponse.json(
			{ error: syncErr instanceof Error ? syncErr.message : 'Invalid practice specialty' },
			{ status: 400 },
		);
	}

	const { data: updated } = await sb.from('providers').select('*').eq('id', orgId).maybeSingle();

	return NextResponse.json({ ok: true, practice: updated });
}
