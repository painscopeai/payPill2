import 'dotenv/config';
import { Router } from 'express';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /auth/individual
 * Register a new individual user
 */
router.post('/individual', async (req, res) => {
  const { email, password, passwordConfirm, first_name, last_name } = req.body;

  // Validate required fields
  if (!email || !password || !passwordConfirm) {
    return res.status(400).json({
      error: 'Missing required fields: email, password, passwordConfirm',
    });
  }

  if (password !== passwordConfirm) {
    return res.status(400).json({
      error: 'Passwords do not match',
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long',
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Invalid email format',
    });
  }

  // Check if user already exists
  const existingUser = await pb.collection('users').getFirstListItem(`email = "${email}"`).catch(() => null);
  if (existingUser) {
    return res.status(400).json({
      error: 'User with this email already exists',
    });
  }

  // Set role BEFORE creating user
  const role = 'individual';

  // Validate role is set
  if (!role) {
    throw new Error('Role must be set before creating user');
  }

  // Create user with role
  const userData = {
    email,
    password,
    passwordConfirm,
    first_name: first_name || '',
    last_name: last_name || '',
    role,
    emailVisibility: true,
  };

  const user = await pb.collection('users').create(userData);

  // Verify role was set correctly
  if (user.role !== 'individual') {
    throw new Error(`Role validation failed: expected 'individual', got '${user.role}'`);
  }

  logger.info(`Individual user created: ${user.id} with role=${user.role}`);

  // Authenticate the user
  const authData = await pb.collection('users').authWithPassword(email, password);

  res.status(201).json({
    success: true,
    user: {
      id: authData.record.id,
      email: authData.record.email,
      first_name: authData.record.first_name,
      last_name: authData.record.last_name,
      role: authData.record.role,
    },
    token: authData.token,
  });
});

/**
 * POST /auth/patient
 * Register a new patient user
 */
router.post('/patient', async (req, res) => {
  const { email, password, passwordConfirm, first_name, last_name, date_of_birth } = req.body;

  // Validate required fields
  if (!email || !password || !passwordConfirm) {
    return res.status(400).json({
      error: 'Missing required fields: email, password, passwordConfirm',
    });
  }

  if (password !== passwordConfirm) {
    return res.status(400).json({
      error: 'Passwords do not match',
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long',
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Invalid email format',
    });
  }

  // Check if user already exists
  const existingUser = await pb.collection('users').getFirstListItem(`email = "${email}"`).catch(() => null);
  if (existingUser) {
    return res.status(400).json({
      error: 'User with this email already exists',
    });
  }

  // Set role BEFORE creating user
  const role = 'patient';

  // Validate role is set
  if (!role) {
    throw new Error('Role must be set before creating user');
  }

  // Create user with role
  const userData = {
    email,
    password,
    passwordConfirm,
    first_name: first_name || '',
    last_name: last_name || '',
    date_of_birth: date_of_birth || '',
    role,
    emailVisibility: true,
  };

  const user = await pb.collection('users').create(userData);

  // Verify role was set correctly
  if (user.role !== 'patient') {
    throw new Error(`Role validation failed: expected 'patient', got '${user.role}'`);
  }

  logger.info(`Patient user created: ${user.id} with role=${user.role}`);

  // Authenticate the user
  const authData = await pb.collection('users').authWithPassword(email, password);

  res.status(201).json({
    success: true,
    user: {
      id: authData.record.id,
      email: authData.record.email,
      first_name: authData.record.first_name,
      last_name: authData.record.last_name,
      role: authData.record.role,
    },
    token: authData.token,
  });
});

/**
 * POST /auth/provider
 * Register a new healthcare provider user
 */
router.post('/provider', async (req, res) => {
  const { email, password, passwordConfirm, first_name, last_name, provider_type, license_number } = req.body;

  // Validate required fields
  if (!email || !password || !passwordConfirm) {
    return res.status(400).json({
      error: 'Missing required fields: email, password, passwordConfirm',
    });
  }

  if (password !== passwordConfirm) {
    return res.status(400).json({
      error: 'Passwords do not match',
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long',
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Invalid email format',
    });
  }

  // Check if user already exists
  const existingUser = await pb.collection('users').getFirstListItem(`email = "${email}"`).catch(() => null);
  if (existingUser) {
    return res.status(400).json({
      error: 'User with this email already exists',
    });
  }

  // Set role BEFORE creating user
  const role = 'provider';

  // Validate role is set
  if (!role) {
    throw new Error('Role must be set before creating user');
  }

  // Create user with role
  const userData = {
    email,
    password,
    passwordConfirm,
    first_name: first_name || '',
    last_name: last_name || '',
    provider_type: provider_type || '',
    license_number: license_number || '',
    role,
    emailVisibility: true,
  };

  const user = await pb.collection('users').create(userData);

  // Verify role was set correctly
  if (user.role !== 'provider') {
    throw new Error(`Role validation failed: expected 'provider', got '${user.role}'`);
  }

  logger.info(`Provider user created: ${user.id} with role=${user.role}`);

  // Authenticate the user
  const authData = await pb.collection('users').authWithPassword(email, password);

  res.status(201).json({
    success: true,
    user: {
      id: authData.record.id,
      email: authData.record.email,
      first_name: authData.record.first_name,
      last_name: authData.record.last_name,
      role: authData.record.role,
    },
    token: authData.token,
  });
});

/**
 * POST /auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing required fields: email, password',
    });
  }

  // Authenticate user
  const authData = await pb.collection('users').authWithPassword(email, password);

  // Verify role is set on authenticated user
  if (!authData.record.role) {
    throw new Error('User role is not set. Contact administrator.');
  }

  logger.info(`User logged in: ${authData.record.id} with role=${authData.record.role}`);

  res.json({
    success: true,
    user: {
      id: authData.record.id,
      email: authData.record.email,
      first_name: authData.record.first_name,
      last_name: authData.record.last_name,
      role: authData.record.role,
    },
    token: authData.token,
  });
});

/**
 * POST /auth/logout
 * Logout user (invalidate token)
 */
router.post('/logout', async (req, res) => {
  // Token invalidation is handled by the client
  // This endpoint is a placeholder for future server-side logout logic
  logger.info('User logged out');

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;