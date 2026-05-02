import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { createOptionValue, listOptionValuesForSet } from '@/server/admin/profileOptionCatalogService';

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

export async function GET(request: NextRequest) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const url = new URL(request.url);
	const setId = url.searchParams.get('set_id');
	const includeInactive = url.searchParams.get('include_inactive') === '1';
	if (!setId) {
		return NextResponse.json({ error: 'set_id query parameter is required' }, { status: 400 });
	}
	try {
		const items = await listOptionValuesForSet(setId, includeInactive);
		return NextResponse.json({ items });
	} catch (e) {
		return errResponse(e);
	}
}

export async function POST(request: NextRequest) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	let body: {
		set_id?: string;
		slug?: string;
		label?: string;
		sort_order?: number;
		active?: boolean;
		metadata?: Record<string, unknown>;
	};
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}
	if (typeof body.set_id !== 'string' || typeof body.slug !== 'string' || typeof body.label !== 'string') {
		return NextResponse.json({ error: 'set_id, slug, and label are required' }, { status: 400 });
	}
	try {
		const row = await createOptionValue({
			set_id: body.set_id,
			slug: body.slug,
			label: body.label,
			sort_order: body.sort_order,
			active: body.active,
			metadata: body.metadata,
		});
		return NextResponse.json({ item: row }, { status: 201 });
	} catch (e) {
		return errResponse(e);
	}
}
