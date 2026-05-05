import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { signProviderApplicationInviteToken, verifyProviderApplicationInviteToken } from '@/server/utils/providerApplicationInvite';

export type ProviderApplicationRow = {
	id: string;
	status: string;
	applicant_user_id: string | null;
	applicant_email: string;
	organization_name: string | null;
	type: string;
	category: string | null;
	phone: string | null;
	specialty: string | null;
	payload: Record<string, unknown>;
	form_id: string | null;
	form_response_id: string | null;
	provider_id: string | null;
	submitted_at: string | null;
	reviewed_at: string | null;
	reviewed_by: string | null;
	rejection_reason: string | null;
	created_at: string;
	updated_at: string;
};

function sb(): SupabaseClient {
	return getSupabaseAdmin();
}

export async function listProviderApplications(params: {
	status?: string;
	applicantUserId?: string;
	page?: number;
	limit?: number;
}): Promise<{ items: ProviderApplicationRow[]; total: number; page: number; perPage: number }> {
	const page = Math.max(1, params.page ?? 1);
	const perPage = Math.min(100, Math.max(1, params.limit ?? 50));
	const from = (page - 1) * perPage;
	const to = from + perPage - 1;

	let q = sb()
		.from('provider_applications')
		.select('*', { count: 'exact' })
		.order('updated_at', { ascending: false })
		.range(from, to);

	if (params.status) {
		q = q.eq('status', params.status);
	}
	if (params.applicantUserId) {
		q = q.eq('applicant_user_id', params.applicantUserId);
	}

	const { data, error, count } = await q;
	if (error) throw error;
	return {
		items: (data || []) as ProviderApplicationRow[],
		total: count ?? 0,
		page,
		perPage,
	};
}

export async function getProviderApplication(id: string): Promise<ProviderApplicationRow | null> {
	const { data, error } = await sb().from('provider_applications').select('*').eq('id', id).maybeSingle();
	if (error) throw error;
	return (data as ProviderApplicationRow) || null;
}

export async function createDraftApplication(input: {
	applicant_email: string;
	organization_name?: string | null;
	type?: string;
	category?: string | null;
	phone?: string | null;
	specialty?: string | null;
	payload?: Record<string, unknown>;
	applicant_user_id?: string | null;
	form_id?: string | null;
	form_response_id?: string | null;
}): Promise<ProviderApplicationRow> {
	const row = {
		status: 'draft' as const,
		applicant_email: input.applicant_email.trim(),
		organization_name: input.organization_name?.trim() || null,
		type: (input.type || '').trim() || 'unspecified',
		category: input.category?.trim() || null,
		phone: input.phone?.trim() || null,
		specialty: input.specialty?.trim() || null,
		payload: input.payload || {},
		applicant_user_id: input.applicant_user_id ?? null,
		form_id: input.form_id ?? null,
		form_response_id: input.form_response_id ?? null,
	};
	const { data, error } = await sb().from('provider_applications').insert(row).select('*').single();
	if (error) throw error;
	return data as ProviderApplicationRow;
}

export async function updateDraftApplication(
	id: string,
	patch: Partial<{
		applicant_email: string;
		organization_name: string | null;
		type: string;
		category: string | null;
		phone: string | null;
		specialty: string | null;
		payload: Record<string, unknown>;
		form_id: string | null;
		form_response_id: string | null;
	}>,
): Promise<ProviderApplicationRow> {
	const existing = await getProviderApplication(id);
	if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
	if (existing.status !== 'draft') {
		throw Object.assign(new Error('Only draft applications can be updated'), { status: 400 });
	}
	const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
	if (patch.applicant_email !== undefined) updates.applicant_email = patch.applicant_email.trim();
	if (patch.organization_name !== undefined) updates.organization_name = patch.organization_name?.trim() || null;
	if (patch.type !== undefined) updates.type = patch.type.trim();
	if (patch.category !== undefined) updates.category = patch.category?.trim() || null;
	if (patch.phone !== undefined) updates.phone = patch.phone?.trim() || null;
	if (patch.specialty !== undefined) updates.specialty = patch.specialty?.trim() || null;
	if (patch.payload !== undefined) updates.payload = patch.payload;
	if (patch.form_id !== undefined) updates.form_id = patch.form_id;
	if (patch.form_response_id !== undefined) updates.form_response_id = patch.form_response_id;

	const { data, error } = await sb()
		.from('provider_applications')
		.update(updates)
		.eq('id', id)
		.eq('status', 'draft')
		.select('*')
		.single();
	if (error) throw error;
	return data as ProviderApplicationRow;
}

