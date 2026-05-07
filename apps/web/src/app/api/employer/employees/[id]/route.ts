import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireEmployer } from '@/server/auth/requireEmployer';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_STATUS = new Set(['draft', 'pending', 'active', 'inactive']);

type PatchBody = {
	first_name?: string;
	last_name?: string;
	email?: string;
	department?: string | null;
	hire_date?: string | null;
	status?: string;
	insurance_option_slug?: string | null;
	health_score?: number | null;
};

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const ctx = await requireEmployer(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await params;

	let body: PatchBody;
	try {
		body = (await request.json()) as PatchBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();

	const { data: existing, error: getErr } = await sb
		.from('employer_employees')
		.select('id, employer_id, user_id, status')
		.eq('id', id)
		.maybeSingle();
	if (getErr) return NextResponse.json({ error: getErr.message }, { status: 500 });
	if (!existing || existing.employer_id !== ctx.employerId) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 });
	}

	const updates: Record<string, unknown> = {};
	if (body.first_name !== undefined) updates.first_name = String(body.first_name).slice(0, 200);
	if (body.last_name !== undefined) updates.last_name = String(body.last_name).slice(0, 200);
	if (body.department !== undefined)
		updates.department = body.department ? String(body.department).slice(0, 200) : null;
	if (body.hire_date !== undefined) updates.hire_date = body.hire_date || null;
	if (body.health_score !== undefined) updates.health_score = body.health_score == null ? null : Number(body.health_score);
	if (body.insurance_option_slug !== undefined) {
		updates.insurance_option_slug = body.insurance_option_slug || null;
	}
	if (body.status !== undefined) {
		const v = String(body.status).toLowerCase();
		if (!ALLOWED_STATUS.has(v)) {
			return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
		}
		updates.status = v;
	}

	if (Object.keys(updates).length === 0) {
		return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
	}

	const { data, error } = await sb
		.from('employer_employees')
		.update(updates)
		.eq('id', id)
		.eq('employer_id', ctx.employerId)
		.select('*')
		.maybeSingle();

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });

	if (existing.user_id) {
		if (updates.status === 'inactive') {
			try {
				await sb.auth.admin.updateUserById(existing.user_id, { ban_duration: '876000h' });
			} catch (e) {
				console.warn('[employer/employees PATCH] ban failed:', (e as Error).message);
			}
		} else if (updates.status === 'active' && existing.status !== 'active') {
			try {
				await sb.auth.admin.updateUserById(existing.user_id, { ban_duration: 'none' });
			} catch (e) {
				console.warn('[employer/employees PATCH] unban failed:', (e as Error).message);
			}
		}
	}

	return NextResponse.json(data);
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const ctx = await requireEmployer(request);
	if (ctx instanceof NextResponse) return ctx;
	const { id } = await params;

	const sb = getSupabaseAdmin();

	const { data: row, error: fetchErr } = await sb
		.from('employer_employees')
		.select('id, employer_id, user_id')
		.eq('id', id)
		.maybeSingle();
	if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
	if (!row || row.employer_id !== ctx.employerId) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 });
	}

	const { error: delErr } = await sb
		.from('employer_employees')
		.delete()
		.eq('id', id)
		.eq('employer_id', ctx.employerId);
	if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

	if (row.user_id) {
		try {
			await sb.auth.admin.deleteUser(row.user_id);
		} catch (e) {
			console.warn('[employer/employees DELETE] auth delete failed:', (e as Error).message);
		}
	}

	return NextResponse.json({ ok: true });
}
