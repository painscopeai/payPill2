import { Router } from 'express';
import logger from '../utils/logger.js';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';

const router = Router();

const sb = () => getSupabaseAdmin();

async function fetchTable(table) {
	try {
		const { data, error } = await sb().from(table).select('*').limit(5000);
		if (error) throw error;
		return (data || []).map((r) => ({ ...r, created: r.created_at || r.created }));
	} catch (e) {
		logger.warn(`[analytics] ${table}: ${e.message}`);
		return [];
	}
}

async function fetchProfilesByRole(role) {
	try {
		const { data, error } = await sb().from('profiles').select('*').eq('role', role).limit(5000);
		if (error) throw error;
		return (data || []).map((r) => ({
			...r,
			created: r.created_at || r.created,
			status: r.status || 'active',
			gender: r.gender,
			company_name: r.company_name || r.name,
		}));
	} catch (e) {
		logger.warn(`[analytics] profiles/${role}: ${e.message}`);
		return [];
	}
}

/**
 * Helper: Parse date range from query parameters
 */
function parseDateRange(startDate, endDate) {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * Helper: Generate 12-month trend data
 */
function generate12MonthTrend(data, dateField = 'created') {
  const trends = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const monthData = data.filter((item) => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= monthStart && itemDate <= monthEnd;
    });

    trends.push({
      month: monthStart.toISOString().slice(0, 7),
      count: monthData.length,
      value: monthData.length,
    });
  }

  return trends;
}

/**
 * Helper: Calculate percentage
 */
function calculatePercentage(numerator, denominator) {
  if (denominator === 0) return 0;
  return parseFloat(((numerator / denominator) * 100).toFixed(2));
}

/**
 * GET /analytics/patients
 * Patient analytics dashboard
 */
