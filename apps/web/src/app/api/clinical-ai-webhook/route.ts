import type { NextRequest } from 'next/server';
import { NextResponse, after } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { buildStructuredPatientOverview } from '@/server/patient-health/buildStructuredPatientOverview';
import { buildClinicalAiWebhookPayload } from '@/server/patient-health/buildClinicalAiWebhookPayload';
import { loadPatientHealthSources } from '@/server/patient-health/loadPatientHealthSources';
import { hasUsablePatientPayload } from '@/server/express-api/utils/aiWebhookPatientPayload.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Queues a single structured JSON payload to n8n and returns 202 immediately
 * (webhook delivery runs after the response via `after()` — no waiting on n8n).
 */
export async function POST(request: NextRequest) {
	const userId = await getBearerUserId(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const loaded = await loadPatientHealthSources(userId);
	if (!loaded.ok) {
		console.error('[clinical-ai-webhook]', loaded.errors.join('; '));
		return NextResponse.json(
			{ error: 'Failed to load health data', details: loaded.errors },
			{ status: 500 },
		);
	}

	const { profile, onboardingSteps, healthRecords } = loaded;
	if (!hasUsablePatientPayload(onboardingSteps, healthRecords)) {
		return NextResponse.json(
			{
				error: 'Insufficient data',
				message: 'Add onboarding answers or at least one health record before sending to AI.',
			},
			{ status: 400 },
		);
	}

	const fetchedAt = new Date().toISOString();
	const structured = buildStructuredPatientOverview({
		userId,
		fetchedAt,
		profile,
		onboardingSteps,
		healthRecords,
	});

	const payload = buildClinicalAiWebhookPayload({
		userId,
		fetchedAt,
		demographics: structured.demographics,
		bodyMetrics: structured.bodyMetrics,
		conditions: structured.conditions,
		rawOnboardingSteps: onboardingSteps,
		rawHealthRecords: healthRecords,
	});

	const webhookUrl =
		process.env.N8N_AI_RECOMMENDATIONS_WEBHOOK_URL?.trim() ||
		'https://silentminds.app.n8n.cloud/webhook/ai';

	const whSecret = process.env.N8N_AI_WEBHOOK_SECRET?.trim();
	const n8nBody = JSON.stringify({
		source: 'paypill',
		version: 3,
		userPrompt: JSON.stringify(payload, null, 2),
		...payload,
	});

	after(async () => {
		try {
			const headers: Record<string, string> = { 'Content-Type': 'application/json' };
			if (whSecret) headers['X-PayPill-Webhook-Secret'] = whSecret;
			const res = await fetch(webhookUrl, { method: 'POST', headers, body: n8nBody });
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				console.error('[clinical-ai-webhook] n8n non-OK', res.status, t.slice(0, 500));
			}
		} catch (e) {
			console.error('[clinical-ai-webhook] n8n fetch failed', e);
		}
	});

	return NextResponse.json(
		{
			accepted: true,
			async: true,
			message: 'Your health summary was queued for the AI workflow.',
		},
		{ status: 202 },
	);
}
