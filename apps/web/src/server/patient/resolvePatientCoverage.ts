import type { SupabaseClient } from '@supabase/supabase-js';

export type ResolvedCoverage =
	| {
			kind: 'employer';
			effectiveInsuranceKey: string;
			employerId: string | null;
	  }
	| {
			kind: 'walk_in';
			effectiveInsuranceKey: string;
			primaryInsuranceUserId: string;
			insuranceMemberId: string;
	  };

/**
 * Resolves billing/coverage key for booking: employer roster wins over walk-in profile fields.
 * `effectiveInsuranceKey` is either `insurance_options.slug` or an insurance-org `profiles.id` UUID string.
 */
export async function resolvePatientCoverage(
	sb: SupabaseClient,
	patientUserId: string,
	bodyInsuranceOptionId?: string | null,
): Promise<
	| { ok: true; coverage: ResolvedCoverage }
	| { ok: false; status: number; error: string }
> {
	const { data: roster, error: rosterErr } = await sb
		.from('employer_employees')
		.select('insurance_option_slug, employer_id, status, updated_at')
		.eq('user_id', patientUserId)
		.in('status', ['active', 'pending', 'draft'])
		.not('insurance_option_slug', 'is', null)
		.order('updated_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (rosterErr) {
		console.error('[resolvePatientCoverage] roster', rosterErr.message);
		return { ok: false, status: 500, error: 'Could not load employer coverage' };
	}

	const slug = String(
		(roster as { insurance_option_slug?: string | null } | null)?.insurance_option_slug || '',
	).trim();
	if (slug) {
		return {
			ok: true,
			coverage: {
				kind: 'employer',
				effectiveInsuranceKey: slug,
				employerId: (roster as { employer_id?: string | null }).employer_id ?? null,
			},
		};
	}

	const { data: prof, error: profErr } = await sb
		.from('profiles')
		.select('id, role, primary_insurance_user_id, insurance_member_id')
		.eq('id', patientUserId)
		.maybeSingle();

	if (profErr || !prof) {
		return { ok: false, status: 500, error: 'Could not load patient profile' };
	}

	const p = prof as {
		role?: string;
		primary_insurance_user_id?: string | null;
		insurance_member_id?: string | null;
	};

	const primary = String(p.primary_insurance_user_id || '').trim();
	const memberId = String(p.insurance_member_id || '').trim();

	if (!primary || !memberId) {
		return {
			ok: false,
			status: 400,
			error:
				'No employer-linked insurance found. Add your insurance company and member ID in Profile / Settings before booking.',
		};
	}

	const bodyKey = String(bodyInsuranceOptionId || '').trim();
	if (bodyKey && bodyKey !== primary) {
		return {
			ok: false,
			status: 400,
			error: 'Insurance selection does not match your profile. Refresh the page and try again.',
		};
	}

	return {
		ok: true,
		coverage: {
			kind: 'walk_in',
			effectiveInsuranceKey: primary,
			primaryInsuranceUserId: primary,
			insuranceMemberId: memberId,
		},
	};
}
