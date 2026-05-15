import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { resolveBillingProviderUserId } from '@/server/provider/resolveBillingProviderUserId';
import { notifyLowStockIfNeeded } from '@/server/provider/inventoryLowStock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mapCheckoutError(msg: string): { status: number; error: string } {
	const m = msg.toLowerCase();
	if (m.includes('billing_provider_invalid')) return { status: 400, error: 'Pharmacy billing is not configured' };
	if (m.includes('not_pharmacy_org') || m.includes('pharmacist_role_missing')) {
		return { status: 400, error: 'This organization is not a pharmacy' };
	}
	if (m.includes('insufficient_stock')) return { status: 409, error: 'Insufficient stock for one or more items' };
	if (m.includes('invalid_line') || m.includes('no_lines')) return { status: 400, error: 'Invalid order lines' };
	if (m.includes('drug_not_found')) return { status: 404, error: 'Item not found' };
	if (m.includes('drug_wrong_org') || m.includes('drug_inactive')) return { status: 400, error: 'Item not available' };
	return { status: 500, error: 'Checkout failed' };
}

/**
 * POST /api/patient/pharmacy/order
 * Body: { provider_org_id, lines: [{ drug_catalog_id, quantity }] }
 */
export async function POST(request: NextRequest) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const sb = getSupabaseAdmin();
	const { data: profile, error: pErr } = await sb
		.from('profiles')
		.select('id, role, status')
		.eq('id', uid)
		.maybeSingle();
	if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
	if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
	if (String(profile.status || 'active').toLowerCase() === 'inactive') {
		return NextResponse.json({ error: 'Account inactive' }, { status: 403 });
	}
	const role = String(profile.role || '');
	if (role === 'provider' || role === 'admin') {
		return NextResponse.json({ error: 'Use a patient account for pharmacy orders' }, { status: 403 });
	}

	const body = (await request.json().catch(() => ({}))) as {
		provider_org_id?: string;
		lines?: { drug_catalog_id?: string; quantity?: number }[];
	};

	const orgId = String(body.provider_org_id || '').trim();
	const linesRaw = Array.isArray(body.lines) ? body.lines : [];
	if (!orgId) return NextResponse.json({ error: 'provider_org_id is required' }, { status: 400 });
	if (!linesRaw.length) return NextResponse.json({ error: 'lines are required' }, { status: 400 });

	const lines = linesRaw
		.map((l) => ({
			drug_catalog_id: String(l.drug_catalog_id || '').trim(),
			quantity:
				typeof l.quantity === 'number' && Number.isFinite(l.quantity) ? Math.floor(l.quantity) : 0,
		}))
		.filter((l) => l.drug_catalog_id && l.quantity > 0);
	if (!lines.length) return NextResponse.json({ error: 'Each line needs drug_catalog_id and positive quantity' }, { status: 400 });

	const billingUserId = await resolveBillingProviderUserId(sb, orgId);
	if (!billingUserId) {
		return NextResponse.json({ error: 'This pharmacy cannot accept orders yet (no staff on file).' }, { status: 503 });
	}

	const { data, error } = await sb.rpc('patient_pharmacy_checkout', {
		p_provider_org_id: orgId,
		p_patient_user_id: uid,
		p_billing_provider_user_id: billingUserId,
		p_lines: lines,
	});

	if (error) {
		console.error('[patient/pharmacy/order]', error.message);
		const mapped = mapCheckoutError(error.message);
		return NextResponse.json({ error: mapped.error }, { status: mapped.status });
	}

	const result = data as { invoice_id?: string; amount?: number; currency?: string } | null;
	const invoiceId = result?.invoice_id;
	if (!invoiceId) {
		return NextResponse.json({ error: 'Checkout did not return an invoice' }, { status: 500 });
	}

	await notifyLowStockIfNeeded(
		sb,
		orgId,
		lines.map((l) => l.drug_catalog_id),
	);

	return NextResponse.json({
		ok: true,
		invoice_id: invoiceId,
		amount: result?.amount,
		currency: result?.currency || 'USD',
	});
}
