import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export function patientProfileIsWalkIn(patientCoverageSource: string | null | undefined): boolean {
	return String(patientCoverageSource ?? '').toLowerCase() === 'walk_in';
}

/** 403 when walk-in patients must not use employer / workplace messaging APIs. */
export async function blockWalkInEmployerMessaging(sb: SupabaseClient, uid: string): Promise<NextResponse | null> {
	const { data, error } = await sb.from('profiles').select('patient_coverage_source').eq('id', uid).maybeSingle();
	if (error) {
		console.error('[walkInPatientMessaging] profile', error.message);
		return NextResponse.json({ error: 'Failed to verify profile' }, { status: 500 });
	}
	if (patientProfileIsWalkIn((data as { patient_coverage_source?: string | null } | null)?.patient_coverage_source)) {
		return NextResponse.json(
			{ error: 'Employer messaging is not available for walk-in coverage. Use care team messaging instead.' },
			{ status: 403 },
		);
	}
	return null;
}
