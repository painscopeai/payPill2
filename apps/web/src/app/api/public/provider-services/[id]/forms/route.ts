import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Anonymous read: published consent / service-intake forms linked to an active catalog service.
 * Used by patients (booking), employers, and insurers when they have a service id.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
	const { id: serviceId } = await context.params;
	const sb = getSupabaseAdmin();

	try {
		const { data: svc, error: sErr } = await sb
			.from('provider_services')
			.select('id, name, is_active')
			.eq('id', serviceId)
			.maybeSingle();
		if (sErr) throw sErr;
		if (!svc || !svc.is_active) {
			return NextResponse.json({ error: 'Service not found' }, { status: 404 });
		}

		const { data: rows, error: aErr } = await sb
			.from('provider_service_form_attachments')
			.select('attachment_kind, forms ( id, name, status, form_type )')
			.eq('provider_service_id', serviceId);
		if (aErr) throw aErr;

		let consentForm: { id: string; name: string; publicPath: string } | null = null;
		let intakeForm: { id: string; name: string; publicPath: string } | null = null;

		for (const raw of rows || []) {
			const row = raw as { attachment_kind: string; forms: unknown };
			const f = row.forms as { id: string; name: string; status: string; form_type: string } | null;
			if (!f || f.status !== 'published') continue;
			const entry = { id: f.id, name: f.name, publicPath: `/forms/${f.id}` };
			if (row.attachment_kind === 'consent' && f.form_type === 'consent') consentForm = entry;
			if (row.attachment_kind === 'intake' && f.form_type === 'service_intake') intakeForm = entry;
		}

		return NextResponse.json({
			serviceId: svc.id as string,
			serviceName: svc.name as string,
			consentForm,
			intakeForm,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Failed to load';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
