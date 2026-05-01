import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { validateStep } from '@/server/express-api/utils/validation.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
	const userId = await getBearerUserId(request);
	if (!userId) {
		return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { step, data } = body as { step?: unknown; data?: unknown };

	if (step === undefined || step === null) {
		return NextResponse.json({ error: 'Missing required field: step' }, { status: 400 });
	}

	if (!data || typeof data !== 'object') {
		return NextResponse.json(
			{ error: 'Missing required field: data (must be an object)' },
			{ status: 400 },
		);
	}

	const stepNum = parseInt(String(step), 10);
	if (Number.isNaN(stepNum) || stepNum < 1 || stepNum > 13) {
		return NextResponse.json(
			{ error: 'Invalid step number. Must be between 1 and 13.' },
			{ status: 400 },
		);
	}

	const validation = validateStep(stepNum, data as Record<string, unknown>) as {
		valid: boolean;
		errors: string[];
	};
	if (!validation.valid) {
		return NextResponse.json({ error: 'Validation failed', fields: validation.errors }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const { data: upserted, error } = await sb
		.from('patient_onboarding_steps')
		.upsert(
			{
				user_id: userId,
				step: stepNum,
				data,
			},
			{ onConflict: 'user_id,step' },
		)
		.select('user_id, step')
		.single();

	if (error) {
		console.error('[onboarding] save-step upsert failed:', error.message);
		return NextResponse.json({ error: 'Failed to save onboarding step' }, { status: 500 });
	}

	return NextResponse.json({
		success: true,
		step: stepNum,
		message: `Step ${stepNum} saved successfully`,
		record_id: upserted ? `${userId}:${stepNum}` : null,
	});
}
