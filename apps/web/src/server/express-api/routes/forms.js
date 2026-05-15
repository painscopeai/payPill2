import { App } from '@tinyhttp/app';
import { getSupabaseAdmin } from '../utils/supabaseAdmin.js';
import logger from '../utils/logger.js';
import { supabaseBearerUser } from '../middleware/supabase-bearer-user.js';

const router = new App();
const svc = () => getSupabaseAdmin();

// Valid form types
const VALID_FORM_TYPES = [
	'patient_onboarding',
	'health_assessment',
	'employer_assessment',
	'insurance_assessment',
	'condition_specific',
	'provider_application',
	'custom',
	'consent',
	'service_intake',
];

/**
 * POST /forms
 * Create a new form
 */
router.post('/', supabaseBearerUser, async (req, res) => {
  const { name, form_type, description, category, settings } = req.body;

  logger.info('[forms] POST / - Creating new form');
  logger.debug(`[forms] Request body: ${JSON.stringify(req.body)}`);

  // Validate authentication
  if (!req.supabaseUserId) {
    logger.error('[forms] POST / - Authentication failed: user not authenticated');
    return res.status(401).json({
      error: 'Unauthorized: user not authenticated',
    });
  }

  const createdBy = req.supabaseUserId;
  logger.debug(`[forms] POST / - Authenticated user: ${createdBy}`);

  // Validate required fields
  if (!name) {
    logger.warn('[forms] POST / - Missing required field: name');
    return res.status(400).json({
      error: 'Missing required field: name',
    });
  }

  if (!form_type) {
    logger.warn('[forms] POST / - Missing required field: form_type');
    return res.status(400).json({
      error: 'Missing required field: form_type',
    });
  }

  // Validate form_type is one of the allowed values
  if (!VALID_FORM_TYPES.includes(form_type)) {
    logger.warn(`[forms] POST / - Invalid form_type: ${form_type}`);
    return res.status(400).json({
      error: `Invalid form_type: must be one of [${VALID_FORM_TYPES.join(', ')}]`,
    });
  }

  // Validate name is a string
  if (typeof name !== 'string' || name.trim().length === 0) {
    logger.warn('[forms] POST / - Invalid name: must be a non-empty string');
    return res.status(400).json({
      error: 'Invalid name: must be a non-empty string',
    });
  }

  // Validate form_type is a string
  if (typeof form_type !== 'string') {
    logger.warn('[forms] POST / - Invalid form_type: must be a string');
    return res.status(400).json({
      error: 'Invalid form_type: must be a string',
    });
  }

  // Create form record
  const formData = {
    name: name.trim(),
    form_type,
    description: description || '',
    created_by: createdBy,
    status: 'draft',
    created_at: new Date().toISOString(),
  };
  if (category !== undefined && category !== null) {
    formData.category = typeof category === 'string' ? category : String(category);
  }
  if (settings !== undefined && typeof settings === 'object' && settings !== null && !Array.isArray(settings)) {
    formData.settings = settings;
  }

  logger.debug(`[forms] POST / - Form data to create: ${JSON.stringify(formData)}`);

  try {
    const { data: form, error: formErr } = await svc().from('forms').insert(formData).select().single();
    if (formErr) throw formErr;
    logger.info(`[forms] POST / - Form created successfully: ${form.id}`);

    res.status(200).json({
      id: form.id,
      name: form.name,
      form_type: form.form_type,
      description: form.description,
      status: form.status,
      created_by: form.created_by,
      created_at: form.created_at,
    });
  } catch (error) {
    logger.error(`[forms] POST / - Error creating form: ${error.message}`);
    logger.error(`[forms] POST / - Error details: ${JSON.stringify(error)}`);
    throw new Error(`Failed to create form: ${error.message}`);
  }
});

/**
 * GET /forms
 * List all forms with pagination and filtering
 */
