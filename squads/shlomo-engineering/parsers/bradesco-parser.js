const BaseParser = require('./base-parser');

class BradescoParser extends BaseParser {
  detectBank(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('bradesco') || lowerText.includes('banco bradesco') || lowerText.includes('extrato bradesco')) {
      return 'bradesco';
    }
    return 'unknown';
  }

  extractTransactions(text) {
    const transactions = [];
    const lines = text.split('\n');

    const transactionPattern = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?[\d\.]+,\d{2})/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const match = line.match(transactionPattern);
      if (match) {
        const [, datePart, description, amountStr] = match;

        let type = 'debit';
        const lowerDesc = description.toLowerCase();

        // Detectar tipos específicos Bradesco
        if (lowerDesc.includes('compra') || 
            lowerDesc.includes('deb automat') || 
            lowerDesc.includes('ted/doc') ||
            lowerDesc.includes('fatura cartão')) {
          type = 'debit';
        }
        
        if (lowerDesc.includes('crédito') || lowerDesc.includes('depósito') || lowerDesc.includes('transferência recebida')) {
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
      /período\s*:\s*(\d{2}\/\d{2}\/\d{4})\s*a\s*(\d{2}\/\d{2}\/\d{4})/i,
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

module.exports = BradescoParser;
