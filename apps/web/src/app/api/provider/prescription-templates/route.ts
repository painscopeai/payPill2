import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireProvider } from '@/server/auth/requireProvider';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TemplateLine = {
	medication_name?: string;
	strength?: string;
	dose?: string;
	route?: string;
	frequency?: string;
	duration_days?: string | number;
	quantity?: string | number;
	refills?: string | number;
	sig?: string;
	catalog_id?: string | null;
};

function normalizeLines(raw: unknown): TemplateLine[] {
	if (!Array.isArray(raw)) return [];
	return raw
		.filter((x) => x && typeof x === 'object')
		.map((x) => {
			const row = x as TemplateLine;
			const name = String(row.medication_name || '').trim();
			if (!name) return null;
			return {
				medication_name: name,
				strength: row.strength != null ? String(row.strength) : '',
				dose: row.dose != null ? String(row.dose) : '',
				route: row.route != null ? String(row.route) : 'oral',
				frequency: row.frequency != null ? String(row.frequency) : '',
				duration_days: row.duration_days != null ? String(row.duration_days) : '',
				quantity: row.quantity != null ? String(row.quantity) : '',
				refills: row.refills != null ? String(row.refills) : '0',
				sig: row.sig != null ? String(row.sig) : '',
				catalog_id: row.catalog_id || null,
			};
		})
		.filter(Boolean) as TemplateLine[];
}

/** GET — list prescription templates for the practice. */
export async function GET(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	if (!ctx.providerOrgId) {
		return NextResponse.json({ items: [], message: 'Link your practice first.' });
	}

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('provider_prescription_templates')
		.select('*')
		.eq('provider_org_id', ctx.providerOrgId)
		.order('sort_order', { ascending: true })
		.order('name', { ascending: true })
		.limit(500);

	if (error) {
		if (/does not exist|schema cache/i.test(error.message)) {
			return NextResponse.json({ items: [], message: 'Prescription templates not migrated yet.' });
		}
		return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
	}

	return NextResponse.json({ items: data || [] });
}

/** POST — create template `{ name, description?, lines[], sort_order? }`. */
export async function POST(request: NextRequest) {
	const ctx = await requireProvider(request);
	if (ctx instanceof NextResponse) return ctx;
	const orgId = ctx.providerOrgId;
	if (!orgId) {
		return NextResponse.json({ error: 'Link your practice first.' }, { status: 400 });
	}

	const body = (await request.json().catch(() => ({}))) as {
		name?: string;
		description?: string | null;
		lines?: unknown;
		sort_order?: number;
	};
	const name = String(body.name || '').trim();
	if (!name) {
		return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
	}

	const lines = normalizeLines(body.lines);
	if (!lines.length) {
		return NextResponse.json({ error: 'Add at least one medication line to the template' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('provider_prescription_templates')
		.insert({
			provider_org_id: orgId,
			name,
			description: body.description != null ? String(body.description).trim() || null : null,
			lines,
			sort_order: typeof body.sort_order === 'number' && Number.isFinite(body.sort_order) ? Math.floor(body.sort_order) : 0,
		})
		.select()
		.single();

	if (error) {
		if (/does not exist|schema cache/i.test(error.message)) {
			return NextResponse.json(
				{ error: 'Prescription templates table missing. Apply migration 20260621100000_provider_prescription_templates.sql.' },
				{ status: 503 },
			);
		}
		return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
	}

	return NextResponse.json({ ok: true, item: data });
}