router.get('/', supabaseBearerUser, async (req, res) => {
  const { page, limit, status, form_type } = req.query;

  logger.info('[forms] GET / - Fetching forms');
  logger.debug(`[forms] GET / - Query params: page=${page}, limit=${limit}, status=${status}, form_type=${form_type}`);

  // Validate authentication
  if (!req.supabaseUserId) {
    logger.error('[forms] GET / - Authentication failed: user not authenticated');
    return res.status(401).json({
      error: 'Unauthorized: user not authenticated',
    });
  }

  // Parse and validate pagination parameters
  let pageNum = parseInt(page) || 1;
  let pageLimit = parseInt(limit) || 50;

  // Validate page is a positive number
  if (isNaN(pageNum) || pageNum < 1) {
    logger.warn(`[forms] GET / - Invalid page: ${page}`);
    return res.status(400).json({
      error: 'Invalid page: must be a positive number',
    });
  }

  // Validate limit is between 1 and 100
  if (isNaN(pageLimit) || pageLimit < 1 || pageLimit > 100) {
    logger.warn(`[forms] GET / - Invalid limit: ${limit}`);
    return res.status(400).json({
      error: 'Invalid limit: must be between 1 and 100',
    });
  }

  logger.debug(`[forms] GET / - Parsed pagination: pageNum=${pageNum}, pageLimit=${pageLimit}`);

  // Build filters
  const filters = [];

  if (status) {
    if (typeof status !== 'string') {
      logger.warn(`[forms] GET / - Invalid status: must be a string`);
      return res.status(400).json({
        error: 'Invalid status: must be a string',
      });
    }
    filters.push(`status = "${status}"`);
    logger.debug(`[forms] GET / - Added status filter: ${status}`);
  }

  if (form_type) {
    if (!VALID_FORM_TYPES.includes(form_type)) {
      logger.warn(`[forms] GET / - Invalid form_type: ${form_type}`);
      return res.status(400).json({
        error: `Invalid form_type: must be one of [${VALID_FORM_TYPES.join(', ')}]`,
      });
    }
    filters.push(`form_type = "${form_type}"`);
    logger.debug(`[forms] GET / - Added form_type filter: ${form_type}`);
  }

  const filter = filters.length > 0 ? filters.join(' && ') : '';

  logger.debug(`[forms] GET / - Filter string: "${filter}"`);

  try {
    const from = (pageNum - 1) * pageLimit;
    const to = from + pageLimit - 1;
    let fq = svc().from('forms').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
    if (status) fq = fq.eq('status', status);
    if (form_type) fq = fq.eq('form_type', form_type);
    if (req.profileRole !== 'admin') fq = fq.eq('created_by', req.supabaseUserId);
    const { data: formRows, error: listErr, count } = await fq;
    if (listErr) throw listErr;
    const total = count ?? 0;
    const forms = {
      items: formRows || [],
      page: pageNum,
      perPage: pageLimit,
      totalItems: total,
      totalPages: Math.max(1, Math.ceil(total / pageLimit)),
    };

    logger.info(`[forms] GET / - Successfully fetched ${forms.items.length} forms (page ${pageNum})`);

    res.status(200).json({
      items: forms.items,
      page: forms.page,
      perPage: forms.perPage,
      totalItems: forms.totalItems,
      totalPages: forms.totalPages,
    });
  } catch (error) {
    logger.error(`[forms] GET / - Error fetching forms: ${error.message}`);
    logger.error(`[forms] GET / - Error details: ${JSON.stringify(error)}`);
    throw new Error(`Failed to fetch forms: ${error.message}`);
  }
});

/**
 * GET /forms/:formId
 * Retrieve single form with all questions
 */
router.get('/:formId', supabaseBearerUser, async (req, res) => {
  const { formId } = req.params;

  logger.info(`[forms] GET /:formId - Fetching form: ${formId}`);

  try {
    // Fetch form
    const { data: form, error: formGetErr } = await svc().from('forms').select('*').eq('id', formId).maybeSingle();
    if (formGetErr) throw formGetErr;
    if (!form) throw new Error('Form not found');

    // Fetch related questions ordered by order field
    const { data: questions, error: qErr } = await svc().from('form_questions').select('*').eq('form_id', formId).order('sort_order', { ascending: true });
    if (qErr) throw qErr;

    logger.info(`[forms] GET /:formId - Fetched form ${formId} with ${questions.length} questions`);

    res.json({
      ...form,
      questions,
    });
  } catch (error) {
    logger.error(`[forms] GET /:formId - Error fetching form ${formId}: ${error.message}`);
    throw new Error(`Failed to fetch form: ${error.message}`);
  }
});

/**
 * PUT /forms/:formId
 * Update form details
 */