router.get('/patients', async (req, res) => {
  const { startDate, endDate } = req.query;
  const { start, end } = parseDateRange(startDate, endDate);

  logger.info('[analytics] Fetching patient analytics');

  // Fetch all patients
  const patients = await fetchProfilesByRole('individual');

  // Filter by date range
  const patientsInRange = patients.filter((p) => {
    const createdDate = new Date(p.created);
    return createdDate >= start && createdDate <= end;
  });

  // Calculate KPIs
  const totalPatients = patients.length;
  const activePatients = patients.filter((p) => p.status === 'active').length;
  const newThisMonth = patients.filter((p) => {
    const createdDate = new Date(p.created);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdDate >= thirtyDaysAgo;
  }).length;

  // Calculate churn rate (inactive patients / total)
  const inactivePatients = patients.filter((p) => p.status !== 'active').length;
  const churnRate = calculatePercentage(inactivePatients, totalPatients);

  // Fetch appointments for retention analysis
  const appointments = await fetchTable('appointments');
  const patientsWithAppointments = new Set(appointments.map((a) => a.user_id)).size;
  const retentionRate = calculatePercentage(patientsWithAppointments, totalPatients);

  // Demographics breakdown
  const genderBreakdown = {};
  patients.forEach((p) => {
    const gender = p.gender || 'Unknown';
    genderBreakdown[gender] = (genderBreakdown[gender] || 0) + 1;
  });

  // Age distribution
  const ageGroups = { '18-30': 0, '31-45': 0, '46-60': 0, '60+': 0 };
  patients.forEach((p) => {
    if (p.date_of_birth) {
      const age = new Date().getFullYear() - new Date(p.date_of_birth).getFullYear();
      if (age <= 30) ageGroups['18-30']++;
      else if (age <= 45) ageGroups['31-45']++;
      else if (age <= 60) ageGroups['46-60']++;
      else ageGroups['60+']++;
    }
  });

  // Appointment patterns
  const appointmentsByType = {};
  appointments.forEach((a) => {
    if (patients.some((p) => p.id === a.user_id)) {
      appointmentsByType[a.type || 'unknown'] = (appointmentsByType[a.type || 'unknown'] || 0) + 1;
    }
  });

  // Form completion rates
  const formResponses = await fetchTable('form_responses');
  const patientFormResponses = formResponses.filter((f) => patients.some((p) => p.id === f.user_id));
  const formCompletionRate = calculatePercentage(patientFormResponses.length, patients.length);

  // AI usage
  const aiLogs = await fetchTable('ai_logs');
  const patientAiUsage = aiLogs.filter((log) => patients.some((p) => p.id === log.user_id)).length;
  const aiAdoptionRate = calculatePercentage(patientAiUsage, totalPatients);

  // Top conditions
  const conditions = {};
  const healthProfiles = await fetchTable('patients');
  healthProfiles.forEach((hp) => {
    if (hp.conditions && Array.isArray(hp.conditions)) {
      hp.conditions.forEach((c) => {
        conditions[c] = (conditions[c] || 0) + 1;
      });
    }
  });
  const topConditions = Object.entries(conditions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Satisfaction scores (mock data)
  const avgSatisfaction = 4.2;

  logger.info('[analytics] Patient analytics calculated');

  res.json({
    kpis: {
      total_patients: totalPatients,
      active_patients: activePatients,
      new_this_month: newThisMonth,
      churn_rate: churnRate,
      retention_rate: retentionRate,
      form_completion_rate: formCompletionRate,
      ai_adoption_rate: aiAdoptionRate,
      avg_satisfaction_score: avgSatisfaction,
    },
    trends: generate12MonthTrend(patientsInRange),
    breakdown: {
      by_gender: genderBreakdown,
      by_age_group: ageGroups,
      by_appointment_type: appointmentsByType,
      top_conditions: topConditions,
    },
  });
});

/**
 * GET /analytics/employers
 * Employer analytics dashboard
 */
router.get('/employers', async (req, res) => {
  const { startDate, endDate } = req.query;
  const { start, end } = parseDateRange(startDate, endDate);

  logger.info('[analytics] Fetching employer analytics');

  // Fetch all employers
  const employers = await fetchProfilesByRole('employer');

  // Filter by date range
  const employersInRange = employers.filter((e) => {
    const createdDate = new Date(e.created);
    return createdDate >= start && createdDate <= end;
  });

  // Calculate KPIs
  const totalEmployers = employers.length;
  const activeEmployers = employers.filter((e) => e.status === 'active').length;

  // Total employees (mock calculation)
  const totalEmployees = employers.reduce((sum, e) => sum + (e.employee_count || 0), 0);

  // MRR from employers (mock calculation)
  const subscriptions = await fetchTable('subscriptions');
  const employerSubscriptions = subscriptions.filter((s) => employers.some((e) => e.id === s.user_id));
  const mrrFromEmployers = employerSubscriptions.reduce((sum, s) => sum + (s.monthly_amount || 0), 0);

  // Employee engagement (appointments per employee)
  const appointments = await fetchTable('appointments');
  const employerAppointments = appointments.filter((a) => employers.some((e) => e.id === a.user_id));
  const avgEngagement = totalEmployees > 0 ? (employerAppointments.length / totalEmployees).toFixed(2) : 0;

  // Subscription status breakdown
  const subscriptionStatus = {};
  employerSubscriptions.forEach((s) => {
    subscriptionStatus[s.status || 'unknown'] = (subscriptionStatus[s.status || 'unknown'] || 0) + 1;
  });

  // Form completion
  const formResponses = await fetchTable('form_responses');
  const employerFormResponses = formResponses.filter((f) => employers.some((e) => e.id === f.user_id));
  const formCompletionRate = calculatePercentage(employerFormResponses.length, employers.length);

  // Top employers by employee count
  const topEmployers = employers
    .sort((a, b) => (b.employee_count || 0) - (a.employee_count || 0))
    .slice(0, 5)
    .map((e) => ({
      name: e.company_name || e.email,
      employee_count: e.employee_count || 0,
      status: e.status,
    }));

  logger.info('[analytics] Employer analytics calculated');

  res.json({
    kpis: {
      total_employers: totalEmployers,
      active_employers: activeEmployers,
      total_employees: totalEmployees,
      mrr_from_employers: parseFloat(mrrFromEmployers.toFixed(2)),
      avg_employee_engagement: parseFloat(avgEngagement),
      form_completion_rate: formCompletionRate,
    },
    trends: generate12MonthTrend(employersInRange),
    breakdown: {
      by_subscription_status: subscriptionStatus,
      top_employers: topEmployers,
    },
  });
});

/**
 * GET /analytics/insurance
 * Insurance partner analytics dashboard
 */
router.get('/insurance', async (req, res) => {
  const { startDate, endDate } = req.query;
  const { start, end } = parseDateRange(startDate, endDate);

  logger.info('[analytics] Fetching insurance analytics');

  // Fetch all insurance companies
  const insuranceCompanies = await fetchProfilesByRole('insurance');

  // Filter by date range
  const insuranceInRange = insuranceCompanies.filter((i) => {
    const createdDate = new Date(i.created);
    return createdDate >= start && createdDate <= end;
  });

  // Calculate KPIs
  const totalPartners = insuranceCompanies.length;
  const activePartners = insuranceCompanies.filter((i) => i.status === 'active').length;

  // Fetch claims
  const claims = await fetchTable('claims');
  const claimsInRange = claims.filter((c) => {
    const createdDate = new Date(c.created);
    return createdDate >= start && createdDate <= end;
  });
  const totalClaims = claimsInRange.length;

  // Approval rate
  const approvedClaims = claimsInRange.filter((c) => c.status === 'approved').length;
  const approvalRate = calculatePercentage(approvedClaims, totalClaims);

  // Claims by category
  const claimsByCategory = {};
  claimsInRange.forEach((c) => {
    const category = c.claim_type || 'unknown';
    claimsByCategory[category] = (claimsByCategory[category] || 0) + 1;
  });

  // Processing time (mock calculation)
  const avgProcessingTime = 3.5; // days

  // Top partners by claims
  const claimsByPartner = {};
  claimsInRange.forEach((c) => {
    const partnerId = c.insurance_company_id || 'unknown';
    claimsByPartner[partnerId] = (claimsByPartner[partnerId] || 0) + 1;
  });
  const topPartners = Object.entries(claimsByPartner)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const partner = insuranceCompanies.find((i) => i.id === id);
      return {
        name: partner?.company_name || id,
        claims_processed: count,
      };
    });

  logger.info('[analytics] Insurance analytics calculated');

  res.json({
    kpis: {
      total_partners: totalPartners,
      active_partners: activePartners,
      total_claims: totalClaims,
      approval_rate: approvalRate,
      avg_processing_time_days: avgProcessingTime,
    },
    trends: generate12MonthTrend(claimsInRange),
    breakdown: {
      by_claim_category: claimsByCategory,
      top_partners: topPartners,
    },
  });
});

