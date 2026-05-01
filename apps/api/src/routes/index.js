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

export default () => {
  const router = Router();

  // Health check endpoint
  router.get('/health', healthCheck);

  // Authentication routes
  router.use('/auth', authRouter);

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

  return router;
};