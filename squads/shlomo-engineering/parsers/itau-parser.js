const BaseParser = require('./base-parser');

class ItauParser extends BaseParser {
  detectBank(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('itau') || lowerText.includes('itaú') ||
        lowerText.includes('237') || lowerText.includes('341')) {
      return 'itau';
    }
    return 'unknown';
  }

  extractTransactions(text) {
    const transactions = [];
    const lines = text.split('\n');

    // Itaú transaction pattern: DATE DESCRIPTION AMOUNT
    // Example: "15.04.2026 SAQUE 24H RIO BRANCO R$ 200,00"
    const transactionPattern = /^(\d{2}\.\d{2}\.\d{4})\s+(.+?)\s+R\$\s*([\d\.,]+)$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const match = line.match(transactionPattern);
      if (match) {
        const [, dateStr, description, amountStr] = match;

        // Determine transaction type based on keywords
        let type = 'debit'; // Default
        const lowerDesc = description.toLowerCase();

        if (lowerDesc.includes('depósito') ||
            lowerDesc.includes('transferência recebida') ||
            lowerDesc.includes('pix recebido') ||
            lowerDesc.includes('salário') ||
            lowerDesc.includes('rendimento') ||
            lowerDesc.includes('juros')) {
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
          date: this.parseDate(dateStr),
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
    // Look for period indicators in Itaú PDFs
    const periodPatterns = [
      /período\s*de\s*(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/i,
      /de\s*(\d{2}\.\d{2}\.\d{4})\s*a\s*(\d{2}\.\d{2}\.\d{4})/i,
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

module.exports = ItauParser;