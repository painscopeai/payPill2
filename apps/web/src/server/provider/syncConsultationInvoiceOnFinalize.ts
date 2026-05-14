import type { SupabaseClient } from '@supabase/supabase-js';
import { visitLabelFromAppointmentRow } from '@/server/provider/visitLabelFromAppointmentRow';

type AppointmentRow = Record<string, unknown>;

export type SyncConsultationInvoiceResult = {
	created: boolean;
	invoiceId?: string;
	reason?: string;
};

/**
 * When a consultation encounter is finalized, create a single draft invoice for that visit
 * (idempotent per encounter_id).
 */
export async function syncConsultationInvoiceOnFinalize(
	sb: SupabaseClient,
	args: {
		encounterId: string;
		appointmentId: string;
		patientUserId: string;
		providerUserId: string;
		providerOrgId: string;
		appointmentRow: AppointmentRow;
	},
): Promise<SyncConsultationInvoiceResult> {
	const { encounterId, appointmentId, patientUserId, providerUserId, providerOrgId, appointmentRow } = args;

	const { data: existing } = await sb
		.from('provider_invoices')
		.select('id')
		.eq('encounter_id', encounterId)
		.maybeSingle();
	if (existing && typeof existing === 'object' && 'id' in existing && (existing as { id: string }).id) {
		return { created: false, invoiceId: (existing as { id: string }).id, reason: 'invoice_exists' };
	}

	const visitLabel = visitLabelFromAppointmentRow(appointmentRow);
	let serviceId: string | null = appointmentRow.provider_service_id ? String(appointmentRow.provider_service_id) : null;
	let serviceName = visitLabel;
	let amount = 0;
	let currency = 'USD';

	if (serviceId) {
		const { data: svc } = await sb
			.from('provider_services')
			.select('id, name, price, currency')
			.eq('id', serviceId)
			.eq('provider_id', providerOrgId)
			.eq('is_active', true)
			.maybeSingle();
		if (svc && typeof svc === 'object') {
			const s = svc as { name?: string; price?: number | string; currency?: string };
			serviceName = String(s.name || serviceName).trim() || serviceName;
			amount = typeof s.price === 'number' ? s.price : Number(s.price) || 0;
			if (s.currency) currency = String(s.currency);
		} else {
			serviceId = null;
		}
	}

	if (!serviceId) {
		const { data: fallback } = await sb
			.from('provider_services')
			.select('id, name, price, currency')
			.eq('provider_id', providerOrgId)
			.eq('is_active', true)
			.eq('category', 'service')
			.order('sort_order', { ascending: true })
			.order('name', { ascending: true })
			.limit(1)
			.maybeSingle();
		if (fallback && typeof fallback === 'object') {
			const s = fallback as { id: string; name?: string; price?: number | string; currency?: string };
			serviceId = s.id;
			serviceName = String(s.name || visitLabel).trim() || visitLabel;
			amount = typeof s.price === 'number' ? s.price : Number(s.price) || 0;
			if (s.currency) currency = String(s.currency);
		}
	}

	const description = `${visitLabel} — ${serviceName}`;
	const aptDate =
		appointmentRow.appointment_date != null ? String(appointmentRow.appointment_date).slice(0, 10) : null;
	const aptTime = appointmentRow.appointment_time != null ? String(appointmentRow.appointment_time) : null;
	const confirmation =
		appointmentRow.confirmation_number != null ? String(appointmentRow.confirmation_number) : null;
	const metadata = {
		source: 'consultation_complete',
		service_label: serviceName,
		visit_label: visitLabel,
		appointment_date: aptDate,
		appointment_time: aptTime,
		confirmation_number: confirmation,
		claim_ready: true,
		claim_status: 'ready_to_file',
		line_items: [
			{
				kind: serviceId ? 'catalog' : 'visit_default',
				provider_service_id: serviceId,
				description: serviceName,
				quantity: 1,
				unit_amount: amount,
			},
		],
	};

	const insertRow = {
		provider_user_id: providerUserId,
		patient_user_id: patientUserId,
		amount,
		currency,
		status: 'draft',
		description,
		metadata,
		encounter_id: encounterId,
		appointment_id: appointmentId,
		provider_service_id: serviceId,
	};

	const { data: created, error } = await sb.from('provider_invoices').insert(insertRow).select('id').single();
	if (error) {
		if (error.code === '23505') {
			return { created: false, reason: 'unique_encounter' };
		}
		console.error('[syncConsultationInvoiceOnFinalize]', error.message);
		return { created: false, reason: error.message };
	}
	const id = (created as { id?: string } | null)?.id;
	if (!id) return { created: false, reason: 'no_row' };
	return { invoiceId: id, created: true };
}
