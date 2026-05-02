import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { requireManageFormsAdmin } from '@/server/auth/requireManageFormsAdmin';
import { syncFormBuilderPayload } from '@/server/forms/builderSync';
import { FORM_TEMPLATE_CATALOG } from '@/lib/formTemplateCatalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
	const ctx = await requireManageFormsAdmin(request);
	if (ctx instanceof NextResponse) return ctx;

	let body: { templateId?: string };
	try {
		body = (await request.json()) as { templateId?: string };
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const templateId = typeof body.templateId === 'string' ? body.templateId.trim() : '';
	const tpl = templateId ? FORM_TEMPLATE_CATALOG[templateId] : undefined;
	if (!tpl) {
		return NextResponse.json({ error: 'Unknown template' }, { status: 400 });
	}

	const sb = getSupabaseAdmin();
	const now = new Date().toISOString();

	try {
		const { data: created, error: insErr } = await sb
			.from('forms')
			.insert({
				name: tpl.name,
				description: tpl.description,
				form_type: tpl.form_type,
				category: tpl.category,
				status: 'draft',
				created_by: ctx.adminId,
				settings: tpl.settings || {},
				created_at: now,
				updated_at: now,
			})
			.select('*')
			.single();
		if (insErr) throw insErr;

		const formId = created.id as string;
		const synced = await syncFormBuilderPayload({
			formId,
			form: {},
			questions: tpl.questions.map((q) => ({
				question_text: q.question_text,
				question_type: q.question_type,
				options_json: q.options_json,
				required: q.required,
				sort_order: q.sort_order,
				config: q.config,
			})),
		});

		return NextResponse.json(
			{
				form: synced.form,
				questions: synced.questions,
			},
			{ status: 201 },
		);
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Failed to create from template';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