/**
 * GET /analytics/providers
 * Healthcare provider analytics dashboard
 */
router.get('/providers', async (req, res) => {
  const { startDate, endDate } = req.query;
  const { start, end } = parseDateRange(startDate, endDate);

  logger.info('[analytics] Fetching provider analytics');

  // Fetch all providers
  const providers = await fetchTable('providers');

  // Filter by date range
  const providersInRange = providers.filter((p) => {
    const createdDate = new Date(p.created);
    return createdDate >= start && createdDate <= end;
  });

  // Calculate KPIs
  const totalProviders = providers.length;
  const activeProviders = providers.filter((p) => p.status === 'active').length;

  // Fetch appointments
  const appointments = await fetchTable('appointments');
  const appointmentsInRange = appointments.filter((a) => {
    const createdDate = new Date(a.created);
    return createdDate >= start && createdDate <= end;
  });
  const totalAppointments = appointmentsInRange.length;

  // Average rating (mock data)
  const avgRating = 4.6;

  // Appointments per provider
  const appointmentsByProvider = {};
  appointmentsInRange.forEach((a) => {
    const providerId = a.provider_id || 'unknown';
    appointmentsByProvider[providerId] = (appointmentsByProvider[providerId] || 0) + 1;
  });
  const avgAppointmentsPerProvider = totalProviders > 0 ? (totalAppointments / totalProviders).toFixed(2) : 0;

  // Specialties breakdown
  const specialties = {};
  providers.forEach((p) => {
    const specialty = p.specialty || 'General';
    specialties[specialty] = (specialties[specialty] || 0) + 1;
  });

  // Completion rate (appointments completed / total)
  const completedAppointments = appointmentsInRange.filter((a) => a.status === 'completed').length;
  const completionRate = calculatePercentage(completedAppointments, totalAppointments);

  // Top providers by appointments
  const topProviders = Object.entries(appointmentsByProvider)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const provider = providers.find((p) => p.id === id);
      return {
        name: provider?.provider_name || id,
        appointments: count,
        specialty: provider?.specialty || 'Unknown',
      };
    });

  logger.info('[analytics] Provider analytics calculated');

  res.json({
    kpis: {
      total_providers: totalProviders,
      active_providers: activeProviders,
      total_appointments: totalAppointments,
      avg_rating: avgRating,
      avg_appointments_per_provider: parseFloat(avgAppointmentsPerProvider),
      completion_rate: completionRate,
    },
    trends: generate12MonthTrend(appointmentsInRange),
    breakdown: {
      by_specialty: specialties,
      top_providers: topProviders,
    },
  });
});

