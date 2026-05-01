export const validateBulkUpload = (data, requiredFields = []) => {
  const errors = [];
  const validData = [];
  const emails = new Set();

  data.forEach((row, index) => {
    const rowErrors = [];
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!row[field]) rowErrors.push(`Missing ${field}`);
    });

    // Check email format
    if (row.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email)) rowErrors.push('Invalid email format');
      
      // Check duplicates
      if (emails.has(row.email)) {
        rowErrors.push('Duplicate email in file');
      } else {
        emails.add(row.email);
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ row: index + 1, data: row, errors: rowErrors });
    } else {
      validData.push(row);
    }
  });

  return { validData, errors, isValid: errors.length === 0 };
};