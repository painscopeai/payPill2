import 'dotenv/config';
import { App } from '@tinyhttp/app';
import logger from '../utils/logger.js';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';

const router = new App();
const sb = () => getSupabaseAdmin();

const VALID_ROLES = new Set(['individual', 'employer', 'insurance', 'provider', 'admin']);

function normalizeRole(role) {
	if (role === 'patient') return 'individual';
	if (VALID_ROLES.has(role)) return role;
	return 'individual';
}

async function createAuthUser({ email, password, role, extraMeta = {} }) {
	const sbClient = sb();
	const { data: existing } = await sbClient.from('profiles').select('id').eq('email', email).maybeSingle();
	if (existing) {
		return { error: { message: 'User with this email already exists' }, status: 400 };
	}

	const r = normalizeRole(role);
	const { data: created, error: createErr } = await sbClient.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: {
			role: r,
			first_name: extraMeta.first_name || '',
			last_name: extraMeta.last_name || '',
			name: extraMeta.name || '',
			phone: extraMeta.phone || '',
			date_of_birth: extraMeta.date_of_birth || '',
			provider_type: extraMeta.provider_type || '',
			license_number: extraMeta.license_number || '',
			...extraMeta,
		},
	});

	if (createErr || !created?.user) {
		logger.error('[auth] createUser', createErr);
		return { error: { message: createErr?.message || 'Registration failed' }, status: 400 };
	}

	const { data: signIn, error: signErr } = await sbClient.auth.signInWithPassword({ email, password });
	if (signErr || !signIn?.session) {
		logger.warn('[auth] sign-in after register failed', signErr?.message);
		return {
			ok: true,
			user: {
				id: created.user.id,
				email: created.user.email,
				role: r,
			},
			token: null,
		};
	}

	const prof = signIn.user?.user_metadata || {};
	return {
		ok: true,
		user: {
			id: signIn.user.id,
			email: signIn.user.email,
			first_name: prof.first_name,
			last_name: prof.last_name,
			role: prof.role || r,
		},
		token: signIn.session.access_token,
	};
}

router.post('/individual', async (req, res) => {
	const { email, password, passwordConfirm, first_name, last_name } = req.body;
	if (!email || !password || !passwordConfirm) {
		return res.status(400).json({ error: 'Missing required fields: email, password, passwordConfirm' });
	}
	if (password !== passwordConfirm) {
		return res.status(400).json({ error: 'Passwords do not match' });
	}
	if (password.length < 8) {
		return res.status(400).json({ error: 'Password must be at least 8 characters long' });
	}
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return res.status(400).json({ error: 'Invalid email format' });
	}

	const out = await createAuthUser({
		email,
		password,
		role: 'individual',
		extraMeta: { first_name, last_name },
	});
	if (out.error) {
		return res.status(out.status).json({ error: out.error.message });
	}
	return res.status(201).json({ success: true, user: out.user, token: out.token });
});

router.post('/patient', async (req, res) => {
	const { email, password, passwordConfirm, first_name, last_name, date_of_birth } = req.body;
	if (!email || !password || !passwordConfirm) {
		return res.status(400).json({ error: 'Missing required fields: email, password, passwordConfirm' });
	}
	if (password !== passwordConfirm) {
		return res.status(400).json({ error: 'Passwords do not match' });
	}
	if (password.length < 8) {
		return res.status(400).json({ error: 'Password must be at least 8 characters long' });
	}
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return res.status(400).json({ error: 'Invalid email format' });
	}

	const out = await createAuthUser({
		email,
		password,
		role: 'patient',
		extraMeta: { first_name, last_name, date_of_birth },
	});
	if (out.error) {
		return res.status(out.status).json({ error: out.error.message });
	}
	return res.status(201).json({ success: true, user: out.user, token: out.token });
});

router.post('/provider', async (req, res) => {
	const { email, password, passwordConfirm, first_name, last_name, provider_type, license_number } = req.body;
	if (!email || !password || !passwordConfirm) {
		return res.status(400).json({ error: 'Missing required fields: email, password, passwordConfirm' });
	}
	if (password !== passwordConfirm) {
		return res.status(400).json({ error: 'Passwords do not match' });
	}
	if (password.length < 8) {
		return res.status(400).json({ error: 'Password must be at least 8 characters long' });
	}
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return res.status(400).json({ error: 'Invalid email format' });
	}

	const out = await createAuthUser({
		email,
		password,
		role: 'provider',
		extraMeta: { first_name, last_name, provider_type, license_number },
	});
	if (out.error) {
		return res.status(out.status).json({ error: out.error.message });
	}
	return res.status(201).json({ success: true, user: out.user, token: out.token });
});

router.post('/login', async (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) {
		return res.status(400).json({ error: 'Missing required fields: email, password' });
	}

	const { data: signIn, error } = await sb().auth.signInWithPassword({ email, password });
	if (error || !signIn?.session?.user) {
		return res.status(401).json({ error: error?.message || 'Invalid credentials' });
	}

	const { data: profile } = await sb()
		.from('profiles')
		.select('role, first_name, last_name, email')
		.eq('id', signIn.user.id)
		.maybeSingle();

	if (!profile?.role) {
		return res.status(500).json({ error: 'User profile missing role' });
	}

	return res.json({
		success: true,
		user: {
			id: signIn.user.id,
			email: profile.email || signIn.user.email,
			first_name: profile.first_name,
			last_name: profile.last_name,
			role: profile.role,
		},
		token: signIn.session.access_token,
	});
});

router.post('/logout', async (_req, res) => {
	logger.info('User logged out');
	return res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
