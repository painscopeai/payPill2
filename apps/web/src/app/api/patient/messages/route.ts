import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getBearerUserId } from '@/server/auth/getBearerUserId';
import { getSupabaseAdmin } from '@/server/supabase/admin';
import { blockWalkInEmployerMessaging, patientProfileIsWalkIn } from '@/server/patient/walkInPatientMessaging';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ThreadRow = {
	kind: 'employer_broadcast' | 'workplace_direct' | 'clinical_provider';
	sort_at: string;
	title: string;
	subtitle: string;
	unread: number;
	open: Record<string, string>;
	/** Legacy broadcast list fields (subset) */
	recipient_id?: string;
};

function employerLabel(p: { company_name?: string | null; name?: string | null; email?: string | null } | undefined, id: string) {
	return p?.company_name || p?.name || p?.email || id;
}

async function buildClinicalProviderThreadList(
	sb: ReturnType<typeof getSupabaseAdmin>,
	clinicalRows: unknown[],
): Promise<ThreadRow[]> {
	const threads: ThreadRow[] = [];
	const byProv = new Map<string, { last_at: string; preview: string; unread: number }>();
	for (const row of clinicalRows) {
		const r = row as {
			provider_user_id: string;
			created_at: string;
			body: string;
			sender_user_id: string;
			read_at: string | null;
		};
		const pid = r.provider_user_id;
		const cur = byProv.get(pid);
		const unreadInc = r.sender_user_id === pid && !r.read_at ? 1 : 0;
		if (!cur) {
			byProv.set(pid, {
				last_at: r.created_at,
				preview: String(r.body || '').slice(0, 200),
				unread: unreadInc,
			});
		} else {
			if (new Date(r.created_at) > new Date(cur.last_at)) {
				cur.last_at = r.created_at;
				cur.preview = String(r.body || '').slice(0, 200);
			}
			cur.unread += unreadInc;
		}
	}
	if (byProv.size === 0) return threads;
	const pids = Array.from(byProv.keys());
	const { data: pprofs } = await sb.from('profiles').select('id, first_name, last_name, email').in('id', pids);
	const nameBy = new Map<string, string>();
	for (const p of pprofs || []) {
		const pr = p as { id: string; first_name: string | null; last_name: string | null; email: string | null };
		nameBy.set(
			pr.id,
			[pr.first_name, pr.last_name].filter(Boolean).join(' ').trim() || pr.email || 'Care team',
		);
	}
	for (const [providerUserId, v] of byProv) {
		threads.push({
			kind: 'clinical_provider',
			sort_at: v.last_at,
			title: nameBy.get(providerUserId) || 'Care team',
			subtitle: 'Provider',
			unread: v.unread,
			open: { kind: 'clinical_provider', provider_user_id: providerUserId },
		});
	}
	return threads;
}

/**
 * GET /api/patient/messages — unified inbox: employer broadcasts, workplace DMs, care-team (provider) threads.
 */
