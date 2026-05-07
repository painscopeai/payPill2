import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireEmployer } from '@/server/auth/requireEmployer';
import { getSupabaseAdmin } from '@/server/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CreateBody = {
	email?: string;
	password?: string;
	first_name?: string;
	last_name?: string;
	department?: string | null;
	hire_date?: string | null;
	insurance_option_slug?: string | null;
};

async function validateInsuranceSlug(sb: ReturnType<typeof getSupabaseAdmin>, slug: string): Promise<boolean> {
	const [profileRes, legacyOptionRes] = await Promise.all([
		sb.from('profiles').select('id').eq('id', slug).eq('role', 'insurance').maybeSingle(),
		sb.from('insurance_options').select('slug').eq('slug', slug).maybeSingle(),
	]);
	return Boolean(profileRes.data || legacyOptionRes.data);
}

/**
 * GET /api/employer/employees?status=&search=
 *
 * List employer's own roster. Always scoped to the authenticated employer_id.
 */
export async function GET(request: NextRequest) {
	const ctx = await requireEmployer(request);
	if (ctx instanceof NextResponse) return ctx;

	const url = new URL(request.url);
	const status = String(url.searchParams.get('status') ?? '').trim();
	const search = String(url.searchParams.get('search') ?? '').trim();

	const sb = getSupabaseAdmin();

	let q = sb
		.from('employer_employees')
		.select(
			'id, employer_id, user_id, email, first_name, last_name, department, hire_date, status, insurance_option_slug, approved_at, approved_by, health_score, created_at, updated_at',
		)
		.eq('employer_id', ctx.employerId)
		.order('created_at', { ascending: false });

	if (status && status !== 'all') q = q.eq('status', status);
	if (search) {
		const term = search.replace(/[%,]/g, '');
		const clauses = [
			`first_name.ilike.%${term}%`,
			`last_name.ilike.%${term}%`,
			`email.ilike.%${term}%`,
			`department.ilike.%${term}%`,
		].join(',');
		q = q.or(clauses);
	}

	const { data: items, error } = await q;
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });

	const { data: insRows } = await sb
		.from('profiles')
		.select('id,email,company_name,name,status')
		.eq('role', 'insurance')
		.order('email', { ascending: true });

	const insuranceOptions = (insRows || [])
		.filter((row: { status?: string | null }) => row.status !== 'inactive')
		.map((row: { id: string; email: string | null; company_name: string | null; name: string | null }) => ({
			slug: row.id,
			label: row.company_name || row.name || row.email || row.id,
		}));

	return NextResponse.json({ items: items ?? [], insuranceOptions });
}

/**
 * POST /api/employer/employees
 *
 * Add a single employee (employer self-service).
 * - creates auth user (must_change_password)
 * - inserts an active roster row with required insurance selection
 * - first sign-in still forces password change due to must_change_password metadata
 */
export async function POST(request: NextRequest) {
	const ctx = await requireEmployer(request);
	if (ctx instanceof NextResponse) return ctx;

	let body: CreateBody;
	try {
		body = (await request.json()) as CreateBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const email = String(body.email ?? '').trim();
	const password = String(body.password ?? '');
	const first_name = String(body.first_name ?? '').trim();
	const last_name = String(body.last_name ?? '').trim();
	const department = (body.department ?? null) ? String(body.department).trim() || null : null;
	const hire_raw = (body.hire_date ?? null) ? String(body.hire_date).trim() : '';
	const insurance_option_slug = String(body.insurance_option_slug ?? '').trim();

	if (!email || !EMAIL_RE.test(email)) {
		return NextResponse.json({ error: 'Invalid or missing email' }, { status: 400 });
	}
	if (!password || password.length < 8) {
		return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
	}
	if (!first_name || !last_name) {
		return NextResponse.json({ error: 'first_name and last_name are required' }, { status: 400 });
	}
	if (!insurance_option_slug) {
		return NextResponse.json({ error: 'insurance_option_slug is required' }, { status: 400 });
	}

	let hire_date: string | null = null;
	if (hire_raw) {
		const d = new Date(hire_raw);
		if (Number.isFinite(d.getTime())) {
			hire_date = hire_raw.slice(0, 10);
		}
	}

	const sb = getSupabaseAdmin();
	const insuranceOk = await validateInsuranceSlug(sb, insurance_option_slug);
	if (!insuranceOk) {
		return NextResponse.json({ error: `Unknown insurance_option_slug: ${insurance_option_slug}` }, { status: 400 });
	}

	const { data: existingProf } = await sb.from('profiles').select('id').eq('email', email).maybeSingle();
	if (existingProf) {
		return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
	}

	const { data: created, error: cuErr } = await sb.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: {
			role: 'individual',
			first_name,
			last_name,
			must_change_password: true,
			employee_import: true,
		},
	});

	if (cuErr || !created?.user?.id) {
		return NextResponse.json(
			{ error: cuErr?.message || 'Failed to create user' },
			{ status: 500 },
		);
	}

	const uid = created.user.id;

	const { data: insertedRow, error: insEE } = await sb
		.from('employer_employees')
		.insert({
			employer_id: ctx.employerId,
			user_id: uid,
			email,
			first_name,
			last_name,
			department,
			hire_date,
			status: 'active',
			approved_at: new Date().toISOString(),
			approved_by: ctx.employerId,
			insurance_option_slug,
		})
		.select('*')
		.maybeSingle();

	if (insEE || !insertedRow) {
		await sb.auth.admin.deleteUser(uid);
		return NextResponse.json(
			{ error: insEE?.message || 'Failed to save employee row' },
			{ status: 500 },
		);
	}

	return NextResponse.json({ item: insertedRow }, { status: 201 });
}
