/**
 * API de leitura do Shlomo Ledger sobre os lançamentos reais (Pluggy + manuais):
 * resumo do mês por pulmão, histórico mensal, lista filtrável e reclassificação.
 */
const express = require('express');
const { z, ZodError } = require('zod');
const { prisma } = require('../services/pluggy-sync');
const logger = require('../services/logger');

const router = express.Router();

const PULMOES = [1, 2, 3];
const BRT_OFFSET_MS = 3 * 3600 * 1000; // mês contado no horário de Brasília

const monthKey = (date) => new Date(date.getTime() - BRT_OFFSET_MS).toISOString().slice(0, 7);

function monthRange(mes) {
  const [y, m] = mes.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1) + BRT_OFFSET_MS);
  const end = new Date(Date.UTC(y, m, 1) + BRT_OFFSET_MS);
  return { gte: start, lt: end };
}

const round = (n) => Math.round(n * 100) / 100;

const contextoSchema = z.enum(['PF', 'PJ']).default('PF');
const mesSchema = z.string().regex(/^\d{4}-\d{2}$/);

function sumBy(items, keyFn) {
  const map = new Map();
  for (const t of items) {
    const key = keyFn(t);
    const cur = map.get(key) || { total: 0, count: 0 };
    cur.total += t.valor;
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, total: round(v.total), count: v.count }))
    .sort((a, b) => b.total - a.total);
}

// Meses com lançamento no contexto, mais recente primeiro
async function availableMonths(contexto) {
  const rows = await prisma.transaction.findMany({ where: { contexto }, select: { data: true } });
  return [...new Set(rows.map((r) => monthKey(r.data)))].sort().reverse();
}

router.get('/months', async (req, res) => {
  try {
    const contexto = contextoSchema.parse(req.query.contexto);
    res.json(await availableMonths(contexto));
  } catch (error) {
    handleError(res, error);
  }
});

router.get('/summary', async (req, res) => {
  try {
    const contexto = contextoSchema.parse(req.query.contexto);
    const months = await availableMonths(contexto);
    const mes = req.query.mes ? mesSchema.parse(req.query.mes) : months[0] || monthKey(new Date());

    const txs = await prisma.transaction.findMany({ where: { contexto, data: monthRange(mes) } });
    const despesas = txs.filter((t) => t.natureza === 'despesa');
    const sum = (list) => round(list.reduce((acc, t) => acc + t.valor, 0));

    const pulmoes = PULMOES.map((p) => {
      const list = despesas.filter((t) => t.pulmao === p);
      return {
        pulmao: p,
        total: sum(list),
        count: list.length,
        categorias: sumBy(list, (t) => t.categoria || 'Outros'),
      };
    });

    const accounts = await prisma.bankAccount.findMany({
      where: { connection: { contexto } },
      select: { id: true, nome: true, tipo: true, saldo: true, numero: true },
    });

    res.json({
      mes,
      meses: months,
      receita: sum(txs.filter((t) => t.natureza === 'receita')),
      despesas: sum(despesas),
      estornos: sum(txs.filter((t) => t.natureza === 'estorno')),
      transferencias: sum(txs.filter((t) => t.natureza === 'transferencia')),
      pulmoes,
      semPulmao: {
        total: sum(despesas.filter((t) => !t.pulmao)),
        count: despesas.filter((t) => !t.pulmao).length,
        categorias: sumBy(despesas.filter((t) => !t.pulmao), (t) => t.categoria || 'Outros'),
      },
      categorias: sumBy(despesas, (t) => t.categoria || 'Outros'),
      contas: accounts,
    });
  } catch (error) {
    handleError(res, error);
  }
});

router.get('/history', async (req, res) => {
  try {
    const contexto = contextoSchema.parse(req.query.contexto);
    const limit = Math.min(Number(req.query.months) || 6, 24);
    const months = (await availableMonths(contexto)).slice(0, limit).reverse();
    if (months.length === 0) return res.json([]);

    const txs = await prisma.transaction.findMany({
      where: { contexto, data: { gte: monthRange(months[0]).gte, lt: monthRange(months[months.length - 1]).lt } },
      select: { data: true, valor: true, pulmao: true, natureza: true },
    });

    res.json(months.map((mes) => {
      const list = txs.filter((t) => monthKey(t.data) === mes);
      const total = (fn) => round(list.filter(fn).reduce((acc, t) => acc + t.valor, 0));
      return {
        mes,
        receita: total((t) => t.natureza === 'receita'),
        p1: total((t) => t.natureza === 'despesa' && t.pulmao === 1),
        p2: total((t) => t.natureza === 'despesa' && t.pulmao === 2),
        p3: total((t) => t.natureza === 'despesa' && t.pulmao === 3),
        semPulmao: total((t) => t.natureza === 'despesa' && !t.pulmao),
      };
    }));
  } catch (error) {
    handleError(res, error);
  }
});