router.put('/:formId', supabaseBearerUser, async (req, res) => {
  const { formId } = req.params;
  const { name, description, form_type, status, category, settings } = req.body;

  logger.info(`[forms] PUT /:formId - Updating form: ${formId}`);

  const updateData = {};

  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (form_type) {
    if (!VALID_FORM_TYPES.includes(form_type)) {
      logger.warn(`[forms] PUT /:formId - Invalid form_type: ${form_type}`);
      return res.status(400).json({
        error: `Invalid form_type: must be one of [${VALID_FORM_TYPES.join(', ')}]`,
      });
    }
    updateData.form_type = form_type;
  }
  if (status) updateData.status = status;
  if (category !== undefined) updateData.category = category;
  if (settings !== undefined && typeof settings === 'object' && settings !== null && !Array.isArray(settings)) {
    updateData.settings = settings;
  }

  if (Object.keys(updateData).length === 0) {
    logger.warn(`[forms] PUT /:formId - No fields to update for form ${formId}`);
    return res.status(400).json({
      error: 'No fields to update',
    });
  }

  updateData.updated_at = new Date().toISOString();

  try {
    const { data: updatedForm, error: updFormErr } = await svc().from('forms').update(updateData).eq('id', formId).select().single();
    if (updFormErr) throw updFormErr;
    logger.info(`[forms] PUT /:formId - Form ${formId} updated successfully`);
    res.json(updatedForm);
  } catch (error) {
    logger.error(`[forms] PUT /:formId - Error updating form ${formId}: ${error.message}`);
    throw new Error(`Failed to update form: ${error.message}`);
  }
});

/**
 * DELETE /forms/:formId
 * Delete form and all related questions/responses
 */
router.delete('/:formId', supabaseBearerUser, async (req, res) => {
  const { formId } = req.params;

  logger.info(`[forms] DELETE /:formId - Deleting form: ${formId}`);

  try {
    // Fetch all questions for this form
    const { data: questions, error: qListErr } = await svc().from('form_questions').select('*').eq('form_id', formId);
    if (qListErr) throw qListErr;

    // Delete all questions
    for (const question of questions) {
      await svc().from('form_questions').delete().eq('id', question.id);
    }

    const { data: responses, error: respListErr } = await svc().from('form_responses').select('*').eq('form_id', formId);
    if (respListErr) throw respListErr;

    // Delete all responses
    for (const response of responses || []) {
      await svc().from('form_responses').delete().eq('id', response.id);
    }

    // Delete form
    await svc().from('forms').delete().eq('id', formId);

    logger.info(`[forms] DELETE /:formId - Form ${formId} deleted (${(questions || []).length} questions, ${(responses || []).length} responses)`);

    res.json({
      success: true,
      message: 'Form deleted successfully',
      deleted_questions: (questions || []).length,
      deleted_responses: (responses || []).length,
    });
  } catch (error) {
    logger.error(`[forms] DELETE /:formId - Error deleting form ${formId}: ${error.message}`);
    throw new Error(`Failed to delete form: ${error.message}`);
  }
});

/**
 * POST /forms/:formId/questions
 * Add question to form
 */
router.post('/:formId/questions', supabaseBearerUser, async (req, res) => {
  const { formId } = req.params;
  const { question_text, question_type, required, order } = req.body;
  const rawOpts = req.body.options ?? req.body.options_json;
  const options = Array.isArray(rawOpts) ? rawOpts : [];

  logger.info(`[forms] POST /:formId/questions - Adding question to form: ${formId}`);

  // Validate required fields
  if (!question_text) {
    logger.warn(`[forms] POST /:formId/questions - Missing required field: question_text`);
    return res.status(400).json({
      error: 'Missing required field: question_text',
    });
  }

  if (!question_type) {
    logger.warn(`[forms] POST /:formId/questions - Missing required field: question_type`);
    return res.status(400).json({
      error: 'Missing required field: question_type',
    });
  }

  try {
    // Verify form exists
    const { data: form, error: formGetErr } = await svc().from('forms').select('*').eq('id', formId).maybeSingle();
    if (formGetErr) throw formGetErr;
    if (!form) throw new Error('Form not found');

    // Get next order if not provided
    let nextOrder = order;
    if (nextOrder === undefined) {
      const { data: existingQuestions, error: eqErr } = await svc().from('form_questions').select('*').eq('form_id', formId);
      if (eqErr) throw eqErr;
      nextOrder = (existingQuestions || []).length + 1;
    }

    const cfgRaw = req.body.config ?? req.body.validation_json;
    const config =
      cfgRaw && typeof cfgRaw === 'object' && !Array.isArray(cfgRaw) ? cfgRaw : {};

    const questionData = {
      form_id: formId,
      question_text,
      question_type,
      options,
      required: required !== false,
      order: nextOrder,
      config,
      created_at: new Date().toISOString(),
    };

    const qInsert = { ...questionData, sort_order: questionData.order ?? questionData.sort_order ?? 0 };
    delete qInsert.order;
    const { data: question, error: qInsErr } = await svc().from('form_questions').insert(qInsert).select().single();
    if (qInsErr) throw qInsErr;

    logger.info(`[forms] POST /:formId/questions - Question created: ${question.id}`);

    res.status(201).json({
      id: question.id,
      form_id: question.form_id,
      question_text: question.question_text,
      question_type: question.question_type,
      required: question.required,
      order: question.sort_order,
    });
  } catch (error) {
    logger.error(`[forms] POST /:formId/questions - Error creating question: ${error.message}`);
    throw new Error(`Failed to create question: ${error.message}`);
  }
});

