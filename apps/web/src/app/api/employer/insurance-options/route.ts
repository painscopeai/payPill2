import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireEmployer } from '@/server/auth/requireEmployer';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/employer/insurance-options - insurance choices employers can assign at approval.
 */
export async function GET(request: NextRequest) {
	const ctx = await requireEmployer(request);
	if (ctx instanceof NextResponse) return ctx;

	const sb = getSupabaseAdmin();
	const { data, error } = await sb
		.from('profiles')
		.select('id,email,company_name,name,status')
		.eq('role', 'insurance')
		.order('email', { ascending: true });
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });

	const items = (data || [])
		.filter((row: { status?: string | null }) => row.status !== 'inactive')
		.map((row: { id: string; email: string | null; company_name: string | null; name: string | null }) => ({
			slug: row.id,
			label: row.company_name || row.name || row.email || row.id,
		}));

	return NextResponse.json({ items });
}
