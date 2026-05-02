import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { createOptionSet, listOptionSets } from '@/server/admin/profileOptionCatalogService';

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
	const includeInactive = url.searchParams.get('include_inactive') === '1';
	try {
		const items = await listOptionSets(includeInactive);
		return NextResponse.json({ items });
	} catch (e) {
		return errResponse(e);
	}
}

export async function POST(request: NextRequest) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	let body: { key?: string; label?: string; description?: string | null; group_slug?: string; sort_order?: number; active?: boolean };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}
	if (typeof body.key !== 'string' || typeof body.label !== 'string') {
		return NextResponse.json({ error: 'key and label are required' }, { status: 400 });
	}
	try {
		const row = await createOptionSet({
			key: body.key,
			label: body.label,
			description: body.description,
			group_slug: body.group_slug,
			sort_order: body.sort_order,
			active: body.active,
		});
		return NextResponse.json({ item: row }, { status: 201 });
	} catch (e) {
		return errResponse(e);
	}
}
