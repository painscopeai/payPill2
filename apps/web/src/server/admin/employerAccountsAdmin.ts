import type { SupabaseClient } from '@supabase/supabase-js';

export type EmployerOptionRow = {
	id: string;
	email: string | null;
	company_name: string | null;
	first_name: string | null;
	last_name: string | null;
	role: string | null;
	profile_status: string | null;
	organization_name: string | null;
	organization_status: string | null;
	source: 'profile_role' | 'employer_link';
};

function labelForRow(r: EmployerOptionRow): string {
	const org = (r.organization_name || r.company_name || '').trim();
	const name = [r.first_name, r.last_name].filter(Boolean).join(' ');
	const bits = [org, name, r.email].filter(Boolean);
	return bits.join(' · ') || r.email || r.id;
}

/**
 * Employer accounts for admin bulk import pickers:
 * - profiles with role = employer
 * - profiles linked from public.employers.user_id (handles role drift / legacy rows)
 */
export async function listEmployerAccountsForAdmin(sb: SupabaseClient): Promise<{
	items: (EmployerOptionRow & { label: string })[];
}> {
	const { data: roleEmployers, error: rErr } = await sb
		.from('profiles')
		.select('id,email,company_name,first_name,last_name,role,status')
		.eq('role', 'employer')
		.order('email', { ascending: true });
	if (rErr) throw rErr;

	const { data: orgRows, error: oErr } = await sb
		.from('employers')
		.select('id,user_id,name,status')
		.not('user_id', 'is', null);
	if (oErr) throw oErr;

	const byId = new Map<string, EmployerOptionRow>();

	for (const p of roleEmployers || []) {
		const org = (orgRows || []).find((o: { user_id: string }) => o.user_id === p.id);
		byId.set(p.id, {
			id: p.id,
			email: p.email,
			company_name: p.company_name,
			first_name: p.first_name,
			last_name: p.last_name,
			role: p.role,
			profile_status: (p as { status?: string }).status ?? null,
			organization_name: org?.name ?? null,
			organization_status: org?.status ?? null,
			source: 'profile_role',
		});
	}

	const linkedUserIds = (orgRows || [])
		.map((o: { user_id: string }) => o.user_id)
		.filter(Boolean)
		.filter((uid: string) => !byId.has(uid));

	if (linkedUserIds.length > 0) {
		const { data: extraProfiles, error: eErr } = await sb
			.from('profiles')
			.select('id,email,company_name,first_name,last_name,role,status')
			.in('id', linkedUserIds);
		if (eErr) throw eErr;
		for (const p of extraProfiles || []) {
			const org = (orgRows || []).find((o: { user_id: string }) => o.user_id === p.id);
			byId.set(p.id, {
				id: p.id,
				email: p.email,
				company_name: p.company_name,
				first_name: p.first_name,
				last_name: p.last_name,
				role: p.role,
				profile_status: (p as { status?: string }).status ?? null,
				organization_name: org?.name ?? null,
				organization_status: org?.status ?? null,
				source: 'employer_link',
			});
		}
	}

	const items = Array.from(byId.values())
		.sort((a, b) => (a.email || '').localeCompare(b.email || '', undefined, { sensitivity: 'base' }))
		.map((row) => ({ ...row, label: labelForRow(row) }));

	return { items };
}

/**
 * Accept employer target if profile.role is employer, or an employers row links this user and org is not suspended.
 */
export async function assertEmployerImportTarget(
	sb: SupabaseClient,
	employerId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const { data: prof, error: pErr } = await sb.from('profiles').select('id,role').eq('id', employerId).maybeSingle();
	if (pErr) return { ok: false, message: pErr.message };
	if (!prof) return { ok: false, message: 'Employer profile not found.' };

	if (prof.role === 'employer') return { ok: true };

	const { data: org, error: oErr } = await sb
		.from('employers')
		.select('id,status,user_id')
		.eq('user_id', employerId)
		.maybeSingle();
	if (oErr) return { ok: false, message: oErr.message };
	if (!org) {
		return {
			ok: false,
			message:
				'This account is not recognized as an employer. Set profiles.role to employer or link public.employers.user_id to this profile.',
		};
	}
	if (org.status === 'inactive') {
		return { ok: false, message: 'This employer organization is inactive. Reactivate it before bulk import.' };
	}

	return { ok: true };
}
