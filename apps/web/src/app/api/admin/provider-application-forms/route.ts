import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { PROVIDER_ONBOARDING_INVITE_FORM_TYPES } from '@/lib/providerOnboardingInviteFormTypes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Published forms usable for provider onboarding invites (e.g. provider_application,
 * health_assessment). Uses manage_providers so onboarding works without manage_forms.
 */
export async function GET(_request: NextRequest) {
	const ctx = await requireManageProvidersAdmin(_request);
	if (ctx instanceof NextResponse) return ctx;

	const sb = getSupabaseAdmin();
	try {
		const { data, error } = await sb
			.from('forms')
			.select('id, name, form_type, status, updated_at')
			.in('form_type', [...PROVIDER_ONBOARDING_INVITE_FORM_TYPES])
			.eq('status', 'published')
			.order('name', { ascending: true });
		if (error) throw error;
		return NextResponse.json({ items: data ?? [] });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Failed to load forms';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
