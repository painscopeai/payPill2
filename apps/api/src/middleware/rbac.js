import 'dotenv/config';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import logger from '../utils/logger.js';

const DEFAULT_ADMIN_PERMISSIONS = [
	'manage_users',
	'view_transactions',
	'manage_transactions',
	'manage_subscriptions',
	'manage_providers',
	'manage_forms',
	'manage_ai',
	'manage_settings',
];

export class HttpError extends Error {
	constructor(status, message) {
		super(message);
		this.name = 'HttpError';
		this.status = status;
	}
}

/**
 * Express middleware: Bearer Supabase access token + profiles.role = admin
 */
export async function checkAuth(req, res, next) {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new HttpError(401, 'Missing or invalid authorization header');
		}
		const jwt = authHeader.slice(7).trim();
		const sb = getSupabaseAdmin();
		const { data: userData, error: authErr } = await sb.auth.getUser(jwt);
		if (authErr || !userData?.user) {
			throw new HttpError(401, 'Invalid or expired token');
		}
		const uid = userData.user.id;
		const { data: profile, error: profErr } = await sb
			.from('profiles')
			.select('id, email, role, name, first_name, last_name, permissions')
			.eq('id', uid)
			.maybeSingle();
		if (profErr) throw profErr;
		if (!profile || profile.role !== 'admin') {
			throw new HttpError(403, 'Administrator role required');
		}
		const perms = Array.isArray(profile.permissions) && profile.permissions.length
			? profile.permissions
			: DEFAULT_ADMIN_PERMISSIONS;
		req.admin = { ...profile, email: profile.email || userData.user.email };
		req.adminId = uid;
		req.adminRole = profile.role;
		req.adminPermissions = perms;
		logger.info(`[RBAC] Admin API: ${req.admin.email}`);
		next();
	} catch (e) {
		next(e);
	}
}

export function checkRole(allowedRoles) {
	const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
	return (req, res, next) => {
		try {
			if (!req.admin) throw new HttpError(401, 'Admin not authenticated');
			if (!roles.includes(req.adminRole)) {
				throw new HttpError(403, `Insufficient permissions. Required role: ${roles.join(' or ')}`);
			}
			next();
		} catch (e) {
			next(e);
		}
	};
}

export function checkPermission(requiredPermissions) {
	const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
	return (req, res, next) => {
		try {
			if (!req.admin) throw new HttpError(401, 'Admin not authenticated');
			const adminPerms = req.adminPermissions || [];
			const ok = permissions.some((p) => adminPerms.includes(p) || adminPerms.includes('*'));
			if (!ok) {
				throw new HttpError(403, `Insufficient permissions. Required: ${permissions.join(' or ')}`);
			}
			next();
		} catch (e) {
			next(e);
		}
	};
}

export async function auditLog(params) {
	const sb = getSupabaseAdmin();
	const {
		adminId,
		action,
		resourceType,
		resourceId,
		changes,
		ipAddress,
		userAgent,
		status = 'success',
	} = params;
	try {
		await sb.from('audit_logs').insert({
			user_id: adminId,
			action,
			resource_type: resourceType,
			resource_id: resourceId || null,
			changes: changes || {},
			ip_address: ipAddress || null,
			user_agent: userAgent || null,
			status,
		});
		logger.info(`[AUDIT] ${action} on ${resourceType}${resourceId ? ` (${resourceId})` : ''}`);
	} catch (error) {
		logger.error(`[AUDIT] Failed to log action: ${error.message}`);
	}
}

export function attachAuditLog(req, res, next) {
	req.auditLog = async (action, resourceType, resourceId, changes) => {
		await auditLog({
			adminId: req.adminId,
			action,
			resourceType,
			resourceId,
			changes,
			ipAddress: req.ip,
			userAgent: req.get('user-agent'),
		});
	};
	next();
}

export default {
	checkAuth,
	checkRole,
	checkPermission,
	auditLog,
	attachAuditLog,
};