export async function GET(request: NextRequest) {
	void request;
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const sb = getSupabaseAdmin();

	const { data: coverageProf } = await sb
		.from('profiles')
		.select('patient_coverage_source')
		.eq('id', uid)
		.maybeSingle();
	if (
		patientProfileIsWalkIn(
			(coverageProf as { patient_coverage_source?: string | null } | null)?.patient_coverage_source,
		)
	) {
		const { data: walkClinicalRows, error: wClinErr } = await sb
			.from('provider_secure_messages')
			.select('id, provider_user_id, patient_user_id, sender_user_id, body, read_at, created_at')
			.eq('patient_user_id', uid)
			.order('created_at', { ascending: false })
			.limit(400);
		if (wClinErr) {
			console.error('[api/patient/messages GET] clinical (walk-in)', wClinErr.message);
			return NextResponse.json({ error: 'Failed to load care messages' }, { status: 500 });
		}
		const wt = await buildClinicalProviderThreadList(sb, walkClinicalRows || []);
		wt.sort((a, b) => Date.parse(b.sort_at) - Date.parse(a.sort_at));
		return NextResponse.json({
			threads: wt,
			employers: [],
			employer_messaging: false,
		});
	}

	const [
		{ data: recipients, error: recErr },
		{ data: memberships },
		{ data: clinicalRows, error: clinErr },
		{ data: wThreads, error: wErr },
	] = await Promise.all([
		sb
			.from('employer_broadcast_recipients')
			.select('id, broadcast_id, employer_id, read_at, created_at')
			.eq('patient_user_id', uid)
			.order('created_at', { ascending: false })
			.limit(200),
		sb.from('employer_employees').select('employer_id').eq('user_id', uid).eq('status', 'active'),
		sb
			.from('provider_secure_messages')
			.select('id, provider_user_id, patient_user_id, sender_user_id, body, read_at, created_at')
			.eq('patient_user_id', uid)
			.order('created_at', { ascending: false })
			.limit(400),
		sb
			.from('workplace_direct_threads')
			.select('id, employer_user_id, employee_user_id, updated_at, created_at')
			.eq('employee_user_id', uid)
			.order('updated_at', { ascending: false })
			.limit(100),
	]);

	if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 });
	if (clinErr) {
		console.error('[api/patient/messages GET] clinical', clinErr.message);
		return NextResponse.json({ error: 'Failed to load care messages' }, { status: 500 });
	}

	const workplaceMissing = Boolean(wErr && /does not exist|schema cache/i.test(wErr.message));
	if (wErr && !workplaceMissing) {
		console.error('[api/patient/messages GET] workplace', wErr.message);
		return NextResponse.json({ error: 'Failed to load workplace messages' }, { status: 500 });
	}

	const employerIdsFromMembership = Array.from(
		new Set((memberships || []).map((m: { employer_id: string | null }) => m.employer_id).filter(Boolean)),
	) as string[];
	let employerOptions: Array<{ employer_id: string; employer_label: string }> = [];
	if (employerIdsFromMembership.length > 0) {
		const { data: employerProfiles } = await sb
			.from('profiles')
			.select('id,company_name,name,email')
			.in('id', employerIdsFromMembership);
		employerOptions = (employerProfiles || []).map(
			(p: { id: string; company_name: string | null; name: string | null; email: string | null }) => ({
				employer_id: p.id,
				employer_label: employerLabel(p, p.id),
			}),
		);
	}

	const threads: ThreadRow[] = [];

	// --- Employer broadcasts ---
	if (recipients && recipients.length > 0) {
		const broadcastIds = Array.from(new Set(recipients.map((r: { broadcast_id: string }) => r.broadcast_id)));
		const employerIds = Array.from(new Set(recipients.map((r: { employer_id: string }) => r.employer_id)));

		const [{ data: broadcasts }, { data: employers }, { data: latestReplies }] = await Promise.all([
			sb.from('employer_broadcasts').select('id, subject, body, created_at, employer_id').in('id', broadcastIds),
			sb.from('profiles').select('id, company_name, name, email').in('id', employerIds),
			sb
				.from('employer_broadcast_replies')
				.select('recipient_id, sender_role, body, created_at, read_at')
				.in(
					'recipient_id',
					recipients.map((r: { id: string }) => r.id),
				)
				.order('created_at', { ascending: false }),
		]);

		const broadcastById = new Map((broadcasts || []).map((b: { id: string }) => [b.id, b as never]));
		const employerById = new Map((employers || []).map((e: { id: string }) => [e.id, e as never]));

		const lastByRecipient = new Map<string, { body: string; created_at: string; sender_role: string }>();
		const unreadFromEmployerByRecipient = new Map<string, number>();
		(latestReplies || []).forEach(
			(r: { recipient_id: string; sender_role: string; body: string; created_at: string; read_at: string | null }) => {
				if (!lastByRecipient.has(r.recipient_id)) {
					lastByRecipient.set(r.recipient_id, { body: r.body, created_at: r.created_at, sender_role: r.sender_role });
				}
				if (r.sender_role === 'employer' && !r.read_at) {
					unreadFromEmployerByRecipient.set(
						r.recipient_id,
						(unreadFromEmployerByRecipient.get(r.recipient_id) || 0) + 1,
					);
				}
			},
		);

		for (const r of recipients as {
			id: string;
			broadcast_id: string;
			employer_id: string;
			read_at: string | null;
			created_at: string;
		}[]) {
			const b = broadcastById.get(r.broadcast_id) as { subject: string; body: string; created_at: string } | undefined;
			const e = employerById.get(r.employer_id) as
				| { company_name: string | null; name: string | null; email: string | null }
				| undefined;
			const last = lastByRecipient.get(r.id);
			const lastAt = last?.created_at || b?.created_at || r.created_at;
			const unread = unreadFromEmployerByRecipient.get(r.id) || 0;
			threads.push({
				kind: 'employer_broadcast',
				sort_at: lastAt,
				title: b?.subject || 'Announcement',
				subtitle: employerLabel(e, r.employer_id),
				unread,
				open: { kind: 'employer_broadcast', recipient_id: r.id },
				recipient_id: r.id,
			});
		}
	}

	// --- Workplace direct (employer ↔ employee) ---
	if (!workplaceMissing && wThreads && wThreads.length > 0) {
		const empIds = Array.from(new Set(wThreads.map((t: { employer_user_id: string }) => t.employer_user_id)));
		const { data: empProfs } = await sb
			.from('profiles')
			.select('id, company_name, name, email')
			.in('id', empIds);
		const empById = new Map((empProfs || []).map((p: { id: string }) => [p.id, p as never]));

		const threadIds = wThreads.map((t: { id: string }) => t.id);
		const { data: wMsgs } = await sb
			.from('workplace_direct_messages')
			.select('id, thread_id, sender_user_id, body, read_at, created_at')
			.in('thread_id', threadIds)
			.order('created_at', { ascending: false })
			.limit(800);

		const lastByThread = new Map<string, { body: string; created_at: string }>();
		const unreadByThread = new Map<string, number>();
		for (const m of wMsgs || []) {
			const row = m as {
				thread_id: string;
				sender_user_id: string;
				body: string;
				read_at: string | null;
				created_at: string;
			};
			if (!lastByThread.has(row.thread_id)) {
				lastByThread.set(row.thread_id, { body: row.body, created_at: row.created_at });
			}
			if (row.sender_user_id !== uid && !row.read_at) {
				unreadByThread.set(row.thread_id, (unreadByThread.get(row.thread_id) || 0) + 1);
			}
		}

		for (const t of wThreads as {
			id: string;
			employer_user_id: string;
			updated_at: string;
			created_at: string;
		}[]) {
			const ep = empById.get(t.employer_user_id) as
				| { company_name: string | null; name: string | null; email: string | null }
				| undefined;
			const last = lastByThread.get(t.id);
			threads.push({
				kind: 'workplace_direct',
				sort_at: last?.created_at || t.updated_at || t.created_at,
				title: employerLabel(ep, t.employer_user_id),
				subtitle: 'Direct message',
				unread: unreadByThread.get(t.id) || 0,
				open: { kind: 'workplace_direct', thread_id: t.id },
			});
		}
	}

	// --- Clinical (provider ↔ patient / walk-in) ---
	const clinicalThreads = await buildClinicalProviderThreadList(sb, clinicalRows || []);
	threads.push(...clinicalThreads);

	threads.sort((a, b) => Date.parse(b.sort_at) - Date.parse(a.sort_at));

	return NextResponse.json({ threads, employers: employerOptions, employer_messaging: true });
}