/**
 * GET /analytics/subscriptions
 * Subscription analytics dashboard
 */
router.get('/subscriptions', async (req, res) => {
  const { startDate, endDate } = req.query;
  const { start, end } = parseDateRange(startDate, endDate);

  logger.info('[analytics] Fetching subscription analytics');

  // Fetch all subscriptions
  const subscriptions = await fetchTable('subscriptions');

  // Filter by date range
  const subscriptionsInRange = subscriptions.filter((s) => {
    const createdDate = new Date(s.created);
    return createdDate >= start && createdDate <= end;
  });

  // Calculate KPIs
  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active').length;

  // MRR calculation (assuming monthly_amount field)
  const mrr = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + (s.monthly_amount || 0), 0);

  // ARR calculation
  const arr = mrr * 12;

  // Churn rate (cancelled subscriptions in period / total at start of period)
  const cancelledInPeriod = subscriptionsInRange.filter((s) => s.status === 'cancelled').length;
  const churnRate = calculatePercentage(cancelledInPeriod, activeSubscriptions || 1);

  // LTV calculation (average revenue per subscription * average lifetime in months)
  const avgMonthlyRevenue = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;
  const avgLifetimeMonths = 24; // assumption
  const ltv = parseFloat((avgMonthlyRevenue * avgLifetimeMonths).toFixed(2));

  // Status breakdown
  const statusBreakdown = {};
  subscriptions.forEach((s) => {
    statusBreakdown[s.status || 'unknown'] = (statusBreakdown[s.status || 'unknown'] || 0) + 1;
  });

  // Subscriptions by plan
  const byPlan = {};
  subscriptions.forEach((s) => {
    const plan = s.plan_id || 'unknown';
    byPlan[plan] = (byPlan[plan] || 0) + 1;
  });

  // LTV distribution (mock)
  const ltvDistribution = {
    'Under $500': 0,
    '$500-$1000': 0,
    '$1000-$2000': 0,
    'Over $2000': 0,
  };

  logger.info('[analytics] Subscription analytics calculated');

  res.json({
    kpis: {
      active_subscriptions: activeSubscriptions,
      mrr: parseFloat(mrr.toFixed(2)),
      arr: parseFloat(arr.toFixed(2)),
      churn_rate: churnRate,
      ltv: ltv,
    },
    trends: generate12MonthTrend(subscriptionsInRange),
    breakdown: {
      by_status: statusBreakdown,
      by_plan: byPlan,
      ltv_distribution: ltvDistribution,
    },
  });
});

/**
 * GET /analytics/financial
 * Financial analytics dashboard
 */
