import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { listInsuranceOrganizations } from '@/server/patient/listInsuranceOrganizations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DirItem = { value: string; label: string; subtitle: string | null };

/**
 * GET /api/provider/insurance-directory — payer labels for claims filters (catalog plans + insurance portal accounts).
 */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	void request;

	const sb = getSupabaseAdmin();
	const byLabel = new Map<string, DirItem>();

	const { data: opts, error: optErr } = await sb
		.from('insurance_options')
		.select('slug, label')
		.eq('active', true)
		.order('sort_order', { ascending: true })
		.order('label', { ascending: true })
		.limit(2000);
	if (optErr && !/does not exist|schema cache/i.test(optErr.message)) {
		console.warn('[api/provider/insurance-directory] insurance_options', optErr.message);
	}
	for (const raw of opts || []) {
		const o = raw as { slug?: string; label?: string };
		const label = String(o.label || '').trim() || String(o.slug || '').trim();
		if (!label) continue;
		const key = label.toLowerCase();
		if (byLabel.has(key)) continue;
		byLabel.set(key, { value: label, label, subtitle: 'Plan catalog' });
	}

	const orgs = await listInsuranceOrganizations(sb);
	for (const o of orgs) {
		const label = String(o.display_name || '').trim();
		if (!label) continue;
		const key = label.toLowerCase();
		if (byLabel.has(key)) continue;
		byLabel.set(key, { value: label, label, subtitle: 'Insurance account' });
	}

	const items: DirItem[] = [...byLabel.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

	return NextResponse.json({ items });
}
