import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { requireInsurance } from '@/server/auth/requireInsurance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type CreateBody = {
	employer_user_id?: string;
	name?: string;
	contract_type?: string;
	member_count?: number;
	contract_value?: number;
	start_date?: string;
	end_date?: string;
	status?: string;
	notes?: string | null;
};

export async function GET(request: NextRequest) {
	const ctx = await requireInsurance(request);
	if (ctx instanceof NextResponse) return ctx;
	const sb = getSupabaseAdmin();

	const { data, error } = await sb
		.from('employer_contracts')
		.select(
			'id,name,status,notes,effective_date,contract_type,member_count,contract_value,start_date,end_date,employer_user_id,insurance_user_id,created_at,profiles:employer_user_id(company_name,name,email)',
		)
		.or(`insurance_user_id.eq.${ctx.insuranceId},insurance_user_id.is.null`)
		.order('created_at', { ascending: false })
		.limit(1000);
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });

	const items = (data ?? []).map((row: Record<string, unknown>) => {
		const prof = row.profiles as Record<string, unknown> | null;
		return {
			id: row.id,
			employer: prof?.company_name || prof?.name || prof?.email || row.employer_user_id,
			employer_user_id: row.employer_user_id,
			type: row.contract_type || 'N/A',
			members: Number(row.member_count || 0),
			value: Number(row.contract_value || 0),
			start: row.start_date || row.effective_date || null,
			end: row.end_date || null,
			status: row.status || 'draft',
			name: row.name,
			notes: row.notes || null,
		};
	});

	return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
	const ctx = await requireInsurance(request);
	if (ctx instanceof NextResponse) return ctx;
	let body: CreateBody;
	try {
		body = (await request.json()) as CreateBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const employerUserId = String(body.employer_user_id ?? '').trim();
	const name = String(body.name ?? '').trim();
	const status = String(body.status ?? 'pending').trim() || 'pending';
	if (!employerUserId) return NextResponse.json({ error: 'employer_user_id is required' }, { status: 400 });
	if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

	const sb = getSupabaseAdmin();
	const { error } = await sb.from('employer_contracts').insert({
		employer_user_id: employerUserId,
		insurance_user_id: ctx.insuranceId,
		name,
		contract_type: body.contract_type || null,
		member_count: Number.isFinite(Number(body.member_count)) ? Number(body.member_count) : 0,
		contract_value: Number.isFinite(Number(body.contract_value)) ? Number(body.contract_value) : null,
		start_date: body.start_date || null,
		end_date: body.end_date || null,
		effective_date: body.start_date || null,
		status,
		notes: body.notes ?? null,
	});
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json({ ok: true }, { status: 201 });
}
