import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Native handler — avoids loading the full tinyhttp stack (fixes cold-start timeouts on Vercel).
 */
export async function GET(request: NextRequest) {
	const userId = await getBearerUserId(request);
	if (!userId) {
		return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
	}

	const sb = getSupabaseAdmin();
	const { data: rows, error } = await sb
		.from('patient_onboarding_steps')
		.select('step, data, updated_at')
		.eq('user_id', userId)
		.order('step', { ascending: true });

	if (error) {
		return NextResponse.json({ error: 'Failed to load onboarding progress' }, { status: 500 });
	}

	const formData: Record<string, unknown> = {};
	const completedSteps: number[] = [];
	let lastSaved: string | null = null;

	for (const row of rows || []) {
		const stepNum = row.step as number;
		completedSteps.push(stepNum);
		formData[`step_${stepNum}`] = { ...(row.data as object), updated_at: row.updated_at };

		if (row.updated_at) {
			const recordTime = new Date(row.updated_at as string).getTime();
			if (!lastSaved || recordTime > new Date(lastSaved).getTime()) {
				lastSaved = row.updated_at as string;
			}
		}
	}

	let currentStep = 1;
	for (let i = 1; i <= 13; i++) {
		if (!completedSteps.includes(i)) {
			currentStep = i;
			break;
		}
	}

	return NextResponse.json({
		currentStep,
		completedSteps: [...new Set(completedSteps)].sort((a, b) => a - b),
		formData,
		lastSaved: lastSaved || null,
	});
}
