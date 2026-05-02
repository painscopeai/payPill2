import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import axios from 'axios';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Short probe; separate from full recommendation generation. */
export const maxDuration = 60;

/**
 * GET — lightweight checks: Supabase admin read + single-token Gemini call.
 * Same auth as other patient APIs. Use to see whether hangs are Gemini vs DB vs legacy stack.
 */
export async function GET(request: NextRequest) {
	const userId = await getBearerUserId(request);
	if (!userId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const key = process.env.GEMINI_API_KEY?.trim();
	const base = {
		geminiKeyConfigured: Boolean(key),
		userPreview: `${userId.slice(0, 8)}…`,
	};

	let supabaseReadMs = 0;
	let supabaseReadOk = false;
	let supabaseError: string | null = null;
	const dbStart = Date.now();
	try {
		const sb = getSupabaseAdmin();
		const { error } = await sb
			.from('patient_onboarding_steps')
			.select('step')
			.eq('user_id', userId)
			.limit(1);
		supabaseReadMs = Date.now() - dbStart;
		supabaseReadOk = !error;
		if (error) supabaseError = error.message;
	} catch (e) {
		supabaseReadMs = Date.now() - dbStart;
		supabaseError = e instanceof Error ? e.message : String(e);
	}

	if (!key) {
		return NextResponse.json({
			...base,
			supabaseReadMs,
			supabaseReadOk,
			supabaseError,
			gemini: null,
			summary: 'GEMINI_API_KEY is not set in the server environment (e.g. Vercel).',
		});
	}

	const t0 = Date.now();
	try {
		const r = await axios.post(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
			{
				contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }],
			},
			{
				headers: { 'Content-Type': 'application/json' },
				timeout: 25_000,
				validateStatus: () => true,
			},
		);
		const ms = Date.now() - t0;
		const text = r.data?.candidates?.[0]?.content?.parts?.[0]?.text;
		const ok = r.status === 200 && Boolean(text);

		return NextResponse.json({
			...base,
			supabaseReadMs,
			supabaseReadOk,
			supabaseError,
			gemini: {
				ok,
				ms,
				httpStatus: r.status,
				preview: text != null ? String(text).slice(0, 120) : null,
				apiError: !ok && r.data ? r.data : null,
			},
			summary: ok
				? `Gemini responded in ${ms}ms. If “Generate” still hangs, the bottleneck is likely the full request path (large prompt, insert, or legacy handler)—not basic Gemini connectivity.`
				: `Gemini did not return usable content (HTTP ${r.status}). Fix key, billing, or model access first.`,
		});
	} catch (e: unknown) {
		const err = e as { code?: string; message?: string; response?: { status?: number; data?: unknown } };
		const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(String(err.message));
		return NextResponse.json({
			...base,
			supabaseReadMs,
			supabaseReadOk,
			supabaseError,
			gemini: {
				ok: false,
				ms: Date.now() - t0,
				code: err.code,
				message: err.message,
				httpStatus: err.response?.status,
				timedOut: isTimeout,
			},
			summary: isTimeout
				? 'Gemini probe timed out (25s). Network or Google API slowness—not your patient data.'
				: 'Gemini probe failed. Check API key, quotas, and model name.',
		});
	}
}