const listSchema = z.object({
  contexto: contextoSchema,
  mes: mesSchema.optional(),
  // 1|2|3, "none" = despesa sem pulmão
  pulmao: z.enum(['1', '2', '3', 'none']).optional(),
  natureza: z.enum(['despesa', 'receita', 'estorno', 'transferencia']).optional(),
  categoria: z.string().optional(),
  conta: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(['data', 'valor']).default('data'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

router.get('/transactions', async (req, res) => {
  try {
    const f = listSchema.parse(req.query);
    const where = { contexto: f.contexto };
    if (f.mes) where.data = monthRange(f.mes);
    if (f.pulmao) {
      where.pulmao = f.pulmao === 'none' ? null : Number(f.pulmao);
      where.natureza = 'despesa';
    }
    if (f.natureza) where.natureza = f.natureza;
    if (f.categoria) where.categoria = f.categoria;
    if (f.conta) where.bankAccountId = f.conta;
    if (f.q) where.descricao = { contains: f.q };

    const [items, total, agg] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: f.sort === 'valor' ? { valor: 'desc' } : { data: 'desc' },
        skip: (f.page - 1) * f.pageSize,
        take: f.pageSize,
        include: { bankAccount: { select: { nome: true, tipo: true } } },
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({ where, _sum: { valor: true } }),
    ]);

    res.json({ items, total, soma: round(agg._sum.valor || 0), page: f.page, pageSize: f.pageSize });
  } catch (error) {
    handleError(res, error);
  }
});

router.get('/categories', async (req, res) => {
  try {
    const contexto = contextoSchema.parse(req.query.contexto);
    const rows = await prisma.transaction.findMany({ where: { contexto }, distinct: ['categoria'], select: { categoria: true } });
    res.json(rows.map((r) => r.categoria).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR')));
  } catch (error) {
    handleError(res, error);
  }
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const patchSchema = z.object({
  pulmao: z.union([z.literal(1), z.literal(2), z.literal(3), z.null()]).optional(),
  categoria: z.string().min(1).optional(),
  natureza: z.enum(['despesa', 'receita', 'estorno', 'transferencia']).optional(),
  contexto: z.enum(['PF', 'PJ']).optional(),
  // Texto que identifica lançamentos parecidos: vira regra e é aplicado aos já importados
  regra: z.string().trim().min(3).optional(),
});

router.patch('/transactions/:id', async (req, res) => {
  try {
    const body = patchSchema.parse(req.body);
    const tx = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!tx) return res.status(404).json({ error: 'Lançamento não encontrado' });

    const data = { confianca: 1 };
    for (const key of ['pulmao', 'categoria', 'natureza', 'contexto']) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    const updated = await prisma.transaction.update({ where: { id: tx.id }, data });

    let aplicadas = 0;
    if (body.regra) {
      const contexto = updated.contexto;
      const pattern = escapeRegex(body.regra.toLowerCase());
      await prisma.classificationRule.create({
        data: { pattern, contexto, pulmao: updated.pulmao, categoria: updated.categoria },
      });

      const regex = new RegExp(pattern, 'i');
      // Só saídas (despesa/transferência): uma regra de gasto não deve mexer em receitas
      const similar = await prisma.transaction.findMany({
        where: { contexto, natureza: { in: ['despesa', 'transferencia'] }, id: { not: tx.id } },
        select: { id: true, descricao: true },
      });
      const ids = similar.filter((t) => regex.test(t.descricao)).map((t) => t.id);
      if (ids.length) {
        const r = await prisma.transaction.updateMany({
          where: { id: { in: ids } },
          data: { pulmao: updated.pulmao, categoria: updated.categoria, natureza: updated.natureza, confianca: 0.95 },
        });
        aplicadas = r.count;
      }
    }

    res.json({ transaction: updated, aplicadas });
  } catch (error) {
    handleError(res, error);
  }
});

function handleError(res, error) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: 'Parâmetros inválidos', details: error.errors });
  }
  logger.error({ err: error.message }, 'Erro na API do ledger');
  res.status(500).json({ error: error.message });
}

module.exports = router;
