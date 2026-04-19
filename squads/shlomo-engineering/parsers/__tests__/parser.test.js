const ParserFactory = require('../parser-factory');

// Mock PDF text for testing (simulates pdf-parse output)
const mockNubankPDF = `
NUBANK CONTA DIGITAL
Extrato do período de 01/04/2026 a 30/04/2026

15/04 PIX ENVIADO PARA MARIA SANTOS R$ 150,00
16/04 COMPRA CARTÃO NUBANK - MERCADONA R$ 89,90
17/04 PIX RECEBIDO DE JOÃO SILVA R$ 2.500,00
18/04 COMPRA PARCELADA 1/3 - AMAZON R$ 150,00
19/04 SAQUE 24H SHOPPING RIO BRANCO R$ 200,00
20/04 DEPÓSITO SALÁRIO EMPRESA XYZ R$ 5.000,00
`;

const mockItauPDF = `
BANCO ITAÚ
Extrato de 01.04.2026 a 30.04.2026

15.04.2026 SAQUE 24H RIO BRANCO R$ 200,00
16.04.2026 COMPRA CARTÃO - MERCADONA R$ 89,90
17.04.2026 PIX RECEBIDO JOÃO SILVA R$ 2.500,00
18.04.2026 COMPRA PARCELADA 1/3 AMAZON R$ 150,00
19.04.2026 TRANSFERÊNCIA RECEBIDA SALÁRIO R$ 5.000,00
20.04.2026 DEPÓSITO EMPRESA XYZ R$ 1.000,00
`;

describe('PDF Parsers', () => {
  describe('ParserFactory', () => {
    test('should detect Nubank bank', () => {
      const bank = ParserFactory.detectBank(mockNubankPDF);
      expect(bank).toBe('nubank');
    });

    test('should detect Itaú bank', () => {
      const bank = ParserFactory.detectBank(mockItauPDF);
      expect(bank).toBe('itau');
    });

    test('should return unknown for unrecognized bank', () => {
      const unknownPDF = 'Some random bank statement text';
      const bank = ParserFactory.detectBank(unknownPDF);
      expect(bank).toBe('unknown');
    });
  });

  describe('NubankParser', () => {
    let parser;

    beforeEach(() => {
      parser = ParserFactory.getParser('nubank');
    });

    test('should parse Nubank transactions correctly', async () => {
      // Mock pdf-parse
      const mockPdfParse = jest.fn().mockResolvedValue({
        text: mockNubankPDF,
        numpages: 2,
      });

      // Temporarily replace pdf-parse
      const originalPdfParse = require('pdf-parse');
      require.cache[require.resolve('pdf-parse')] = {
        exports: mockPdfParse,
      };

      try {
        const result = await parser.parse(Buffer.from('mock'));

        expect(result.bank).toBe('nubank');
        expect(result.transactions).toHaveLength(6);

        // Check first transaction
        const firstTx = result.transactions[0];
        expect(firstTx.description).toContain('PIX ENVIADO');
        expect(firstTx.amount).toBe(150);
        expect(firstTx.type).toBe('debit');

        // Check credit transaction
        const creditTx = result.transactions.find(tx => tx.type === 'credit');
        expect(creditTx).toBeTruthy();
        expect(creditTx.amount).toBe(2500);

      } finally {
        // Restore original pdf-parse
        require.cache[require.resolve('pdf-parse')] = {
          exports: originalPdfParse,
        };
      }
    });

    test('should detect installment transactions', async () => {
      const mockInstallmentPDF = `
NUBANK CONTA DIGITAL
18/04 COMPRA PARCELADA 2/6 - LOJA X R$ 300,00
      `;

      const mockPdfParse = jest.fn().mockResolvedValue({
        text: mockInstallmentPDF,
        numpages: 1,
      });

      const originalPdfParse = require('pdf-parse');
      require.cache[require.resolve('pdf-parse')] = {
        exports: mockPdfParse,
      };

      try {
        const result = await parser.parse(Buffer.from('mock'));
        const installmentTx = result.transactions[0];

        expect(installmentTx.installment).toEqual({
          current: 2,
          total: 6,
        });
      } finally {
        require.cache[require.resolve('pdf-parse')] = {
          exports: originalPdfParse,
        };
      }
    });
  });

  describe('ItauParser', () => {
    let parser;

    beforeEach(() => {
      parser = ParserFactory.getParser('itau');
    });

    test('should parse Itaú transactions correctly', async () => {
      const mockPdfParse = jest.fn().mockResolvedValue({
        text: mockItauPDF,
        numpages: 2,
      });

      const originalPdfParse = require('pdf-parse');
      require.cache[require.resolve('pdf-parse')] = {
        exports: mockPdfParse,
      };

      try {
        const result = await parser.parse(Buffer.from('mock'));

        expect(result.bank).toBe('itau');
        expect(result.transactions).toHaveLength(6);

        // Check date format (DD.MM.YYYY)
        const firstTx = result.transactions[0];
        expect(firstTx.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      } finally {
        require.cache[require.resolve('pdf-parse')] = {
          exports: originalPdfParse,
        };
      }
    });
  });

  describe('BaseParser utilities', () => {
    let parser;

    beforeEach(() => {
      parser = ParserFactory.getParser('nubank');
    });

    test('should parse Brazilian amounts correctly', () => {
      expect(parser.parseAmount('R$ 1.234,56')).toBe(1234.56);
      expect(parser.parseAmount('1.234,56')).toBe(1234.56);
      expect(parser.parseAmount('R$ 150,00')).toBe(150);
      expect(parser.parseAmount('')).toBe(0);
    });

    test('should parse dates correctly', () => {
      expect(parser.parseDate('15/04/2026')).toBe('2026-04-15');
      expect(parser.parseDate('15.04.2026')).toBe('2026-04-15');
      expect(parser.parseDate('2026-04-15')).toBe('2026-04-15');
      expect(parser.parseDate('')).toBeNull();
    });
  });
});