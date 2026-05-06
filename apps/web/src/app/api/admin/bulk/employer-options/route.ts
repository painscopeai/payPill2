import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { requirePlatformAdmin } from '@/server/auth/requirePlatformAdmin';
import { listEmployerAccountsForAdmin } from '@/server/admin/employerAccountsAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
	const ctx = await requirePlatformAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	try {
		const sb = getSupabaseAdmin();
		const { items } = await listEmployerAccountsForAdmin(sb);
		return NextResponse.json({ items });
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'Server error';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
