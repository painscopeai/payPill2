import 'dotenv/config';
import pdfParse from 'pdf-parse';
import { read, utils } from 'xlsx';
import mammoth from 'mammoth';
import logger from './logger.js';

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error) {
    logger.error(`Error extracting PDF text: ${error.message}`);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Extract text from Excel file
 */
export function extractTextFromExcel(buffer) {
  try {
    const workbook = read(buffer, { type: 'buffer' });
    let text = '';

    // Iterate through all sheets
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      text += `Sheet: ${sheetName}\n`;

      // Convert sheet to CSV format for text extraction
      const csv = utils.sheet_to_csv(worksheet);
      text += csv + '\n\n';
    }

    return text;
  } catch (error) {
    logger.error(`Error extracting Excel text: ${error.message}`);
    throw new Error(`Failed to extract text from Excel: ${error.message}`);
  }
}

/**
 * Manual CSV parser - handles various CSV formats
 * Supports:
 * - Standard CSV with comma delimiter
 * - CSV with semicolon delimiter
 * - CSV with tab delimiter
 * - Quoted fields (handles commas within quotes)
 * - Headers and data rows
 * - Empty lines
 *
 * @param {string} csvText - Raw CSV text content
 * @returns {object} - { headers: array, rows: array, text: string }
 */
function parseCSVManually(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    return { headers: [], rows: [], text: '' };
  }

  // Detect delimiter (comma, semicolon, or tab)
  const firstLine = csvText.split('\n')[0] || '';
  let delimiter = ',';

  if (firstLine.includes(';') && !firstLine.includes(',')) {
    delimiter = ';';
  } else if (firstLine.includes('\t')) {
    delimiter = '\t';
  }

  // Split into lines
  const lines = csvText.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], text: '' };
  }

  // Parse CSV with proper quote handling
  const parseCSVLine = (line) => {
    const fields = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        // Handle escaped quotes
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i++; // Skip next quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    // Add last field
    fields.push(currentField.trim());

    return fields;
  };

  // Parse all lines
  const parsedLines = lines.map((line) => parseCSVLine(line));

  // Determine if first line is header (heuristic: if all values are non-numeric strings)
  const firstLineValues = parsedLines[0] || [];
  const isHeader =
    firstLineValues.length > 0 &&
    firstLineValues.every(
      (val) => val && isNaN(val) && val.length < 50 && !val.match(/^\d+\.\d+$/)
    );

  const headers = isHeader ? firstLineValues : [];
  const dataRows = isHeader ? parsedLines.slice(1) : parsedLines;

  // Convert to readable text format
  let text = '';

  if (headers.length > 0) {
    text += `Headers: ${headers.join(' | ')}\n\n`;
  }

  dataRows.forEach((row, index) => {
    text += `Record ${index + 1}:\n`;

    if (headers.length > 0) {
      // Use headers as keys
      headers.forEach((header, colIndex) => {
        const value = row[colIndex] || '';
        text += `  ${header}: ${value}\n`;
      });
    } else {
      // No headers, use column numbers
      row.forEach((value, colIndex) => {
        text += `  Column ${colIndex + 1}: ${value}\n`;
      });
    }

    text += '\n';
  });

  return { headers, rows: dataRows, text };
}

/**
 * Extract text from CSV file
 */
export function extractTextFromCSV(buffer) {
  try {
    const csvText = buffer.toString('utf-8');

    // Use manual CSV parser
    const parsed = parseCSVManually(csvText);

    if (!parsed.text || parsed.text.trim().length === 0) {
      // Fallback: return raw text if parsing produced no output
      logger.warn('CSV parsing produced empty output, returning raw text');
      return csvText;
    }

    return parsed.text;
  } catch (error) {
    logger.error(`Error extracting CSV text: ${error.message}`);
    throw new Error(`Failed to extract text from CSV: ${error.message}`);
  }
}

/**
 * Extract text from Word document (.docx)
 */
export async function extractTextFromWord(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (error) {
    logger.error(`Error extracting Word text: ${error.message}`);
    throw new Error(`Failed to extract text from Word: ${error.message}`);
  }
}

/**
 * Extract text from plain text file
 */
export function extractTextFromPlainText(buffer) {
  try {
    return buffer.toString('utf-8');
  } catch (error) {
    logger.error(`Error extracting text from plain text: ${error.message}`);
    throw new Error(`Failed to extract text from plain text: ${error.message}`);
  }
}

/**
 * Determine file type from MIME type
 */
export function getFileType(mimetype) {
  const mimeMap = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
    'application/vnd.ms-excel': 'excel',
    'text/csv': 'csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
    'application/msword': 'word',
    'text/plain': 'text',
  };

  return mimeMap[mimetype] || 'unknown';
}

/**
 * Extract text from file based on type
 */
export async function extractTextFromFile(buffer, mimetype) {
  const fileType = getFileType(mimetype);

  logger.info(`Extracting text from ${fileType} file`);

  switch (fileType) {
    case 'pdf':
      return await extractTextFromPDF(buffer);
    case 'excel':
      return extractTextFromExcel(buffer);
    case 'csv':
      return extractTextFromCSV(buffer);
    case 'word':
      return await extractTextFromWord(buffer);
    case 'text':
      return extractTextFromPlainText(buffer);
    default:
      throw new Error(`Unsupported file type: ${mimetype}`);
  }
}

/**
 * Chunk text into smaller pieces
 * @param {string} text - Text to chunk
 * @param {number} chunkSize - Size of each chunk in characters (default 1000)
 * @returns {array} - Array of text chunks
 */
export function chunkText(text, chunkSize = 1000) {
  if (!text || text.length === 0) {
    return [];
  }

  const chunks = [];
  let currentChunk = '';

  // Split by sentences to avoid breaking mid-sentence
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= chunkSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    }
  }

  // Add remaining chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  logger.info(`Text chunked into ${chunks.length} chunks`);

  return chunks;
}
