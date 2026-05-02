import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCatalogForKeys } from '@/server/admin/profileOptionCatalogService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Public catalog for onboarding dropdowns.
 * GET ?sets=preferred_language,sex_assigned_at_birth
 */
export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const raw = url.searchParams.get('sets') || '';
	const keys = raw
		.split(',')
		.map((k) => k.trim())
		.filter(Boolean);
	if (!keys.length) {
		return NextResponse.json({ error: 'Query parameter sets is required (comma-separated keys)' }, { status: 400 });
	}
	if (keys.length > 80) {
		return NextResponse.json({ error: 'Too many sets requested (max 80)' }, { status: 400 });
	}
	try {
		const catalog = await getCatalogForKeys(keys);
		return NextResponse.json({ catalog });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Server error';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
