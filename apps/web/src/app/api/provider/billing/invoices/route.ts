import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/billing/invoices — POST create draft invoice */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const url = new URL(request.url);
	const status = String(url.searchParams.get('status') || '').trim();

	const sb = getSupabaseAdmin();
	let q = sb.from('provider_invoices').select('*').eq('provider_user_id', ctx.userId).order('created_at', { ascending: false }).limit(100);
	if (status) q = q.eq('status', status);

	const { data, error } = await q;
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const body = (await request.json().catch(() => ({}))) as {
		patient_user_id?: string | null;
		amount?: number;
		currency?: string;
		description?: string;
		due_date?: string | null;
		status?: string;
	};

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('provider_invoices')
		.insert({
			provider_user_id: ctx.userId,
			patient_user_id: body.patient_user_id || null,
			amount: Number(body.amount) || 0,
			currency: body.currency || 'USD',
			description: body.description || null,
			due_date: body.due_date || null,
			status: body.status || 'draft',
		})
		.select('*')
		.single();

	if (error) {
		console.error('[api/provider/billing/invoices POST]', error.message);
		return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
	}
	return NextResponse.json(data);
}
