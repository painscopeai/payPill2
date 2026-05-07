import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { requireManageUsersAdmin } from '@/server/auth/requireManageUsersAdmin';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = new Set(['individual', 'employer', 'insurance', 'provider', 'admin']);
const ALLOWED_CREATE_ROLES = new Set(['individual', 'employer', 'insurance']);

/**
 * GET /api/admin/users?role=individual&search=foo&page=1&pageSize=10&status=active
 *
 * Admin search across `profiles`. Supports role, status, ilike search, and pagination.
 * Joins related tables on demand:
 *   role=employer  → adds employee_count from `employer_employees`
 */
export async function GET(request: NextRequest) {
	const ctx = await requireManageUsersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	const url = new URL(request.url);
	const role = String(url.searchParams.get('role') ?? '').trim();
	const search = String(url.searchParams.get('search') ?? '').trim();
	const status = String(url.searchParams.get('status') ?? '').trim();
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 10));

	if (role && !ALLOWED_ROLES.has(role)) {
		return NextResponse.json({ error: 'Invalid role filter' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const from = (page - 1) * pageSize;
	const to = from + pageSize - 1;

	let q = sb
		.from('profiles')
		.select(
			'id,email,role,first_name,last_name,name,phone,company_name,status,subscription_status,subscription_plan,created_at,updated_at',
			{ count: 'exact' },
		)
		.order('created_at', { ascending: false })
		.range(from, to);

	if (role) q = q.eq('role', role);
	if (status && status !== 'all' && !(role === 'individual' && status === 'draft')) q = q.eq('status', status);

	if (search) {
		const term = search.replace(/[%,]/g, '');
		const clauses = [
			`first_name.ilike.%${term}%`,
			`last_name.ilike.%${term}%`,
			`name.ilike.%${term}%`,
			`email.ilike.%${term}%`,
			`company_name.ilike.%${term}%`,
		].join(',');
		q = q.or(clauses);
	}

	const { data, error, count } = await q;
	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	let items = (data ?? []) as Array<Record<string, unknown>>;

	if (role === 'individual' && items.length > 0) {
		const ids = items.map((it) => String(it.id));
		const { data: employeeRows } = await sb
			.from('employer_employees')
			.select('user_id,status,updated_at,created_at')
			.in('user_id', ids);

		type EmployeeStatusRow = {
			user_id: string | null;
			status: string | null;
			updated_at: string | null;
			created_at: string | null;
		};

		const latestEmployeeStatusByUser = new Map<string, string>();
		const latestAtByUser = new Map<string, number>();

		for (const row of (employeeRows ?? []) as EmployeeStatusRow[]) {
			if (!row.user_id || !row.status) continue;
			const ts = new Date(row.updated_at ?? row.created_at ?? 0).getTime();
			const prevTs = latestAtByUser.get(row.user_id) ?? -1;
			if (ts >= prevTs) {
				latestAtByUser.set(row.user_id, ts);
				latestEmployeeStatusByUser.set(row.user_id, row.status);
			}
		}

		items = items.map((it) => {
			const employeeStatus = latestEmployeeStatusByUser.get(String(it.id));
			if (!employeeStatus) return it;
			return {
				...it,
				status: employeeStatus,
			};
		});

		if (status === 'draft') {
			items = items.filter((it) => String(it.status ?? '').toLowerCase() === 'draft');
		}
	}

	if (role === 'employer' && items.length > 0) {
		const ids = items.map((it) => String(it.id));
		const { data: counts } = await sb
			.from('employer_employees')
			.select('employer_id', { count: 'exact', head: false })
			.in('employer_id', ids);
		const counter = new Map<string, number>();
		(counts || []).forEach((row: { employer_id: string }) => {
			counter.set(row.employer_id, (counter.get(row.employer_id) || 0) + 1);
		});
		items = items.map((it) => ({
			...it,
			employee_count: counter.get(String(it.id)) || 0,
		}));
	}

	const total = count ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	return NextResponse.json({ items, total, totalPages, page, pageSize });
}

type CreateBody = {
	email?: string;
	role?: string;
	password?: string;
	first_name?: string;
	last_name?: string;
	name?: string;
	phone?: string;
	company_name?: string;
	status?: string;
};

export async function POST(request: NextRequest) {
	const ctx = await requireManageUsersAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	let body: CreateBody;
	try {
		body = (await request.json()) as CreateBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const email = String(body.email ?? '').trim().toLowerCase();
	const role = String(body.role ?? '').trim().toLowerCase();
	if (!email || !email.includes('@')) {
		return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
	}
	if (!ALLOWED_CREATE_ROLES.has(role)) {
		return NextResponse.json({ error: 'Invalid role for creation' }, { status: 400 });
	}

	const password = String(body.password ?? '').trim() || randomBytes(9).toString('base64url');
	if (password.length < 8) {
		return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
	}

	const first_name = String(body.first_name ?? '').trim() || null;
	const last_name = String(body.last_name ?? '').trim() || null;
	const name = String(body.name ?? '').trim() || null;
	const phone = String(body.phone ?? '').trim() || null;
	const company_name = String(body.company_name ?? '').trim() || null;
	const status = String(body.status ?? 'active').toLowerCase();

	const sb = getSupabaseAdmin();
	const { data: exists } = await sb.from('profiles').select('id').eq('email', email).maybeSingle();
	if (exists?.id) {
		return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
	}

	const { data: created, error: createErr } = await sb.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { role, first_name, last_name, name },
	});
	if (createErr || !created?.user?.id) {
		return NextResponse.json({ error: createErr?.message || 'Failed to create user' }, { status: 500 });
	}

	const userId = created.user.id;
	const { data: profile, error: profileErr } = await sb
		.from('profiles')
		.update({
			role,
			first_name,
			last_name,
			name,
			phone,
			company_name,
			status,
			updated_at: new Date().toISOString(),
		})
		.eq('id', userId)
		.select(
			'id,email,role,first_name,last_name,name,phone,company_name,status,subscription_status,subscription_plan,created_at,updated_at',
		)
		.maybeSingle();
	if (profileErr) {
		await sb.auth.admin.deleteUser(userId);
		return NextResponse.json({ error: profileErr.message }, { status: 500 });
	}

	if (status === 'inactive' || status === 'suspended') {
		await sb.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
	}

	return NextResponse.json({ item: profile, initialPassword: password }, { status: 201 });
}