router.get('/financial', async (req, res) => {
  const { startDate, endDate } = req.query;
  const { start, end } = parseDateRange(startDate, endDate);

  logger.info('[analytics] Fetching financial analytics');

  // Fetch all transactions
  const transactions = (await fetchTable('transactions')).map((t) => ({
		...t,
		type: t.transaction_type || t.type,
		created: t.created_at || t.created,
	}));

  // Filter by date range
  const transactionsInRange = transactions.filter((t) => {
    const createdDate = new Date(t.created);
    return createdDate >= start && createdDate <= end;
  });

  // Calculate KPIs
  const totalRevenue = transactionsInRange
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // MRR (monthly recurring revenue from subscriptions)
  const subscriptions = await fetchTable('subscriptions');
  const mrr = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + (s.monthly_amount || 0), 0);

  const transactionCount = transactionsInRange.length;
  const refundedTransactions = transactionsInRange.filter((t) => t.status === 'refunded').length;
  const refundRate = calculatePercentage(refundedTransactions, transactionCount);

  // Revenue by source
  const revenueBySource = {};
  transactionsInRange.forEach((t) => {
    const source = t.type || 'unknown';
    revenueBySource[source] = (revenueBySource[source] || 0) + (t.amount || 0);
  });

  // Payment methods
  const paymentMethods = {};
  transactionsInRange.forEach((t) => {
    const method = t.payment_method || 'unknown';
    paymentMethods[method] = (paymentMethods[method] || 0) + 1;
  });

  // Average transaction value
  const avgTransactionValue = transactionCount > 0 ? (totalRevenue / transactionCount).toFixed(2) : 0;

  // Revenue by user type
  const users = await fetchProfilesByRole('individual')
		.concat(await fetchProfilesByRole('employer'))
		.concat(await fetchProfilesByRole('insurance'))
		.concat(await fetchProfilesByRole('provider'));
  const revenueByUserType = {};
  transactionsInRange.forEach((t) => {
    const user = users.find((u) => u.id === t.user_id);
    const userType = user?.role || 'unknown';
    revenueByUserType[userType] = (revenueByUserType[userType] || 0) + (t.amount || 0);
  });

  logger.info('[analytics] Financial analytics calculated');

  res.json({
    kpis: {
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      mrr: parseFloat(mrr.toFixed(2)),
      transaction_count: transactionCount,
      refund_rate: refundRate,
      avg_transaction_value: parseFloat(avgTransactionValue),
    },
    trends: generate12MonthTrend(transactionsInRange),
    breakdown: {
      by_source: Object.fromEntries(
        Object.entries(revenueBySource).map(([k, v]) => [k, parseFloat(v.toFixed(2))])
      ),
      by_payment_method: paymentMethods,
      by_user_type: Object.fromEntries(
        Object.entries(revenueByUserType).map(([k, v]) => [k, parseFloat(v.toFixed(2))])
      ),
    },
  });
});

/**
 * GET /analytics/ai
 * AI usage analytics dashboard
 */
