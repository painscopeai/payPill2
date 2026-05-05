import type { NextRequest } from 'next/server';
import { NextResponse, after } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { buildStructuredPatientOverview } from '@/server/patient-health/buildStructuredPatientOverview';
import { buildClinicalAiWebhookPayload } from '@/server/patient-health/buildClinicalAiWebhookPayload';
import { loadPatientHealthSources } from '@/server/patient-health/loadPatientHealthSources';
import { hasUsablePatientPayload } from '@/server/express-api/utils/aiWebhookPatientPayload.js';
import { extractReportFromN8nResponse } from '@/server/webhooks/parseN8nWebhookReport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DEFAULT_N8N_WAIT_MS = 120_000;

type PostBody = {
	/** If true, return 202 immediately and run n8n in the background (e.g. onboarding complete). */
	fireAndForget?: boolean;
};

/**
 * POST /api/clinical-ai-webhook
 * - Default: await n8n response and return extracted health report text for the UI.
 * - fireAndForget: true → 202 + after() (no report body).
 */
export async function POST(request: NextRequest) {
	const userId = await getBearerUserId(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	let body: PostBody = {};
	try {
		body = (await request.json()) as PostBody;
	} catch {
		body = {};
	}
	const fireAndForget = body.fireAndForget === true;

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
		'https://northsnow.app.n8n.cloud/webhook/ai';

	const whSecret = process.env.N8N_AI_WEBHOOK_SECRET?.trim();
	const n8nBody = JSON.stringify({
		source: 'paypill',
		version: 3,
		userPrompt: JSON.stringify(payload, null, 2),
		...payload,
	});

	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (whSecret) headers['X-PayPill-Webhook-Secret'] = whSecret;

	if (fireAndForget) {
		after(async () => {
			try {
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

	const waitMs = Math.min(
		280_000,
		Math.max(10_000, Number(process.env.CLINICAL_AI_N8N_WAIT_MS) || DEFAULT_N8N_WAIT_MS),
	);

	let n8nRes: Response;
	try {
		n8nRes = await fetch(webhookUrl, {
			method: 'POST',
			headers,
			body: n8nBody,
			signal: AbortSignal.timeout(waitMs),
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		const timedOut = /abort|timeout/i.test(msg);
		console.error('[clinical-ai-webhook] n8n await failed', msg);
		return NextResponse.json(
			{
				error: timedOut ? 'AI workflow timed out' : 'Could not complete AI workflow',
				message: timedOut
					? `No response within ${Math.round(waitMs / 1000)}s. Try again or increase CLINICAL_AI_N8N_WAIT_MS.`
					: msg,
			},
			{ status: timedOut ? 504 : 502 },
		);
	}

	const rawText = await n8nRes.text();
	const reportMarkdown = extractReportFromN8nResponse(rawText);

	if (!n8nRes.ok) {
		return NextResponse.json(
			{
				error: 'AI workflow returned an error',
				message: reportMarkdown || rawText.slice(0, 500),
				status: n8nRes.status,
			},
			{ status: 502 },
		);
	}

	return NextResponse.json({
		ok: true,
		report: {
			markdown: reportMarkdown,
			generatedAt: new Date().toISOString(),
		},
		n8nStatus: n8nRes.status,
	});
}
