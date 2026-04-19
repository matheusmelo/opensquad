const BaseParser = require('./base-parser');

class SantanderParser extends BaseParser {
  detectBank(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('santander') || lowerText.includes('banco santander')) {
      return 'santander';
    }
    return 'unknown';
  }

  extractTransactions(text) {
    const transactions = [];
    const lines = text.split('\n');

    const transactionPattern = /(\d{2}\/\d{2})\s+(.+?)\s+(BR)?\s*(-?[\d\.]+,\d{2})/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

        const match = line.match(transactionPattern);
        if (match) {
          const [, datePart, description, brPrefix, amountStr] = match;

          let type = 'debit';
          // Prefixos Santander: DB=débito, CR=crédito
          if (line.includes('CR') || description.toLowerCase().includes('crédito')) {
            type = 'credit';
          }
          if (line.includes('DB')) {
            type = 'debit';
          }

        let installment = null;
        const installmentMatch = description.match(/(\d+)\/(\d+)/);
        if (installmentMatch) {
          installment = {
            current: parseInt(installmentMatch[1]),
            total: parseInt(installmentMatch[2]),
          };
        }

        transactions.push({
          date: this.parseDate(`${datePart}/2026`),
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
    const periodPatterns = [
      /extrato\s*mensal\s*-\s*(\w+)\s*\/\s*(\d{4})/i,
      /período\s*:\s*(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/i,
    ];

    for (const pattern of periodPatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          start: this.parseDate(match[1]),
          end: this.parseDate(match[2] || match[1])
        };
      }
    }

    return { start: null, end: null };
  }
}

module.exports = SantanderParser;
