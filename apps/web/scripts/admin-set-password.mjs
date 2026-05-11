#!/usr/bin/env node
/**
 * One-off operator script: set a user's password via Supabase Auth Admin API.
 *
 * Requires (from apps/web/.env or .env.local — same as the app server):
 *   - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage (from apps/web):
 *   ADMIN_NEW_PASSWORD='your-strong-password' node scripts/admin-set-password.mjs --email you@example.com
 *
 * Optional:
 *   --ensure-admin-role   sets public.profiles.role = 'admin' for that user id
 *   --clear-must-change   removes user_metadata.must_change_password if set
 *
 * Do not commit secrets. Run only on a machine you trust; service role bypasses RLS.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: join(__dirname, '../.env') });
config({ path: join(__dirname, '../.env.local'), override: true });

function resolveSupabaseUrl() {
	const raw =
		process.env.SUPABASE_URL?.trim() ||
		process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
		process.env.VITE_SUPABASE_URL?.trim();
	if (!raw) return null;
	try {
		return new URL(raw.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')).origin;
	} catch {
		return null;
	}
}

function parseArgs(argv) {
	const out = { email: '', ensureAdminRole: false, clearMustChange: false };
	for (let i = 2; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--email' && argv[i + 1]) {
			out.email = String(argv[++i]).trim().toLowerCase();
		} else if (a === '--ensure-admin-role') {
			out.ensureAdminRole = true;
		} else if (a === '--clear-must-change') {
			out.clearMustChange = true;
		}
	}
	return out;
}

async function findUserIdByEmail(sb, email) {
	const perPage = 200;
	for (let page = 1; page <= 50; page++) {
		const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
		if (error) throw error;
		const users = data?.users ?? [];
		const hit = users.find((u) => (u.email || '').toLowerCase() === email);
		if (hit?.id) return hit;
		if (users.length < perPage) break;
	}
	return null;
}

async function main() {
	const { email, ensureAdminRole, clearMustChange } = parseArgs(process.argv);
	const newPassword = String(process.env.ADMIN_NEW_PASSWORD || '').trim();

	if (!email) {
		console.error('Usage: ADMIN_NEW_PASSWORD=... node scripts/admin-set-password.mjs --email user@example.com [--ensure-admin-role] [--clear-must-change]');
		process.exit(1);
	}
	if (newPassword.length < 8) {
		console.error('Set ADMIN_NEW_PASSWORD to a password at least 8 characters.');
		process.exit(1);
	}

	const url = resolveSupabaseUrl();
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
	if (!url || !key) {
		console.error('Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
		process.exit(1);
	}

	const sb = createClient(url, key, {
		auth: { persistSession: false, autoRefreshToken: false },
	});

	const user = await findUserIdByEmail(sb, email);
	if (!user) {
		console.error(`No auth user found with email: ${email}`);
		process.exit(1);
	}

	const meta = { ...(user.user_metadata || {}) };
	if (clearMustChange) {
		delete meta.must_change_password;
	}

	const updatePayload = {
		password: newPassword,
		...(clearMustChange ? { user_metadata: meta } : {}),
	};

	const { data, error } = await sb.auth.admin.updateUserById(user.id, updatePayload);
	if (error) {
		console.error('updateUserById failed:', error.message);
		process.exit(1);
	}

	console.log('Password updated for:', data.user?.email || email, 'id:', data.user?.id || user.id);

	if (ensureAdminRole) {
		const { error: pErr } = await sb.from('profiles').update({ role: 'admin' }).eq('id', user.id);
		if (pErr) {
			console.error('profiles role update failed:', pErr.message);
			process.exit(1);
		}
		console.log('profiles.role set to admin for id:', user.id);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