router.get('/ai', async (req, res) => {
  const { startDate, endDate } = req.query;
  const { start, end } = parseDateRange(startDate, endDate);

  logger.info('[analytics] Fetching AI analytics');

  // Fetch all AI logs
  const aiLogs = await fetchTable('ai_logs');

  // Filter by date range
  const aiLogsInRange = aiLogs.filter((log) => {
    const createdDate = new Date(log.created);
    return createdDate >= start && createdDate <= end;
  });

  // Calculate KPIs
  const totalRequests = aiLogsInRange.length;
  const successfulRequests = aiLogsInRange.filter((log) => log.status === 'success').length;
  const successRate = calculatePercentage(successfulRequests, totalRequests);

  // Average processing time
  const avgProcessingTime =
    totalRequests > 0
      ? (aiLogsInRange.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / totalRequests).toFixed(2)
      : 0;

  // Total cost (mock calculation)
  const totalCost = (totalRequests * 0.001).toFixed(4); // $0.001 per request

  // Model usage
  const modelUsage = {};
  aiLogsInRange.forEach((log) => {
    const model = log.model || 'unknown';
    modelUsage[model] = (modelUsage[model] || 0) + 1;
  });

  // Error rate by model
  const errorsByModel = {};
  aiLogsInRange.filter((log) => log.status === 'failed').forEach((log) => {
    const model = log.model || 'unknown';
    errorsByModel[model] = (errorsByModel[model] || 0) + 1;
  });

  // Common errors
  const commonErrors = {};
  aiLogsInRange.filter((log) => log.error_message).forEach((log) => {
    const error = log.error_message || 'unknown';
    commonErrors[error] = (commonErrors[error] || 0) + 1;
  });
  const topErrors = Object.entries(commonErrors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([error, count]) => ({ error, count }));

  // Token usage (mock)
  const totalTokens = totalRequests * 500; // average 500 tokens per request

  logger.info('[analytics] AI analytics calculated');

  res.json({
    kpis: {
      total_requests: totalRequests,
      success_rate: successRate,
      avg_processing_time_ms: parseFloat(avgProcessingTime),
      total_cost: parseFloat(totalCost),
      total_tokens: totalTokens,
    },
    trends: generate12MonthTrend(aiLogsInRange),
    breakdown: {
      by_model: modelUsage,
      error_rate_by_model: errorsByModel,
      top_errors: topErrors,
    },
  });
});

/**
 * GET /analytics/forms
 * Form analytics dashboard
 */
router.get('/forms', async (req, res) => {
  const { startDate, endDate } = req.query;
  const { start, end } = parseDateRange(startDate, endDate);

  logger.info('[analytics] Fetching form analytics');

  // Fetch all form responses
  const formResponses = await fetchTable('form_responses');

  // Filter by date range
  const responsesInRange = formResponses.filter((r) => {
    const createdDate = new Date(r.created);
    return createdDate >= start && createdDate <= end;
  });

  // Fetch all forms
  const forms = await fetchTable('forms');

  // Calculate KPIs
  const totalResponses = responsesInRange.length;
  const completedResponses = responsesInRange.filter((r) => r.completed === true).length;
  const completionRate = calculatePercentage(completedResponses, totalResponses);

  // Average completion time
  const avgCompletionTime =
    completedResponses > 0
      ? (responsesInRange
          .filter((r) => r.completed)
          .reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) / completedResponses / 60).toFixed(2)
      : 0;

  // Abandonment rate
  const abandonedResponses = responsesInRange.filter((r) => r.completed === false).length;
  const abandonmentRate = calculatePercentage(abandonedResponses, totalResponses);

  // Responses by form
  const responsesByForm = {};
  responsesInRange.forEach((r) => {
    const formId = r.form_id || 'unknown';
    responsesByForm[formId] = (responsesByForm[formId] || 0) + 1;
  });

  // Most completed forms
  const completedByForm = {};
  responsesInRange.filter((r) => r.completed).forEach((r) => {
    const formId = r.form_id || 'unknown';
    completedByForm[formId] = (completedByForm[formId] || 0) + 1;
  });
  const mostCompletedForms = Object.entries(completedByForm)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([formId, count]) => {
      const form = forms.find((f) => f.id === formId);
      return {
        form_name: form?.title || formId,
        completions: count,
      };
    });

  // Average score by form (mock)
  const avgScoreByForm = {};
  forms.forEach((f) => {
    avgScoreByForm[f.title || f.id] = (Math.random() * 2 + 3).toFixed(1); // 3-5 range
  });

  logger.info('[analytics] Form analytics calculated');

  res.json({
    kpis: {
      total_responses: totalResponses,
      completion_rate: completionRate,
      avg_completion_time_minutes: parseFloat(avgCompletionTime),
      abandonment_rate: abandonmentRate,
    },
    trends: generate12MonthTrend(responsesInRange),
    breakdown: {
      by_form: responsesByForm,
      most_completed_forms: mostCompletedForms,
      avg_score_by_form: avgScoreByForm,
    },
  });
});

export default router;