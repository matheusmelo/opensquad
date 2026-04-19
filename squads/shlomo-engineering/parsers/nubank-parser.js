const BaseParser = require('./base-parser');

class NubankParser extends BaseParser {
  detectBank(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('nubank') || lowerText.includes('nu conta')) {
      return 'nubank';
    }
    return 'unknown';
  }

  extractTransactions(text) {
    const transactions = [];
    const lines = text.split('\n');

    // Nubank transaction pattern: DATE DESCRIPTION AMOUNT
    // Example: "15/04 PIX ENVIADO PARA MARIA SANTOS R$ 150,00"
    const transactionPattern = /^(\d{2}\/\d{2})\s+(.+?)\s+R\$\s*([\d\.,]+)$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const match = line.match(transactionPattern);
      if (match) {
        const [, datePart, description, amountStr] = match;

        // Determine transaction type based on keywords
        let type = 'debit'; // Default
        const lowerDesc = description.toLowerCase();

        if (lowerDesc.includes('pix recebido') ||
            lowerDesc.includes('transferência recebida') ||
            lowerDesc.includes('depósito') ||
            lowerDesc.includes('salário') ||
            lowerDesc.includes('rendimento')) {
          type = 'credit';
        }

        // Check for installment transactions
        let installment = null;
        const installmentMatch = description.match(/(\d+)\/(\d+)/);
        if (installmentMatch) {
          installment = {
            current: parseInt(installmentMatch[1]),
            total: parseInt(installmentMatch[2]),
          };
        }

        transactions.push({
          date: this.parseDate(`${datePart}/2026`), // Assume current year, could be extracted from PDF
          description: description.trim(),
          amount: this.parseAmount(amountStr),
          type,
          installment,
        });
      }
    }

    return transactions;
  }

  extractPeriod(text) {
    // Look for period indicators in Nubank PDFs
    const periodPatterns = [
      /período\s*de\s*(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/i,
      /de\s*(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/i,
      /(\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{4})/i,
    ];

    for (const pattern of periodPatterns) {
      const match = text.match(pattern);
      if (match) {
        const start = this.parseDate(match[1]);
        const end = this.parseDate(match[2]);
        return { start, end };
      }
    }

    return { start: null, end: null };
  }
}

module.exports = NubankParser;