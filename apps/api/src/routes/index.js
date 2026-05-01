import { Router } from 'express';
import healthCheck from './health-check.js';
import integratedAiRouter from './integrated-ai.js';
import authRouter from './auth.js';
import healthRouter from './health.js';
import appointmentsRouter from './appointments.js';
import telemedicineRouter from './telemedicine.js';
import pharmaciesRouter from './pharmacies.js';
import prescriptionsRouter from './prescriptions.js';
import refillsRouter from './refills.js';
import providerRouter from './provider.js';
import recommendationsRouter from './recommendations.js';
import healthGoalsRouter from './health-goals.js';
import aiRecommendationsRouter from './ai-recommendations.js';
import dataExportRouter from './data-export.js';
import onboardingRouter from './onboarding.js';
import auditRouter from './audit.js';
import adminAuthRouter from './admin-auth.js';
import adminUsersRouter from './admin-users.js';
import adminTransactionsRouter from './admin-transactions.js';
import adminSubscriptionsRouter from './admin-subscriptions.js';
import adminProvidersRouter from './admin-providers.js';
import adminFormsRouter from './admin-forms.js';
import adminAiRouter from './admin-ai.js';
import adminSettingsRouter from './admin-settings.js';
import analyticsRouter from './analytics.js';
import formsRouter from './forms.js';
import knowledgeBaseRouter from './knowledge-base.js';
import { checkAuth } from '../middleware/rbac.js';

export default () => {
  const router = Router();

  // Health check endpoint
  router.get('/health', healthCheck);

  // Authentication routes
  router.use('/auth', authRouter);

  router.use('/admin/auth', adminAuthRouter);

  // Integrated AI chat system
  router.use('/integrated-ai', integratedAiRouter);

  // Onboarding flow
  router.use('/onboarding', onboardingRouter);

  // Health management routes
  router.use('/health', healthRouter);

  // Appointment management
  router.use('/appointments', appointmentsRouter);

  // Telemedicine sessions
  router.use('/telemedicine', telemedicineRouter);

  // Pharmacy search and management
  router.use('/pharmacies', pharmaciesRouter);

  // Prescription management
  router.use('/prescriptions', prescriptionsRouter);

  // Refill status tracking
  router.use('/refill-status', refillsRouter);

  // Provider management
  router.use('/provider', providerRouter);

  // Health recommendations (legacy)
  router.use('/recommendations', recommendationsRouter);

  // AI-powered recommendations
  router.use('/ai-recommendations', aiRecommendationsRouter);

  // Health goals tracking
  router.use('/health-goals', healthGoalsRouter);

  // Data export
  router.use('/data', dataExportRouter);

  // Audit logging
  router.use('/audit-logs', auditRouter);

  router.use('/forms', formsRouter);
  router.use('/knowledge-base', knowledgeBaseRouter);
  router.use('/analytics', analyticsRouter);

  router.use('/admin/users', checkAuth, adminUsersRouter);
  router.use('/admin/transactions', checkAuth, adminTransactionsRouter);
  router.use('/admin/subscriptions', checkAuth, adminSubscriptionsRouter);
  router.use('/admin/providers', checkAuth, adminProvidersRouter);
  router.use('/admin/forms', checkAuth, adminFormsRouter);
  router.use('/admin/ai', checkAuth, adminAiRouter);
  router.use('/admin/settings', checkAuth, adminSettingsRouter);

  return router;
};