/**
 * PUT /forms/:formId/questions/:questionId
 * Update question
 */
router.put('/:formId/questions/:questionId', supabaseBearerUser, async (req, res) => {
  const { formId, questionId } = req.params;
  const { question_text, question_type, required, order } = req.body;
  const rawOpts = req.body.options !== undefined ? req.body.options : req.body.options_json;

  logger.info(`[forms] PUT /:formId/questions/:questionId - Updating question: ${questionId}`);

  try {
    // Verify question belongs to form
    const { data: question, error: qOneErr } = await svc().from('form_questions').select('*').eq('id', questionId).maybeSingle();
    if (qOneErr) throw qOneErr;
    if (!question) throw new Error('Question not found');
    if (question.form_id !== formId) {
      logger.warn(`[forms] PUT /:formId/questions/:questionId - Question ${questionId} does not belong to form ${formId}`);
      return res.status(400).json({
        error: 'Question does not belong to this form',
      });
    }

    const updateData = {};

    if (question_text !== undefined) updateData.question_text = question_text;
    if (question_type) updateData.question_type = question_type;
    if (rawOpts !== undefined) updateData.options = Array.isArray(rawOpts) ? rawOpts : [];
    if (required !== undefined) updateData.required = required;
    if (order !== undefined) updateData.sort_order = order;
    const cfgRaw = req.body.config ?? req.body.validation_json;
    if (cfgRaw !== undefined && typeof cfgRaw === 'object' && !Array.isArray(cfgRaw)) {
      updateData.config = cfgRaw;
    }

    if (Object.keys(updateData).length === 0) {
      logger.warn(`[forms] PUT /:formId/questions/:questionId - No fields to update`);
      return res.status(400).json({
        error: 'No fields to update',
      });
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updatedQuestion, error: quErr } = await svc().from('form_questions').update(updateData).eq('id', questionId).select().single();
    if (quErr) throw quErr;

    logger.info(`[forms] PUT /:formId/questions/:questionId - Question ${questionId} updated`);

    res.json(updatedQuestion);
  } catch (error) {
    logger.error(`[forms] PUT /:formId/questions/:questionId - Error updating question: ${error.message}`);
    throw new Error(`Failed to update question: ${error.message}`);
  }
});

/**
 * DELETE /forms/:formId/questions/:questionId
 * Delete question
 */
router.delete('/:formId/questions/:questionId', supabaseBearerUser, async (req, res) => {
  const { formId, questionId } = req.params;

  logger.info(`[forms] DELETE /:formId/questions/:questionId - Deleting question: ${questionId}`);

  try {
    // Verify question belongs to form
    const { data: question, error: qOneErr } = await svc().from('form_questions').select('*').eq('id', questionId).maybeSingle();
    if (qOneErr) throw qOneErr;
    if (!question) throw new Error('Question not found');
    if (question.form_id !== formId) {
      logger.warn(`[forms] DELETE /:formId/questions/:questionId - Question ${questionId} does not belong to form ${formId}`);
      return res.status(400).json({
        error: 'Question does not belong to this form',
      });
    }

    // Delete question
    await svc().from('form_questions').delete().eq('id', questionId);

    logger.info(`[forms] DELETE /:formId/questions/:questionId - Question ${questionId} deleted`);

    res.json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    logger.error(`[forms] DELETE /:formId/questions/:questionId - Error deleting question: ${error.message}`);
    throw new Error(`Failed to delete question: ${error.message}`);
  }
});

/**
 * POST /forms/:formId/responses
 * Submit form response
 */
