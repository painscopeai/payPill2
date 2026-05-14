import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAppointmentsForPracticeOrg } from '@/server/provider/fetchAppointmentsForPracticeOrg';

export type ProviderActivityEvent = {
	id: string;
	occurred_at: string;
	category: 'visits' | 'health' | 'billing' | 'claims';
	kind: string;
	title: string;
	subtitle: string | null;
	href: string | null;
	patient_user_id: string | null;
};

function claimReadyMetadata(metadata: unknown): boolean {
	const m = metadata as Record<string, unknown> | null;
	if (!m || typeof m !== 'object') return false;
	if (m.claim_ready === false) return false;
	return Boolean(m.source || m.claim_ready === true);
}

/**
 * Recent cross-domain activity for the provider analytics page (service-role / admin client).
 */
export async function buildProviderAnalyticsActivity(
	sb: SupabaseClient,
	args: { providerUserId: string; providerOrgId: string | null },
): Promise<{ events: ProviderActivityEvent[]; counts: Record<string, number> }> {
	const { providerUserId, providerOrgId } = args;
	const raw: ProviderActivityEvent[] = [];

	let prescriptionRows: Record<string, unknown>[] = [];

	if (providerOrgId) {
		const { rows: aptRowsRaw } = await fetchAppointmentsForPracticeOrg(
			sb,
			providerOrgId,
			'id, user_id, status, appointment_date, appointment_time, appointment_type, type, reason, updated_at, created_at',
			{ limitDirect: 80, limitService: 80 },
		);
		const aptRows = [...aptRowsRaw].sort((a, b) => {
			const tb = String((b as { updated_at?: string }).updated_at || (b as { created_at?: string }).created_at || '');
			const ta = String((a as { updated_at?: string }).updated_at || (a as { created_at?: string }).created_at || '');
			return tb.localeCompare(ta);
		});
		for (const a of aptRows.slice(0, 40)) {
			const r = a as {
				id: string;
				user_id?: string | null;
				status?: string | null;
				appointment_date?: string | null;
				appointment_time?: string | null;
				appointment_type?: string | null;
				type?: string | null;
				reason?: string | null;
				updated_at?: string | null;
				created_at?: string | null;
			};
			const st = String(r.status || 'scheduled').toLowerCase();
			const when = r.updated_at || r.created_at || new Date().toISOString();
			const datePart = r.appointment_date ? String(r.appointment_date).slice(0, 10) : '';
			const typeLabel = String(r.appointment_type || r.type || 'Appointment').trim() || 'Appointment';
			let title = `Visit · ${typeLabel}`;
			if (datePart) title += ` · ${datePart}`;
			if (st === 'completed') title = `Visit completed · ${typeLabel}`;
			else if (['cancelled', 'canceled', 'no_show', 'no-show'].includes(st)) title = `Visit ${st.replace(/_/g, ' ')} · ${typeLabel}`;
			const reason = r.reason ? String(r.reason).slice(0, 80) : null;
			raw.push({
				id: `apt-${r.id}-${when}`,
				occurred_at: when,
				category: 'visits',
				kind: 'appointment',
				title,
				subtitle: reason,
				href: `/provider/appointments`,
				patient_user_id: r.user_id || null,
			});
		}
	}

	const { data: encRows } = await sb
		.from('provider_consultation_encounters')
		.select('id, appointment_id, patient_user_id, status, updated_at')
		.eq('provider_user_id', providerUserId)
		.order('updated_at', { ascending: false })
		.limit(60);
	for (const e of encRows || []) {
		const row = e as {
			id: string;
			appointment_id?: string | null;
			patient_user_id?: string | null;
			status?: string | null;
			updated_at?: string | null;
		};
		const when = row.updated_at || new Date().toISOString();
		if (String(row.status || '').toLowerCase() === 'finalized') {
			raw.push({
				id: `enc-${row.id}`,
				occurred_at: when,
				category: 'health',
				kind: 'consultation_finalized',
				title: 'Consultation encounter finalized',
				subtitle: 'SOAP note completed for scheduled visit',
				href: row.appointment_id
					? `/provider/consultations?appointment=${encodeURIComponent(String(row.appointment_id))}`
					: '/provider/consultations',
				patient_user_id: row.patient_user_id || null,
			});
		} else {
			raw.push({
				id: `enc-draft-${row.id}`,
				occurred_at: when,
				category: 'health',
				kind: 'consultation_draft',
				title: 'Consultation note in progress',
				subtitle: 'Draft encounter',
				href: row.appointment_id
					? `/provider/consultations?appointment=${encodeURIComponent(String(row.appointment_id))}`
					: '/provider/consultations',
				patient_user_id: row.patient_user_id || null,
			});
		}
	}

	const { data: invRows } = await sb
		.from('provider_invoices')
		.select('id, patient_user_id, amount, currency, description, status, metadata, created_at')
		.eq('provider_user_id', providerUserId)
		.order('created_at', { ascending: false })
		.limit(50);
	for (const inv of invRows || []) {
		const row = inv as {
			id: string;
			patient_user_id?: string | null;
			amount?: number | string | null;
			currency?: string | null;
			description?: string | null;
			status?: string | null;
			metadata?: unknown;
			created_at?: string | null;
		};
		const when = row.created_at || new Date().toISOString();
		const amt = Number(row.amount || 0);
		const cur = String(row.currency || 'USD');
		const desc = String(row.description || 'Invoice').trim() || 'Invoice';
		const claimish = claimReadyMetadata(row.metadata);
		raw.push({
			id: `inv-${row.id}`,
			occurred_at: when,
			category: claimish ? 'claims' : 'billing',
			kind: claimish ? 'invoice_claim_line' : 'invoice',
			title: claimish ? `Claim line · ${desc}` : `Invoice · ${desc}`,
			subtitle: `$${amt.toFixed(2)} ${cur} · ${String(row.status || 'draft')}`,
			href: '/provider/billing',
			patient_user_id: row.patient_user_id || null,
		});
	}

	const { data: payRows } = await sb
		.from('provider_payments')
		.select('id, patient_user_id, amount, currency, payment_method, status, created_at')
		.eq('provider_user_id', providerUserId)
		.order('created_at', { ascending: false })
		.limit(30);
	for (const p of payRows || []) {
		const row = p as {
			id: string;
			patient_user_id?: string | null;
			amount?: number | string | null;
			currency?: string | null;
			payment_method?: string | null;
			status?: string | null;
			created_at?: string | null;
		};
		const when = row.created_at || new Date().toISOString();
		const amt = Number(row.amount || 0);
		const cur = String(row.currency || 'USD');
		raw.push({
			id: `pay-${row.id}`,
			occurred_at: when,
			category: 'billing',
			kind: 'payment',
			title: 'Payment recorded',
			subtitle: `$${amt.toFixed(2)} ${cur} · ${String(row.payment_method || 'method')} · ${String(row.status || '')}`,
			href: '/provider/billing',
			patient_user_id: row.patient_user_id || null,
		});
	}

	if (providerOrgId) {
		const { data: rxRows } = await sb
			.from('prescriptions')
			.select('id, user_id, medication_name, status, created_at')
			.eq('provider_id', providerOrgId)
			.order('created_at', { ascending: false })
			.limit(35);
		prescriptionRows = (rxRows || []) as Record<string, unknown>[];
		for (const rx of prescriptionRows) {
			const row = rx as {
				id: string;
				user_id?: string | null;
				medication_name?: string | null;
				status?: string | null;
				created_at?: string | null;
			};
			const when = row.created_at || new Date().toISOString();
			raw.push({
				id: `rx-${row.id}`,
				occurred_at: when,
				category: 'health',
				kind: 'prescription',
				title: `Prescription · ${String(row.medication_name || 'Medication').trim()}`,
				subtitle: row.status ? String(row.status) : null,
				href: '/provider/prescriptions',
				patient_user_id: row.user_id || null,
			});
		}
	}

	const { data: noteRows } = await sb
		.from('clinical_notes')
		.select('id, user_id, note_content, date_created')
		.eq('provider_id', providerUserId)
		.order('date_created', { ascending: false })
		.limit(25);
	for (const n of noteRows || []) {
		const row = n as {
			id: string;
			user_id?: string | null;
			note_content?: string | null;
			date_created?: string | null;
		};
		const when = row.date_created || new Date().toISOString();
		const snippet = row.note_content ? String(row.note_content).replace(/\s+/g, ' ').trim().slice(0, 100) : null;
		raw.push({
			id: `note-${row.id}`,
			occurred_at: when,
			category: 'health',
			kind: 'clinical_note',
			title: 'Clinical note',
			subtitle: snippet,
			href: row.user_id ? `/provider/patients/${encodeURIComponent(String(row.user_id))}` : '/provider/patients',
			patient_user_id: row.user_id || null,
		});
	}

	const { data: tmRows } = await sb
		.from('telemedicine_sessions')
		.select('id, user_id, status, started_at')
		.eq('provider_id', providerUserId)
		.order('started_at', { ascending: false })
		.limit(20);
	for (const t of tmRows || []) {
		const row = t as {
			id: string;
			user_id?: string | null;
			status?: string | null;
			started_at?: string | null;
		};
		const when = row.started_at || new Date().toISOString();
		raw.push({
			id: `tm-${row.id}`,
			occurred_at: when,
			category: 'visits',
			kind: 'telemedicine',
			title: 'Telemedicine session',
			subtitle: row.status ? String(row.status) : null,
			href: '/provider/telemedicine',
			patient_user_id: row.user_id || null,
		});
	}

	raw.sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)));
	const events = raw.slice(0, 80);

	const draftInv = (invRows || []).filter((i: { status?: string }) => String((i as { status?: string }).status || '').toLowerCase() === 'draft').length;
	const claimLines = (invRows || []).filter((i: { metadata?: unknown }) => claimReadyMetadata((i as { metadata?: unknown }).metadata)).length;

	const counts = {
		draftInvoices: draftInv,
		claimReadyLines: claimLines,
		finalizedEncounters: (encRows || []).filter(
			(e: { status?: string }) => String((e as { status?: string }).status || '').toLowerCase() === 'finalized',
		).length,
		prescriptionsRecent: prescriptionRows.length,
		clinicalNotesRecent: (noteRows || []).length,
	};

	return { events, counts };
}