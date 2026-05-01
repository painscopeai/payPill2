import 'dotenv/config';
import { App } from '@tinyhttp/app';
import logger from '../utils/logger.js';
import { checkAuth, attachAuditLog } from '../middleware/rbac.js';

const router = new App();

/**
 * GET /admin/auth/me
 * Current admin profile (Supabase session token required).
 */
router.get('/me', checkAuth, async (req, res) => {
	logger.info(`[ADMIN-AUTH] /me for ${req.admin.email}`);
	res.json({
		id: req.admin.id,
		email: req.admin.email,
		name: req.admin.name,
		role: req.admin.role,
		permissions: req.adminPermissions || [],
	});
});

/**
 * POST /admin/auth/logout
 * Client clears Supabase session; this endpoint is a no-op for API symmetry.
 */
router.post('/logout', checkAuth, attachAuditLog, async (req, res) => {
	await req.auditLog('LOGOUT', 'admin', req.adminId);
	res.json({ success: true, message: 'Signed out (clear client session).' });
});

export default router;
