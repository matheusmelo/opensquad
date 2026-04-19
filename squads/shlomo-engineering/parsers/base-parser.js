const fs = require('fs').promises;
const pdfParse = require('pdf-parse');

/**
 * Base abstract class for PDF parsers
 */
class BaseParser {
  constructor() {
    if (new.target === BaseParser) {
      throw new TypeError('Cannot instantiate abstract class BaseParser');
    }
  }

  /**
   * Parse a PDF buffer and extract financial data
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<Object>} Parsed data
   */
  async parse(pdfBuffer) {
    try {
      // Extract text from PDF
      const pdfData = await pdfParse(pdfBuffer);
      const text = pdfData.text;

      // Detect bank from text
      const bank = this.detectBank(text);
      if (bank === 'unknown') {
        throw new Error('Unable to detect bank from PDF content');
      }

      // Extract transactions
      const transactions = this.extractTransactions(text);

      // Extract period
      const period = this.extractPeriod(text);

      return {
        bank,
        period,
        transactions,
        metadata: {
          totalPages: pdfData.numpages,
          extractedTextLength: text.length,
          parsingTimestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  /**
   * Detect bank from PDF text
   * @param {string} text - PDF text content
   * @returns {string} Bank identifier
   */
  detectBank(text) {
    throw new Error('detectBank() must be implemented by subclass');
  }

  /**
   * Extract transactions from PDF text
   * @param {string} text - PDF text content
   * @returns {Array} Array of transaction objects
   */
  extractTransactions(text) {
    throw new Error('extractTransactions() must be implemented by subclass');
  }

  /**
   * Extract statement period from PDF text
   * @param {string} text - PDF text content
   * @returns {Object} Period object with start and end dates
   */
  extractPeriod(text) {
    // Default implementation - can be overridden
    return {
      start: null,
      end: null,
    };
  }

  /**
   * Parse amount string to number
   * @param {string} amountStr - Amount string (e.g., "R$ 1.234,56" or "1.234,56")
   * @returns {number} Parsed amount
   */
  parseAmount(amountStr) {
    if (!amountStr) return 0;

    // Remove currency symbols and clean up
    let cleaned = amountStr
      .replace(/[R$€£¥]/g, '')
      .replace(/\s+/g, '')
      .trim();

    // Handle different decimal separators
    if (cleaned.includes(',')) {
      // Brazilian format: 1.234,56 -> 1234.56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }

    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
  }

  /**
   * Parse date string
   * @param {string} dateStr - Date string
   * @returns {string|null} ISO date string or null
   */
  parseDate(dateStr) {
    if (!dateStr) return null;

    try {
      // Handle different date formats
      const formats = [
        /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
        /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
        /^(\d{4})-(\d{2})-(\d{2})$/,   // YYYY-MM-DD
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          const [, part1, part2, part3] = match;
          let day, month, year;

          if (format === formats[2]) {
            // YYYY-MM-DD
            year = part1;
            month = part2;
            day = part3;
          } else {
            // DD/MM/YYYY or DD.MM.YYYY
            day = part1;
            month = part2;
            year = part3;
          }

          const date = new Date(`${year}-${month}-${day}`);
          return date.toISOString().split('T')[0];
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = BaseParser;