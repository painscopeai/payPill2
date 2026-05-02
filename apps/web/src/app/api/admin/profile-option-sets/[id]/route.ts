import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageProvidersAdmin } from '@/server/auth/requireManageProvidersAdmin';
import { deactivateOptionSet, getOptionSetById, updateOptionSet } from '@/server/admin/profileOptionCatalogService';

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

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await context.params;
	try {
		const row = await getOptionSetById(id);
		if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
		return NextResponse.json({ item: row });
	} catch (e) {
		return errResponse(e);
	}
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await context.params;
	let body: { label?: string; description?: string | null; group_slug?: string; sort_order?: number; active?: boolean };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}
	try {
		const row = await updateOptionSet(id, body);
		return NextResponse.json({ item: row });
	} catch (e) {
		return errResponse(e);
	}
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	const ctx = await requireManageProvidersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await context.params;
	try {
		const row = await deactivateOptionSet(id);
		return NextResponse.json({ item: row });
	} catch (e) {
		return errResponse(e);
	}
}
