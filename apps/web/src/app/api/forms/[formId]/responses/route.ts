import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { requireManageFormsAdmin } from '@/server/auth/requireManageFormsAdmin';
import { computeResponseAnalytics } from '@/server/forms/responseAnalytics';

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

/**
 * GET /api/forms/:formId/responses — admin list + analytics (manage_forms).
 */
export async function GET(
	request: NextRequest,
	context: { params: Promise<{ formId: string }> },
) {
	const ctx = await requireManageFormsAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { formId } = await context.params;

	const url = new URL(request.url);
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const pageLimit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10) || 10), 100);
	const date_from = url.searchParams.get('date_from') || undefined;
	const date_to = url.searchParams.get('date_to') || undefined;

	const sb = getSupabaseAdmin();

	try {
		const rFrom = (pageNum - 1) * pageLimit;
		const rTo = rFrom + pageLimit - 1;
		const { data: respRows, error: respErr, count: respCount } = await sb
			.from('form_responses')
			.select('*', { count: 'exact' })
			.eq('form_id', formId)
			.order('created_at', { ascending: false })
			.range(rFrom, rTo);
		if (respErr) throw respErr;

		let allQuery = sb.from('form_responses').select('*').eq('form_id', formId);
		if (date_from) allQuery = allQuery.gte('submitted_at', date_from);
		if (date_to) allQuery = allQuery.lte('submitted_at', date_to);
		const { data: allResponses, error: allErr } = await allQuery;
		if (allErr) throw allErr;

		const totalItems = respCount ?? 0;
		const analytics = computeResponseAnalytics(allResponses || []);

		return NextResponse.json({
			items: respRows || [],
			page: pageNum,
			perPage: pageLimit,
			totalItems,
			totalPages: Math.max(1, Math.ceil(totalItems / pageLimit)),
			analytics,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Failed to fetch form responses';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

/** POST — public form submit (respondent email + responses_json). */
export async function POST(
	request: NextRequest,
	context: { params: Promise<{ formId: string }> },
) {
	const { formId } = await context.params;

	let parsed: Record<string, unknown> = {};
	try {
		const buf = Buffer.from(await request.arrayBuffer());
		if (buf.length) parsed = JSON.parse(buf.toString('utf8')) as Record<string, unknown>;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
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
			completion_time_seconds: completion_time_seconds || 0,
			submitted_at: new Date().toISOString(),
		};

		const { data: formResponse, error: frErr } = await sb
			.from('form_responses')
			.insert(responseData)
			.select()
			.single();
		if (frErr) throw frErr;

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