router.post('/:formId/responses', async (req, res) => {
  const { formId } = req.params;
  const { respondent_email, responses_json, completion_time_seconds } = req.body;

  logger.info(`[forms] POST /:formId/responses - Submitting form response for form: ${formId}`);

  // Validate required fields
  if (!respondent_email) {
    logger.warn(`[forms] POST /:formId/responses - Missing required field: respondent_email`);
    return res.status(400).json({
      error: 'Missing required field: respondent_email',
    });
  }

  if (!responses_json) {
    logger.warn(`[forms] POST /:formId/responses - Missing required field: responses_json`);
    return res.status(400).json({
      error: 'Missing required field: responses_json',
    });
  }

  try {
    // Verify form exists
    const { data: form, error: formGetErr } = await svc().from('forms').select('*').eq('id', formId).maybeSingle();
    if (formGetErr) throw formGetErr;
    if (!form) throw new Error('Form not found');

    // Parse responses if string
    let parsedResponses = responses_json;
    if (typeof responses_json === 'string') {
      try {
        parsedResponses = JSON.parse(responses_json);
      } catch (error) {
        logger.warn(`[forms] POST /:formId/responses - Invalid responses_json format`);
        return res.status(400).json({
          error: 'Invalid responses_json format. Must be valid JSON.',
        });
      }
    }

    // Create response record
    const responseData = {
      form_id: formId,
      respondent_email,
      responses_json: JSON.stringify(parsedResponses),
      completion_time_seconds: completion_time_seconds || 0,
      submitted_at: new Date().toISOString(),
    };

    const { data: formResponse, error: frErr } = await svc().from('form_responses').insert(responseData).select().single();
    if (frErr) throw frErr;

    logger.info(`[forms] POST /:formId/responses - Form response submitted: ${formResponse.id}`);

    res.status(201).json({
      id: formResponse.id,
      form_id: formResponse.form_id,
      respondent_email: formResponse.respondent_email,
      submitted_at: formResponse.submitted_at,
    });
  } catch (error) {
    logger.error(`[forms] POST /:formId/responses - Error submitting form response: ${error.message}`);
    throw new Error(`Failed to submit form response: ${error.message}`);
  }
});

/**
 * GET /forms/:formId/responses
 * List form responses with analytics
 */
router.get('/:formId/responses', supabaseBearerUser, async (req, res) => {
  const { formId } = req.params;
  const { page, limit, date_from, date_to } = req.query;

  logger.info(`[forms] GET /:formId/responses - Fetching responses for form: ${formId}`);

  const pageNum = parseInt(page) || 1;
  const pageLimit = Math.min(parseInt(limit) || 10, 100);

  const filters = [`form_id = "${formId}"`];

  if (date_from) {
    filters.push(`submitted_at >= "${date_from}"`);
  }

  if (date_to) {
    filters.push(`submitted_at <= "${date_to}"`);
  }

  const filter = filters.join(' && ');

  try {
    // Fetch paginated responses
    const rFrom = (pageNum - 1) * pageLimit;
    const rTo = rFrom + pageLimit - 1;
    const { data: respRows, error: respErr, count: respCount } = await svc()
      .from('form_responses')
      .select('*', { count: 'exact' })
      .eq('form_id', formId)
      .order('created_at', { ascending: false })
      .range(rFrom, rTo);
    if (respErr) throw respErr;
    const responses = {
      items: respRows || [],
      page: pageNum,
      perPage: pageLimit,
      totalItems: respCount ?? 0,
      totalPages: Math.max(1, Math.ceil((respCount ?? 0) / pageLimit)),
    };

    let allQuery = svc().from('form_responses').select('*').eq('form_id', formId);
    if (date_from) allQuery = allQuery.gte('submitted_at', date_from);
    if (date_to) allQuery = allQuery.lte('submitted_at', date_to);
    const { data: allResponses, error: allErr } = await allQuery;
    if (allErr) throw allErr;

    // Calculate analytics
    const totalResponses = (allResponses || []).length;
    const completedResponses = (allResponses || []).filter((r) => r.completion_time_seconds > 0).length;
    const completionRate = totalResponses > 0 ? ((completedResponses / totalResponses) * 100).toFixed(2) : 0;

    const avgCompletionTime =
      totalResponses > 0
        ? ((allResponses || []).reduce((sum, r) => sum + (r.completion_time_seconds || 0), 0) / totalResponses).toFixed(2)
        : 0;

    // Generate response timeline (by day)
    const timeline = {};
    (allResponses || []).forEach((response) => {
      const ts = response.submitted_at || response.created_at;
      if (!ts) return;
      const date = String(ts).split('T')[0];
      timeline[date] = (timeline[date] || 0) + 1;
    });

    logger.info(`[forms] GET /:formId/responses - Fetched ${responses.items.length} responses for form ${formId}`);

    res.json({
      items: responses.items,
      page: responses.page,
      perPage: responses.perPage,
      totalItems: responses.totalItems,
      totalPages: responses.totalPages,
      analytics: {
        total_responses: totalResponses,
        completed_responses: completedResponses,
        completion_rate: parseFloat(completionRate),
        avg_completion_time_seconds: parseFloat(avgCompletionTime),
        response_timeline: timeline,
      },
    });
  } catch (error) {
    logger.error(`[forms] GET /:formId/responses - Error fetching responses: ${error.message}`);
    throw new Error(`Failed to fetch form responses: ${error.message}`);
  }
});

export default router;
