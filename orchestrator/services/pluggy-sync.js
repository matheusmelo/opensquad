/**
 * Sincroniza itens Pluggy -> Prisma (BankConnection / BankAccount / Transaction)
 * e classifica cada lançamento no método dos 3 Pulmões.
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { PrismaClient } = require('@prisma/client');
const pluggy = require('./pluggy');
const logger = require('./logger');

const prisma = new PrismaClient();

const DEFAULT_SYNC_DAYS = 90;
const RULES_YAML = path.join(__dirname, '../../squads/shlomo-engineering/classifier/rules.yaml');
const OWNER_WHATSAPP = process.env.PLUGGY_OWNER_WHATSAPP || '+5511999999999';

// ---------- Classificação ----------

const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

function parsePulmao(value) {
  if (value === null || value === undefined) return null;
  const n = parseInt(String(value).replace(/\D/g, ''), 10);
  return n >= 1 && n <= 3 ? n : null;
}

function loadYamlRules() {
  try {
    const doc = yaml.load(fs.readFileSync(RULES_YAML, 'utf8'));
    return (doc?.rules || []).map((r) => ({ ...r, pulmao: parsePulmao(r.pulmao), confianca: 0.85 }));
  } catch (error) {
    logger.warn({ err: error.message }, 'rules.yaml da shlomo-engineering não carregou');
    return [];
  }
}

async function loadRules() {
  // Regras do banco (criadas pelo usuário) têm prioridade sobre o YAML
  const dbRules = (await prisma.classificationRule.findMany()).map((r) => ({ ...r, confianca: 0.95 }));
  return [...dbRules, ...loadYamlRules()];
}

// Categoria do Pluggy -> Pulmão (fallback quando nenhuma regra casa)
const PLUGGY_CATEGORY_MAP = [
  { match: /credit card payment|pagamento de cart/i, categoria: 'Pagamento de fatura', pulmao: null },
  { match: /transfer|\bpix\b|\bted\b|\bdoc\b/i, categoria: 'Transferência', pulmao: null },
  { match: /invest/i, categoria: 'Investimentos', pulmao: null },
  { match: /rent|housing|electric|water|gas$|utilit|telecom|internet|mobile|tax|insurance|groceries|supermarket|education|school|transport|fuel|gas station|parking|toll|public transport|bank fee/i, categoria: null, pulmao: 1 },
  { match: /health|pharma|drugstore|clinic|hospital|dental|clothing|shopping|electronics|maintenance|repair|pet|gift|donation/i, categoria: null, pulmao: 2 },
  { match: /travel|airline|airport|accommodation|hotel|leisure|entertainment|streaming|gaming|eating out|restaurant|bar|food delivery|cinema|show|sport/i, categoria: null, pulmao: 3 },
];

/**
 * Lançamentos que não são consumo e por isso ficam fora dos pulmões, antes de
 * qualquer regra (as regras do YAML casam nomes de pessoas por acidente).
 */
function nonSpending(description, pluggyCategory, tx) {
  // IOF acompanha a compra internacional; não é um gasto por si só
  if (/\biof\b/i.test(description) || /tax on financial operations/i.test(pluggyCategory || '')) {
    return { pulmao: null, categoria: 'IOF', confianca: 0.9 };
  }
  // Pix/TED para CPF é transferência a uma pessoa; para CNPJ (loja) segue a classificação normal
  const receiverDoc = tx?.paymentData?.receiver?.documentNumber?.type;
  if (receiverDoc === 'CPF' || /^transfer/i.test(pluggyCategory || '')) {
    return { pulmao: null, categoria: 'Transferência', confianca: 0.9 };
  }
  return null;
}

function classify(description, pluggyCategory, contexto, rules, tx) {
  const skip = nonSpending(description, pluggyCategory, tx);
  if (skip) return skip;

  const candidates = [description, stripAccents(description)];

  for (const rule of rules) {
    if (rule.contexto && rule.contexto !== contexto) continue;
    let regex;
    try {
      regex = new RegExp(rule.pattern, 'i');
    } catch {
      continue;
    }
    if (candidates.some((c) => regex.test(c))) {
      return {
        pulmao: contexto === 'PJ' ? null : rule.pulmao,
        categoria: rule.categoria,
        confianca: rule.confianca,
      };
    }
  }

  const categoryLabel = pluggyCategory || 'Outros';
  if (contexto === 'PJ') return { pulmao: null, categoria: categoryLabel, confianca: 0.5 };

  const hit = PLUGGY_CATEGORY_MAP.find((m) => m.match.test(categoryLabel));
  if (hit) {
    return { pulmao: hit.pulmao, categoria: hit.categoria || categoryLabel, confianca: 0.6 };
  }
  return { pulmao: 3, categoria: categoryLabel, confianca: 0.2 };
}

/**
 * Pluggy: conta corrente usa amount < 0 para saída; cartão de crédito usa
 * amount > 0 para compra. No Shlomo, despesa vira valor positivo (é o que o
 * resumo dos pulmões soma) e receita fica fora dos pulmões.
 */
function isExpense(tx, accountType) {
  return accountType === 'CREDIT' ? tx.amount > 0 : tx.amount < 0;
}

/**
 * despesa | receita | estorno | transferencia — é o que separa consumo de
 * dinheiro que só trocou de lugar (Pix entre pessoas, pagamento de fatura).
 */