export async function submitProviderApplication(id: string): Promise<ProviderApplicationRow> {
	const existing = await getProviderApplication(id);
	if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
	if (existing.status !== 'draft') {
		throw Object.assign(new Error('Only draft applications can be submitted'), { status: 400 });
	}
	if (existing.form_id) {
		throw Object.assign(
			new Error('This application uses a Form Builder questionnaire—use Send invitation instead of direct submit'),
			{ status: 400 },
		);
	}
	const org = (existing.organization_name || '').trim();
	const ty = (existing.type || '').trim();
	const email = (existing.applicant_email || '').trim();
	if (!org) throw Object.assign(new Error('organization_name is required to submit'), { status: 400 });
	if (!ty || ty === 'unspecified') throw Object.assign(new Error('type is required to submit'), { status: 400 });
	if (!email) throw Object.assign(new Error('applicant_email is required to submit'), { status: 400 });

	const now = new Date().toISOString();
	const { data, error } = await sb()
		.from('provider_applications')
		.update({
			status: 'submitted',
			submitted_at: now,
			updated_at: now,
		})
		.eq('id', id)
		.eq('status', 'draft')
		.select('*')
		.single();
	if (error) throw error;
	return data as ProviderApplicationRow;
}

function validateInvitePrerequisites(existing: ProviderApplicationRow): void {
	const org = (existing.organization_name || '').trim();
	const ty = (existing.type || '').trim();
	const email = (existing.applicant_email || '').trim();
	if (!org) throw Object.assign(new Error('organization_name is required'), { status: 400 });
	if (!ty || ty === 'unspecified') throw Object.assign(new Error('type is required'), { status: 400 });
	if (!email) throw Object.assign(new Error('applicant_email is required'), { status: 400 });
	if (!existing.form_id) throw Object.assign(new Error('Select an applicant form before sending an invitation'), { status: 400 });
}

/**
 * Draft → invited (first invite), or resend email when already invited (same validations).
 * Returns a fresh JWT for the email link each time.
 */
export async function inviteOrResendProviderApplication(id: string): Promise<{ application: ProviderApplicationRow; inviteToken: string }> {
	const existing = await getProviderApplication(id);
	if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });

	if (existing.status !== 'draft' && existing.status !== 'invited') {
		throw Object.assign(new Error('Invitation can only be sent for draft or invited applications'), { status: 400 });
	}
	if (existing.form_response_id) {
		throw Object.assign(new Error('This application already has a submitted form response'), { status: 400 });
	}

	validateInvitePrerequisites(existing);

	const token = signProviderApplicationInviteToken({
		applicationId: existing.id,
		formId: existing.form_id as string,
		applicantEmail: existing.applicant_email.trim(),
	});

	const now = new Date().toISOString();

	if (existing.status === 'draft') {
		const { data, error } = await sb()
			.from('provider_applications')
			.update({
				status: 'invited',
				updated_at: now,
			})
			.eq('id', id)
			.eq('status', 'draft')
			.select('*')
			.single();
		if (error) throw error;
		return { application: data as ProviderApplicationRow, inviteToken: token };
	}

	// invited: refresh timestamp only (token rotates each send)
	const { data, error } = await sb()
		.from('provider_applications')
		.update({ updated_at: now })
		.eq('id', id)
		.eq('status', 'invited')
		.select('*')
		.single();
	if (error) throw error;
	return { application: data as ProviderApplicationRow, inviteToken: token };
}

