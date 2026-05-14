import type { SupabaseClient } from '@supabase/supabase-js';

export type InsuranceOrgRow = {
	id: string;
	display_name: string;
	company_name: string | null;
	name: string | null;
};

/** Active insurance portal accounts (profiles.role = insurance) for patient pickers. */
export async function listInsuranceOrganizations(sb: SupabaseClient): Promise<InsuranceOrgRow[]> {
	const { data, error } = await sb
		.from('profiles')
		.select('id, company_name, name, email, status')
		.eq('role', 'insurance')
		.order('company_name', { ascending: true });

	if (error) {
		console.error('[listInsuranceOrganizations]', error.message);
		return [];
	}

	const rows = (data || []) as {
		id: string;
		company_name: string | null;
		name: string | null;
		email: string | null;
		status: string | null;
	}[];

	return rows
		.filter((r) => String(r.status || 'active').toLowerCase() !== 'inactive')
		.map((r) => {
			const display_name =
				String(r.company_name || '').trim() || String(r.name || '').trim() || String(r.email || '').trim() || 'Insurance';
			return {
				id: r.id,
				display_name,
				company_name: r.company_name,
				name: r.name,
			};
		});
}
