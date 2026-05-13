import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/provider/billing/payments — POST record payment */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('provider_payments')
		.select('*')
		.eq('provider_user_id', ctx.userId)
		.order('created_at', { ascending: false })
		.limit(100);

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;

	const body = (await request.json().catch(() => ({}))) as {
		patient_user_id?: string | null;
		invoice_id?: string | null;
		amount?: number;
		currency?: string;
		payment_method?: string;
		status?: string;
	};

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('provider_payments')
		.insert({
			provider_user_id: ctx.userId,
			patient_user_id: body.patient_user_id || null,
			invoice_id: body.invoice_id || null,
			amount: Number(body.amount) || 0,
			currency: body.currency || 'USD',
			payment_method: body.payment_method || 'card',
			status: body.status || 'completed',
		})
		.select('*')
		.single();

	if (error) {
		console.error('[api/provider/billing/payments POST]', error.message);
		return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
	}
	return NextResponse.json(data);
}
