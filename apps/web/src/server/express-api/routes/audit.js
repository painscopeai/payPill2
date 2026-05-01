import { Router } from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { pocketbaseAuth } from '../middleware/pocketbase-auth.js';

const router = Router();

// Valid action types
const VALID_ACTIONS = [
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'EXPORT',
  'IMPORT',
  'SHARE',
  'DOWNLOAD',
];

// Valid resource types
const VALID_RESOURCE_TYPES = [
  'user',
  'health_profile',
  'prescription',
  'appointment',
  'recommendation',
  'lab_result',
  'vital_sign',
  'health_goal',
  'document',
  'audit_log',
];

/**
 * POST /audit-logs
 * Create an audit log entry
 */
router.post('/', async (req, res) => {
  const { user_id, action, resource_type, resource_id, ip_address, user_agent } = req.body;

  // Validate required fields
  if (!user_id) {
    return res.status(400).json({
      error: 'Missing required field: user_id',
    });
  }

  if (!action) {
    return res.status(400).json({
      error: 'Missing required field: action',
    });
  }

  if (!resource_type) {
    return res.status(400).json({
      error: 'Missing required field: resource_type',
    });
  }

  // Validate action
  if (!VALID_ACTIONS.includes(action.toUpperCase())) {
    return res.status(400).json({
      error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`,
    });
  }

  // Validate resource_type
  if (!VALID_RESOURCE_TYPES.includes(resource_type.toLowerCase())) {
    return res.status(400).json({
      error: `Invalid resource_type. Must be one of: ${VALID_RESOURCE_TYPES.join(', ')}`,
    });
  }

  // Create audit log
  const auditLogData = {
    user_id,
    action: action.toUpperCase(),
    resource_type: resource_type.toLowerCase(),
    resource_id: resource_id || '',
    ip_address: ip_address || '',
    user_agent: user_agent || '',
    timestamp: new Date().toISOString(),
  };

  const auditLog = await pb.collection('audit_logs').create(auditLogData);

  logger.info(`Audit log created: ${auditLog.id} - ${action} on ${resource_type}`);

  res.status(201).json({
    success: true,
    log_id: auditLog.id,
  });
});

/**
 * GET /audit-logs
 * Fetch audit logs (admin only)
 */
router.get('/', pocketbaseAuth, async (req, res) => {
  const { user_id, action, start_date, end_date, limit } = req.query;

  // Verify admin role
  const authUser = await pb.collection('users').getOne(req.pocketbaseUserId);
  if (authUser.role !== 'admin') {
    throw new Error('Unauthorized: admin role required');
  }

  // Validate limit
  let pageLimit = parseInt(limit) || 100;
  if (pageLimit > 1000) pageLimit = 1000;
  if (pageLimit < 1) pageLimit = 1;

  // Build filter
  const filters = [];

  if (user_id) {
    filters.push(`user_id = "${user_id}"`);
  }

  if (action) {
    filters.push(`action = "${action.toUpperCase()}"`);
  }

  if (start_date) {
    filters.push(`timestamp >= "${start_date}"`);
  }

  if (end_date) {
    filters.push(`timestamp <= "${end_date}"`);
  }

  const filter = filters.length > 0 ? filters.join(' && ') : '';

  // Fetch audit logs with pagination
  const auditLogs = await pb.collection('audit_logs').getList(1, pageLimit, {
    filter: filter || undefined,
    sort: '-timestamp',
  });

  logger.info(`Fetched ${auditLogs.items.length} audit logs`);

  res.json({
    items: auditLogs.items,
    page: auditLogs.page,
    perPage: auditLogs.perPage,
    totalItems: auditLogs.totalItems,
    totalPages: auditLogs.totalPages,
  });
});

export default router;