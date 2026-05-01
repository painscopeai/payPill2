import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/server/supabase/admin';

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
		verification_status: 'pending',
		telemedicine_available: false,
	};

	const { data: provider, error: insErr } = await sb().from('providers').insert(providerRow).select('*').single();
	if (insErr) throw insErr;

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
