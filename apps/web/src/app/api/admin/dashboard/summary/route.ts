import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireManageUsersAdmin } from '@/server/auth/requireManageUsersAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function countProfilesByRole(role: string) {
	const sb = getSupabaseAdmin();
	const { count, error } = await sb
		.from('profiles')
		.select('id', { count: 'exact', head: true })
		.eq('role', role);
	if (error) throw error;
	return count ?? 0;
}

async function countTable(table: string, filter?: { column: string; value: string }) {
	const sb = getSupabaseAdmin();
	let q = sb.from(table).select('id', { count: 'exact', head: true });
	if (filter) q = q.eq(filter.column, filter.value);
	const { count, error } = await q;
	if (error) throw error;
	return count ?? 0;
}

export async function GET(request: NextRequest) {
	const ctx = await requireManageUsersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	try {
		const [patients, employers, insurance, providers, transactions, subscriptions] =
			await Promise.all([
				countProfilesByRole('individual'),
				countProfilesByRole('employer'),
				countProfilesByRole('insurance'),
				countProfilesByRole('provider'),
				countTable('transactions'),
				countTable('subscriptions', { column: 'status', value: 'active' }),
			]);

		return NextResponse.json({
			patients,
			employers,
			insurance,
			providers,
			transactions,
			subscriptions,
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Failed to load dashboard summary';
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
