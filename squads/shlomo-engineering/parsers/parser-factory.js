const NubankParser = require('./nubank-parser');
const ItauParser = require('./itau-parser');
const BradescoParser = require('./bradesco-parser');
const SantanderParser = require('./santander-parser');
const InterParser = require('./inter-parser');

class ParserFactory {
  static getParser(bank) {
    switch (bank.toLowerCase()) {
      case 'nubank':
        return new NubankParser();
      case 'itau':
        return new ItauParser();
      case 'bradesco':
        return new BradescoParser();
      case 'santander':
        return new SantanderParser();
      case 'inter':
        return new InterParser();
      default:
        throw new Error(`Unsupported bank: ${bank}`);
    }
  }

  static detectBank(text) {
    const parsers = [
      new NubankParser(),
      new ItauParser(),
      new BradescoParser(),
      new SantanderParser(),
      new InterParser(),
    ];

    for (const parser of parsers) {
      const bank = parser.detectBank(text);
      if (bank !== 'unknown') {
        return bank;
      }
    }

    return 'unknown';
  }

  static getSupportedBanks() {
    return ['nubank', 'itau', 'bradesco', 'santander', 'inter'];
  }

  static async parsePDF(pdfBuffer) {
    // First detect bank from PDF text
    const fs = require('fs').promises;
    const pdfParse = require('pdf-parse');

    try {
      const pdfData = await pdfParse(pdfBuffer);
      const text = pdfData.text;

      const bank = this.detectBank(text);
      if (bank === 'unknown') {
        throw new Error('Could not detect bank from PDF content');
      }

      const parser = this.getParser(bank);
      return await parser.parse(pdfBuffer);
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }
}

module.exports = ParserFactory;