/** After applicant submits the Form Builder questionnaire with a valid invite token. */
export async function completeApplicationWithFormResponse(params: {
	token: string;
	formResponseId: string;
	formIdFromUrl: string;
	respondentEmail: string;
}): Promise<ProviderApplicationRow> {
	const payload = verifyProviderApplicationInviteToken(params.token);
	if (payload.formId !== params.formIdFromUrl) {
		throw Object.assign(new Error('Form does not match invitation'), { status: 400 });
	}

	const emailNorm = (a: string) => a.trim().toLowerCase();
	if (emailNorm(params.respondentEmail) !== emailNorm(payload.applicantEmail)) {
		throw Object.assign(new Error('Email must match the invited applicant email'), { status: 400 });
	}

	const existing = await getProviderApplication(payload.applicationId);
	if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
	if (existing.status !== 'invited') {
		throw Object.assign(new Error('Application is not awaiting the questionnaire'), { status: 400 });
	}
	if (existing.form_id !== params.formIdFromUrl) {
		throw Object.assign(new Error('Form does not match application'), { status: 400 });
	}
	if (existing.form_response_id) {
		throw Object.assign(new Error('This application was already completed'), { status: 409 });
	}

	const now = new Date().toISOString();
	const { data, error } = await sb()
		.from('provider_applications')
		.update({
			status: 'submitted',
			submitted_at: now,
			form_response_id: params.formResponseId,
			updated_at: now,
		})
		.eq('id', existing.id)
		.eq('status', 'invited')
		.select('*')
		.single();
	if (error) throw error;
	return data as ProviderApplicationRow;
}

export async function approveProviderApplication(
	id: string,
	adminId: string,
): Promise<{ application: ProviderApplicationRow; provider: Record<string, unknown> }> {
	const existing = await getProviderApplication(id);
	if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
	if (existing.status !== 'submitted') {
		throw Object.assign(new Error('Only submitted applications can be approved'), { status: 400 });
	}
	const displayName = (existing.organization_name || '').trim() || 'Provider';
	const ty = (existing.type || '').trim();
	const email = (existing.applicant_email || '').trim();
	if (!ty || ty === 'unspecified') throw Object.assign(new Error('Invalid application type'), { status: 400 });
	if (!email) throw Object.assign(new Error('Invalid applicant email'), { status: 400 });

	const providerRow = {
		name: displayName,
		provider_name: displayName,
		type: ty,
		specialty: existing.specialty?.trim() || '',
		email,
		phone: existing.phone?.trim() || '',
		address: '',
		category: existing.category?.trim() || null,
		status: 'active',
		/** Admin approval completes onboarding review — show as verified in Provider Management. */
		verification_status: 'verified',
		telemedicine_available: false,
	};

	const { data: provider, error: insErr } = await sb().from('providers').insert(providerRow).select('*').single();
	if (insErr) throw insErr;

	const pid = String(provider.id);
	const { error: svcErr } = await sb()
		.from('provider_services')
		.update({ provider_id: pid, updated_at: new Date().toISOString() })
		.eq('provider_application_id', id)
		.is('provider_id', null);
	if (svcErr) throw svcErr;

	const now = new Date().toISOString();
	const { data: app, error: upErr } = await sb()
		.from('provider_applications')
		.update({
			status: 'approved',
			provider_id: provider.id,
			reviewed_at: now,
			reviewed_by: adminId,
			updated_at: now,
		})
		.eq('id', id)
		.eq('status', 'submitted')
		.select('*')
		.single();
	if (upErr) throw upErr;

	return { application: app as ProviderApplicationRow, provider: provider as Record<string, unknown> };
}

export async function rejectProviderApplication(
	id: string,
	adminId: string,
	reason: string,
): Promise<ProviderApplicationRow> {
	const existing = await getProviderApplication(id);
	if (!existing) throw Object.assign(new Error('Not found'), { status: 404 });
	if (existing.status !== 'submitted') {
		throw Object.assign(new Error('Only submitted applications can be rejected'), { status: 400 });
	}
	const now = new Date().toISOString();
	const { data, error } = await sb()
		.from('provider_applications')
		.update({
			status: 'rejected',
			rejection_reason: reason.trim(),
			reviewed_at: now,
			reviewed_by: adminId,
			updated_at: now,
		})
		.eq('id', id)
		.eq('status', 'submitted')
		.select('*')
		.single();
	if (error) throw error;
	return data as ProviderApplicationRow;
}
