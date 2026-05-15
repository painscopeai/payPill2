import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { getProviderOwnedForm } from '@/server/forms/assertProviderFormAccess';
import { decorateProviderServiceRows, PROVIDER_SERVICE_LIST_SELECT } from '@/server/provider/providerServiceCatalogShape';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function assertOwnService(sb: ReturnType<typeof getSupabaseAdmin>, orgId: string, id: string) {
	const { data, error } = await sb
		.from('provider_services')
		.select('id')
		.eq('id', id)
		.eq('provider_id', orgId)
		.maybeSingle();
	if (error) return { ok: false as const, status: 500 as const, error: error.message };
	if (!data) return { ok: false as const, status: 404 as const, error: 'Not found' };
	return { ok: true as const };
}

type PutBody = {
	consentFormId?: string | null;
	intakeFormId?: string | null;
};

/**
 * PUT — attach or clear consent / service-intake forms for a catalog service row.
 * Forms must be owned by the provider and match the attachment kind (consent vs service_intake).
 */
export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const authResult = await requireProvider(request);
	if (authResult instanceof NextResponse) return authResult;
	const auth = authResult;
	if (!auth.providerOrgId) {
		return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });
	}

	const { id: serviceId } = await ctx.params;
	let body: PutBody;
	try {
		body = (await request.json()) as PutBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const gate = await assertOwnService(sb, auth.providerOrgId, serviceId);
	if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

	const hasConsent = 'consentFormId' in body;
	const hasIntake = 'intakeFormId' in body;
	if (!hasConsent && !hasIntake) {
		return NextResponse.json({ error: 'Provide consentFormId and/or intakeFormId' }, { status: 400 });
	}

	async function setAttachment(kind: 'consent' | 'intake', formId: string | null | undefined) {
		if (formId === undefined) return;
		if (formId === null || formId === '') {
			const { error } = await sb
				.from('provider_service_form_attachments')
				.delete()
				.eq('provider_service_id', serviceId)
				.eq('attachment_kind', kind);
			if (error) throw error;
			return;
		}
		const owned = await getProviderOwnedForm(sb, auth.userId, formId);
		if (!owned) {
			throw Object.assign(new Error('Form not found or not owned by you'), { status: 400 });
		}
		if (kind === 'consent' && owned.form_type !== 'consent') {
			throw Object.assign(new Error('Consent slot requires a form with type "consent"'), { status: 400 });
		}
		if (kind === 'intake' && owned.form_type !== 'service_intake') {
			throw Object.assign(new Error('Intake slot requires a form with type "service_intake"'), { status: 400 });
		}

		const { error: upErr } = await sb.from('provider_service_form_attachments').upsert(
			{
				provider_service_id: serviceId,
				form_id: formId,
				attachment_kind: kind,
				sort_order: 0,
			},
			{ onConflict: 'provider_service_id,attachment_kind' },
		);
		if (upErr) throw upErr;
	}

	try {
		if (hasConsent) await setAttachment('consent', body.consentFormId);
		if (hasIntake) await setAttachment('intake', body.intakeFormId);

		const { data: refreshed } = await sb
			.from('provider_services')
			.select(PROVIDER_SERVICE_LIST_SELECT)
			.eq('id', serviceId)
			.single();

		const shaped = decorateProviderServiceRows(refreshed ? [refreshed] : []);
		return NextResponse.json({ item: shaped[0] ?? refreshed });
	} catch (e: unknown) {
		const status = typeof e === 'object' && e !== null && 'status' in e ? (e as { status: number }).status : 500;
		const msg = e instanceof Error ? e.message : 'Update failed';
		return NextResponse.json({ error: msg }, { status: status === 400 ? 400 : 500 });
	}
}
