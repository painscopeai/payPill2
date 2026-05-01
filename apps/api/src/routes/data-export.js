import { Router } from 'express';
import PDFDocument from 'pdfkit';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * Convert an array of objects to CSV string with proper escaping
 * @param {Array} data - Array of objects to convert
 * @returns {string} CSV formatted string with headers
 */
function generateCSV(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  // Extract headers from first object
  const headers = Object.keys(data[0]);

  // Escape CSV values: handle quotes, commas, newlines
  const escapeCSVValue = (value) => {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // If value contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  };

  // Build CSV header row
  const headerRow = headers.map(escapeCSVValue).join(',');

  // Build CSV data rows
  const dataRows = data.map((row) =>
    headers.map((header) => escapeCSVValue(row[header])).join(',')
  );

  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
}

/**
 * GET /data/export
 * Export user health data in various formats
 */
router.get('/export', async (req, res) => {
  const { userId, exportType } = req.query;

  // Validate required parameters
  if (!userId) {
    return res.status(400).json({
      error: 'Missing required query parameter: userId',
    });
  }

  const validExportTypes = ['all', 'health-records', 'medications', 'appointments', 'lab-results', 'wellness-activities'];
  const type = exportType || 'all';

  if (!validExportTypes.includes(type)) {
    return res.status(400).json({
      error: `Invalid exportType. Must be one of: ${validExportTypes.join(', ')}`,
    });
  }

  // Verify user exists
  const user = await pb.collection('users').getOne(userId).catch(() => null);
  if (!user) {
    return res.status(400).json({
      error: 'User not found',
    });
  }

  if (type === 'all') {
    // Export all data as JSON
    const allData = await fetchAllUserData(userId);
    const filename = `health-export-${userId}-${Date.now()}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(allData);
  } else if (type === 'health-records') {
    // Export health records as PDF
    await exportHealthRecordsAsPDF(userId, res);
  } else if (type === 'lab-results') {
    // Export lab results as PDF
    await exportLabResultsAsPDF(userId, res);
  } else if (type === 'medications') {
    // Export medications as CSV
    await exportMedicationsAsCSV(userId, res);
  } else if (type === 'appointments') {
    // Export appointments as CSV
    await exportAppointmentsAsCSV(userId, res);
  } else if (type === 'wellness-activities') {
    // Export wellness activities as CSV
    await exportWellnessActivitiesAsCSV(userId, res);
  }
});

/**
 * Fetch all user data from PocketBase
 */
async function fetchAllUserData(userId) {
  const data = {
    user: null,
    healthProfile: null,
    medications: [],
    appointments: [],
    labResults: [],
    wellnessActivities: [],
    healthGoals: [],
    recommendations: [],
  };

  try {
    data.user = await pb.collection('users').getOne(userId);
  } catch (error) {
    logger.warn(`Failed to fetch user: ${error.message}`);
  }

  try {
    data.healthProfile = await pb.collection('health_profile').getFirstListItem(`user_id = "${userId}"`);
  } catch (error) {
    logger.warn(`Failed to fetch health profile: ${error.message}`);
  }

  try {
    data.medications = await pb.collection('prescriptions').getFullList({
      filter: `user_id = "${userId}"`,
    });
  } catch (error) {
    logger.warn(`Failed to fetch medications: ${error.message}`);
  }

  try {
    data.appointments = await pb.collection('appointments').getFullList({
      filter: `user_id = "${userId}"`,
    });
  } catch (error) {
    logger.warn(`Failed to fetch appointments: ${error.message}`);
  }

  try {
    data.labResults = await pb.collection('lab_results').getFullList({
      filter: `user_id = "${userId}"`,
    });
  } catch (error) {
    logger.warn(`Failed to fetch lab results: ${error.message}`);
  }

  try {
    data.wellnessActivities = await pb.collection('wellness_activities').getFullList({
      filter: `user_id = "${userId}"`,
    });
  } catch (error) {
    logger.warn(`Failed to fetch wellness activities: ${error.message}`);
  }

  try {
    data.healthGoals = await pb.collection('health_goals').getFullList({
      filter: `user_id = "${userId}"`,
    });
  } catch (error) {
    logger.warn(`Failed to fetch health goals: ${error.message}`);
  }

  try {
    data.recommendations = await pb.collection('patient_recommendations').getFullList({
      filter: `user_id = "${userId}"`,
    });
  } catch (error) {
    logger.warn(`Failed to fetch recommendations: ${error.message}`);
  }

  return data;
}

/**
 * Export health records as PDF
 */
async function exportHealthRecordsAsPDF(userId, res) {
  const doc = new PDFDocument();
  const filename = `health-records-${userId}-${Date.now()}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  // Title
  doc.fontSize(20).text('Health Records Export', { align: 'center' });
  doc.fontSize(12).text(`User ID: ${userId}`, { align: 'center' });
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown();

  try {
    // Fetch health profile
    const healthProfile = await pb.collection('health_profile').getFirstListItem(`user_id = "${userId}"`);
    doc.fontSize(14).text('Health Profile', { underline: true });
    doc.fontSize(11);
    if (healthProfile.conditions) {
      doc.text(`Conditions: ${Array.isArray(healthProfile.conditions) ? healthProfile.conditions.join(', ') : healthProfile.conditions}`);
    }
    if (healthProfile.allergies) {
      doc.text(`Allergies: ${Array.isArray(healthProfile.allergies) ? healthProfile.allergies.join(', ') : healthProfile.allergies}`);
    }
    doc.moveDown();
  } catch (error) {
    logger.warn(`Failed to fetch health profile: ${error.message}`);
  }

  try {
    // Fetch medications
    const medications = await pb.collection('prescriptions').getFullList({
      filter: `user_id = "${userId}"`,
    });
    if (medications.length > 0) {
      doc.fontSize(14).text('Current Medications', { underline: true });
      doc.fontSize(11);
      medications.forEach((med) => {
        doc.text(`• ${med.medication_name} - ${med.dosage} (${med.frequency})`);
      });
      doc.moveDown();
    }
  } catch (error) {
    logger.warn(`Failed to fetch medications: ${error.message}`);
  }

  try {
    // Fetch appointments
    const appointments = await pb.collection('appointments').getFullList({
      filter: `user_id = "${userId}"`,
      sort: '-appointment_date',
    });
    if (appointments.length > 0) {
      doc.fontSize(14).text('Recent Appointments', { underline: true });
      doc.fontSize(11);
      appointments.slice(0, 10).forEach((apt) => {
        doc.text(`• ${apt.appointment_date} at ${apt.appointment_time} - ${apt.type}`);
      });
      doc.moveDown();
    }
  } catch (error) {
    logger.warn(`Failed to fetch appointments: ${error.message}`);
  }

  doc.end();
}

/**
 * Export lab results as PDF
 */
async function exportLabResultsAsPDF(userId, res) {
  const doc = new PDFDocument();
  const filename = `lab-results-${userId}-${Date.now()}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  // Title
  doc.fontSize(20).text('Lab Results Export', { align: 'center' });
  doc.fontSize(12).text(`User ID: ${userId}`, { align: 'center' });
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown();

  try {
    const labResults = await pb.collection('lab_results').getFullList({
      filter: `user_id = "${userId}"`,
      sort: '-test_date',
    });

    if (labResults.length > 0) {
      doc.fontSize(14).text('Lab Results', { underline: true });
      doc.fontSize(11);
      labResults.forEach((result) => {
        doc.text(`Test: ${result.test_name}`);
        doc.text(`Date: ${result.test_date}`);
        doc.text(`Result: ${result.result_value} ${result.unit || ''}`);
        doc.text(`Reference Range: ${result.reference_range || 'N/A'}`);
        doc.moveDown(0.5);
      });
    } else {
      doc.text('No lab results found.');
    }
  } catch (error) {
    logger.warn(`Failed to fetch lab results: ${error.message}`);
    doc.text('Unable to fetch lab results.');
  }

  doc.end();
}

/**
 * Export medications as CSV
 */
async function exportMedicationsAsCSV(userId, res) {
  const medications = await pb.collection('prescriptions').getFullList({
    filter: `user_id = "${userId}"`,
  });

  const csvData = medications.map((med) => ({
    'Medication Name': med.medication_name,
    'Dosage': med.dosage,
    'Frequency': med.frequency,
    'Quantity': med.quantity,
    'Refills Remaining': med.refills_remaining,
    'Status': med.status,
    'Date Prescribed': med.date_prescribed,
  }));

  const csv = generateCSV(csvData);
  const filename = `medications-${userId}-${Date.now()}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

/**
 * Export appointments as CSV
 */
async function exportAppointmentsAsCSV(userId, res) {
  const appointments = await pb.collection('appointments').getFullList({
    filter: `user_id = "${userId}"`,
    sort: '-appointment_date',
  });

  const csvData = appointments.map((apt) => ({
    'Date': apt.appointment_date,
    'Time': apt.appointment_time,
    'Type': apt.type,
    'Reason': apt.reason,
    'Status': apt.status,
  }));

  const csv = generateCSV(csvData);
  const filename = `appointments-${userId}-${Date.now()}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

/**
 * Export wellness activities as CSV
 */
async function exportWellnessActivitiesAsCSV(userId, res) {
  const activities = await pb.collection('wellness_activities').getFullList({
    filter: `user_id = "${userId}"`,
    sort: '-activity_date',
  });

  const csvData = activities.map((activity) => ({
    'Date': activity.activity_date,
    'Activity Type': activity.activity_type,
    'Duration (minutes)': activity.duration_minutes,
    'Intensity': activity.intensity,
    'Calories Burned': activity.calories_burned,
    'Notes': activity.notes,
  }));

  const csv = generateCSV(csvData);
  const filename = `wellness-activities-${userId}-${Date.now()}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

export default router;