// Pagamento de fatura e aplicação/resgate só trocam o dinheiro de lugar
const MOVES_MONEY = /credit card payment|pagamento de fatura|invest|fund/i;

function natureza(expense, accountType, classification) {
  const categoria = classification.categoria || '';
  if (MOVES_MONEY.test(categoria)) return 'transferencia';
  // Pix recebido (de cliente ou de pessoa) conta como receita; no cartão, crédito é estorno
  if (!expense) return accountType === 'CREDIT' ? 'estorno' : 'receita';
  return /transfer/i.test(categoria) ? 'transferencia' : 'despesa';
}

// ---------- Sync ----------

async function getOwnerUser() {
  return prisma.user.upsert({
    where: { whatsappNumber: OWNER_WHATSAPP },
    update: {},
    create: { whatsappNumber: OWNER_WHATSAPP, nome: 'Mateus Vinícius', plano: 'premium' },
  });
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Cria/atualiza a conexão local a partir de um itemId do Pluggy e importa
 * contas + transações. Idempotente: pode ser chamado várias vezes.
 */
async function syncItem(itemId, { contexto, days, reclassify = false } = {}) {
  const item = await pluggy.getItem(itemId);
  const user = await getOwnerUser();

  const existing = await prisma.bankConnection.findUnique({ where: { pluggyItemId: itemId } });
  const connectionContexto = contexto || existing?.contexto || 'PF';

  const connection = await prisma.bankConnection.upsert({
    where: { pluggyItemId: itemId },
    update: {
      status: item.status,
      connectorName: item.connector?.name || 'Banco',
      connectorLogo: item.connector?.imageUrl || null,
      contexto: connectionContexto,
      error: item.error?.message || null,
    },
    create: {
      pluggyItemId: itemId,
      status: item.status,
      connectorName: item.connector?.name || 'Banco',
      connectorLogo: item.connector?.imageUrl || null,
      contexto: connectionContexto,
      error: item.error?.message || null,
      userId: user.id,
    },
  });

  // Enquanto o Pluggy ainda está coletando, não há o que importar; o webhook
  // (ou um novo /sync) traz os dados quando o item ficar UPDATED.
  if (item.status === 'UPDATING' || item.status === 'LOGIN_ERROR' || item.status === 'WAITING_USER_INPUT') {
    return { connection, imported: 0, updated: 0, status: item.status };
  }

  // Primeira sync puxa N dias; as seguintes, desde a última sync com folga
  // de 7 dias para pegar lançamentos que o banco posta com atraso.
  const to = new Date();
  const from = existing?.lastSyncAt && !days
    ? new Date(existing.lastSyncAt.getTime() - 7 * 86400000)
    : new Date(to.getTime() - (days || DEFAULT_SYNC_DAYS) * 86400000);

  const rules = await loadRules();
  const accounts = await pluggy.listAccounts(itemId);
  let imported = 0;
  let updated = 0;

  for (const acc of accounts) {
    const account = await prisma.bankAccount.upsert({
      where: { pluggyAccountId: acc.id },
      update: { nome: acc.marketingName || acc.name, saldo: acc.balance ?? 0, subtipo: acc.subtype, numero: acc.number },
      create: {
        pluggyAccountId: acc.id,
        connectionId: connection.id,
        nome: acc.marketingName || acc.name,
        tipo: acc.type,
        subtipo: acc.subtype,
        numero: acc.number,
        saldo: acc.balance ?? 0,
        moeda: acc.currencyCode || 'BRL',
      },
    });

    const txs = await pluggy.listTransactions(acc.id, { from: isoDate(from), to: isoDate(to) });
    for (const tx of txs) {
      const description = tx.description || tx.descriptionRaw || 'Sem descrição';
      const expense = isExpense(tx, acc.type);
      const classification = expense
        ? classify(description, tx.category, connectionContexto, rules, tx)
        : { pulmao: null, categoria: tx.category || 'Receita', confianca: 0.6 };
      const kind = natureza(expense, acc.type, classification);

      const prev = await prisma.transaction.findUnique({ where: { externalId: tx.id } });
      if (prev) {
        // Não sobrescreve classificação que o usuário já corrigiu: só data/valor/descrição,
        // a menos que a reclassificação tenha sido pedida explicitamente
        await prisma.transaction.update({
          where: { id: prev.id },
          data: {
            data: new Date(tx.date),
            descricao: description,
            valor: Math.abs(tx.amount),
            natureza: kind,
            ...(reclassify && {
              contexto: connectionContexto,
              pulmao: classification.pulmao,
              categoria: classification.categoria,
              confianca: classification.confianca,
            }),
          },
        });
        updated += 1;
      } else {
        await prisma.transaction.create({
          data: {
            externalId: tx.id,
            origem: 'pluggy',
            data: new Date(tx.date),
            descricao: description,
            valor: Math.abs(tx.amount),
            natureza: kind,
            contexto: connectionContexto,
            pulmao: classification.pulmao,
            categoria: classification.categoria,
            confianca: classification.confianca,
            bankAccountId: account.id,
            userId: connection.userId,
          },
        });
        imported += 1;
      }
    }
  }

  const finalConnection = await prisma.bankConnection.update({
    where: { id: connection.id },
    data: { lastSyncAt: new Date() },
    include: { accounts: true },
  });

  logger.info({ itemId, imported, updated }, 'Pluggy sync concluída');
  return { connection: finalConnection, imported, updated, status: item.status };
}

module.exports = { syncItem, classify, isExpense, prisma };
