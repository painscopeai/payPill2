import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { dispatchLegacyApi } from '@/server/api/dispatchLegacyApi';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { completeApplicationWithFormResponse } from '@/server/admin/providerApplicationService';
import { notifyApplicationSubmitted } from '@/server/email/providerApplicationEmail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function errResponse(e: unknown, fallback = 500) {
	const msg = e instanceof Error ? e.message : 'Server error';
	const status =
		typeof e === 'object' && e !== null && 'status' in e && typeof (e as { status: unknown }).status === 'number'
			? (e as { status: number }).status
			: fallback;
	return NextResponse.json({ error: msg }, { status });
}

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ formId: string }> },
) {
	const { formId } = await context.params;
	const buf = Buffer.from(await request.arrayBuffer());

	let parsed: Record<string, unknown> = {};
	try {
		if (buf.length) parsed = JSON.parse(buf.toString('utf8')) as Record<string, unknown>;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const token =
		typeof parsed.provider_application_token === 'string' ? parsed.provider_application_token.trim() : '';

	if (!token) {
		const url = new URL(request.url);
		return dispatchLegacyApi(request.method, url, request.headers, buf);
	}

	const respondent_email =
		typeof parsed.respondent_email === 'string' ? parsed.respondent_email.trim() : '';
	const responses_json = parsed.responses_json;
	const completion_time_seconds =
		typeof parsed.completion_time_seconds === 'number' ? parsed.completion_time_seconds : 0;

	if (!respondent_email) {
		return NextResponse.json({ error: 'Missing required field: respondent_email' }, { status: 400 });
	}
	if (responses_json === undefined || responses_json === null) {
		return NextResponse.json({ error: 'Missing required field: responses_json' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();

	try {
		const { data: form, error: formGetErr } = await sb.from('forms').select('*').eq('id', formId).maybeSingle();
		if (formGetErr) throw formGetErr;
		if (!form) {
			return NextResponse.json({ error: 'Form not found' }, { status: 404 });
		}

		let parsedResponses = responses_json;
		if (typeof responses_json === 'string') {
			try {
				parsedResponses = JSON.parse(responses_json);
			} catch {
				return NextResponse.json({ error: 'Invalid responses_json format. Must be valid JSON.' }, { status: 400 });
			}
		}

		const responseData = {
			form_id: formId,
			respondent_email,
			responses_json: JSON.stringify(parsedResponses),
			completion_time_seconds,
			submitted_at: new Date().toISOString(),
		};

		const { data: formResponse, error: frErr } = await sb
			.from('form_responses')
			.insert(responseData)
			.select()
			.single();
		if (frErr) throw frErr;

		const application = await completeApplicationWithFormResponse({
			token,
			formResponseId: formResponse.id,
			formIdFromUrl: formId,
			respondentEmail: respondent_email,
		});

		await notifyApplicationSubmitted({
			applicationId: application.id,
			organizationName: application.organization_name || '',
			type: application.type,
			applicantEmail: application.applicant_email,
		});

		return NextResponse.json(
			{
				id: formResponse.id,
				form_id: formResponse.form_id,
				respondent_email: formResponse.respondent_email,
				submitted_at: formResponse.submitted_at,
			},
			{ status: 201 },
		);
	} catch (e) {
		return errResponse(e);
	}
}
