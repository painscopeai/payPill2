import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { requireEmployer } from '@/server/auth/requireEmployer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function monthKey(ts: string | null | undefined): string {
	const d = ts ? new Date(ts) : new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
	const ctx = await requireEmployer(request);
	if (ctx instanceof NextResponse) return ctx;
	const sb = getSupabaseAdmin();

	const now = new Date();
	const ytdStart = new Date(now.getFullYear(), 0, 1).toISOString();
	const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

	const [txRes, metricRes, employeeRes] = await Promise.all([
		sb
			.from('transactions')
			.select('amount,status,transaction_type,created_at')
			.eq('user_id', ctx.employerId)
			.gte('created_at', ytdStart)
			.order('created_at', { ascending: true }),
		sb
			.from('employer_health_metrics')
			.select('ytd_cost_savings,total_employees')
			.eq('employer_id', ctx.employerId)
			.order('metric_date', { ascending: false })
			.limit(1)
			.maybeSingle(),
		sb
			.from('employer_employees')
			.select('id')
			.eq('employer_id', ctx.employerId)
			.eq('status', 'active'),
	]);

	if (txRes.error) return NextResponse.json({ error: txRes.error.message }, { status: 500 });
	if (metricRes.error) return NextResponse.json({ error: metricRes.error.message }, { status: 500 });
	if (employeeRes.error) return NextResponse.json({ error: employeeRes.error.message }, { status: 500 });

	type TxRow = {
		amount: number | null;
		status: string | null;
		transaction_type: string | null;
		created_at: string | null;
	};
	const txRows = (txRes.data ?? []) as TxRow[];
	const completed = txRows.filter((t) => (t.status || '').toLowerCase() === 'completed');
	const totalHealthcareCosts = completed.reduce((sum, t) => sum + Number(t.amount || 0), 0);
	const totalSavings = Number(metricRes.data?.ytd_cost_savings || 0);
	const activeEmployees =
		Number(metricRes.data?.total_employees || 0) || (employeeRes.data ?? []).length || 0;
	const avgCostPerEmployee = activeEmployees > 0 ? totalHealthcareCosts / activeEmployees : 0;

	const pharm = completed
		.filter((t) => String(t.transaction_type || '').toLowerCase().includes('pharmacy'))
		.reduce((sum, t) => sum + Number(t.amount || 0), 0);
	const pharmacySpendPercent =
		totalHealthcareCosts > 0 ? Number(((pharm / totalHealthcareCosts) * 100).toFixed(1)) : 0;

	const monthKeys: string[] = [];
	for (let i = 5; i >= 0; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
	}
	const monthRows = new Map<string, { medical: number; pharmacy: number; preventive: number }>();
	for (const key of monthKeys) monthRows.set(key, { medical: 0, pharmacy: 0, preventive: 0 });

	for (const t of completed.filter((r) => new Date(r.created_at || 0).toISOString() >= sixMonthsAgo)) {
		const key = monthKey(t.created_at || undefined);
		const row = monthRows.get(key);
		if (!row) continue;
		const type = String(t.transaction_type || '').toLowerCase();
		const amount = Number(t.amount || 0);
		if (type.includes('pharmacy')) row.pharmacy += amount;
		else if (type.includes('prevent')) row.preventive += amount;
		else row.medical += amount;
	}

	const monthlyCosts = monthKeys.map((key) => {
		const [year, mm] = key.split('-');
		const monthLabel = new Date(Number(year), Number(mm) - 1, 1).toLocaleString('default', { month: 'short' });
		return { month: monthLabel, ...monthRows.get(key)! };
	});

	const savingsCategories = [
		{
			name: 'Preventive Programs',
			value: Number((monthlyCosts.reduce((sum, m) => sum + m.preventive, 0) * 0.12).toFixed(2)),
		},
		{
			name: 'Pharmacy Optimization',
			value: Number((monthlyCosts.reduce((sum, m) => sum + m.pharmacy, 0) * 0.08).toFixed(2)),
		},
		{
			name: 'Care Routing',
			value: Number((monthlyCosts.reduce((sum, m) => sum + m.medical, 0) * 0.05).toFixed(2)),
		},
		{ name: 'Recorded YTD Savings', value: totalSavings },
	].filter((r) => r.value > 0);

	return NextResponse.json({
		kpis: {
			totalHealthcareCosts,
			totalSavings,
			avgCostPerEmployee,
			pharmacySpendPercent,
		},
		monthlyCosts,
		savingsCategories,
	});
}
