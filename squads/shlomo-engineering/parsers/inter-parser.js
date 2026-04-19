const BaseParser = require('./base-parser');

class InterParser extends BaseParser {
  detectBank(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('banco inter') || lowerText.includes('inter banco')) {
      return 'inter';
    }
    return 'unknown';
  }

  extractTransactions(text) {
    const transactions = [];
    const lines = text.split('\n');

    const transactionPattern = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+R\$\s*(-?[\d\.,]+)$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const match = line.match(transactionPattern);
      if (match) {
        const [, datePart, description, amountStr] = match;

        let type = 'debit';
        const lowerDesc = description.toLowerCase();

        if (lowerDesc.includes('recebido') || lowerDesc.includes('crédito') || lowerDesc.includes('depósito')) {
          type = 'credit';
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
          date: this.parseDate(datePart),
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
      /extrato\s*de\s*(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/i,
      /período\s*(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/i,
    ];

    for (const pattern of periodPatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          start: this.parseDate(match[1]),
          end: this.parseDate(match[2])
        };
      }
    }

    return { start: null, end: null };
  }
}

module.exports = InterParser;