type ComposePatientMessageBody = {
	employer_id?: string;
	subject?: string;
	body?: string;
};

/**
 * POST /api/patient/messages — start (or continue) a workplace direct thread to an employer you work for.
 */
export async function POST(request: NextRequest) {
	const uid = await getBearerUserId(request);
	if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	let payload: ComposePatientMessageBody;
	try {
		payload = (await request.json()) as ComposePatientMessageBody;
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const employerId = String(payload.employer_id ?? '').trim();
	const subject = String(payload.subject ?? '').trim();
	let body = String(payload.body ?? '').trim();
	if (!employerId) return NextResponse.json({ error: 'employer_id is required' }, { status: 400 });
	if (!body) return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
	if (subject) body = `${subject}\n\n${body}`;

	const sb = getSupabaseAdmin();
	const walkInBlock = await blockWalkInEmployerMessaging(sb, uid);
	if (walkInBlock) return walkInBlock;

	const { data: membership, error: mErr } = await sb
		.from('employer_employees')
		.select('id')
		.eq('user_id', uid)
		.eq('employer_id', employerId)
		.eq('status', 'active')
		.limit(1)
		.maybeSingle();
	if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
	if (!membership) {
		return NextResponse.json({ error: 'You are not an active employee of this employer' }, { status: 403 });
	}

	let threadId: string | null = null;
	const { data: existing, error: findErr } = await sb
		.from('workplace_direct_threads')
		.select('id')
		.eq('employer_user_id', employerId)
		.eq('employee_user_id', uid)
		.maybeSingle();

	if (findErr && !/does not exist|schema cache/i.test(findErr.message)) {
		return NextResponse.json({ error: findErr.message }, { status: 500 });
	}
	if (findErr && /does not exist|schema cache/i.test(findErr.message)) {
		return NextResponse.json(
			{ error: 'Workplace messaging is not available until the latest database migration is applied.' },
			{ status: 503 },
		);
	}

	if (existing?.id) threadId = existing.id as string;
	else {
		const { data: created, error: cErr } = await sb
			.from('workplace_direct_threads')
			.insert({ employer_user_id: employerId, employee_user_id: uid })
			.select('id')
			.single();
		if (cErr || !created) {
			return NextResponse.json({ error: cErr?.message || 'Failed to create thread' }, { status: 500 });
		}
		threadId = (created as { id: string }).id;
	}

	const { error: insErr } = await sb.from('workplace_direct_messages').insert({
		thread_id: threadId,
		sender_user_id: uid,
		body,
	});
	if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

	await sb.from('notifications').insert({
		user_id: employerId,
		title: 'New message from employee',
		body: body.slice(0, 240),
		category: 'patient_direct_message',
		link: '/employer/messaging',
	});

	return NextResponse.json({ thread_id: threadId, kind: 'workplace_direct' }, { status: 201 });
}
