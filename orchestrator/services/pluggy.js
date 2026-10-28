/**
 * Cliente mínimo da API Pluggy (Open Finance).
 * Docs: https://docs.pluggy.ai
 *
 * Usa PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET do .env. A apiKey dura 2h,
 * então fica em cache e é renovada um pouco antes de expirar.
 */
const logger = require('./logger');

const PLUGGY_API_URL = process.env.PLUGGY_API_URL || 'https://api.pluggy.ai';
const API_KEY_TTL_MS = 110 * 60 * 1000; // 1h50 (a chave vale 2h)

let cachedApiKey = null;
let cachedApiKeyExpiresAt = 0;

class PluggyError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'PluggyError';
    this.status = status;
    this.details = details;
  }
}

// fetch só rejeita em falha de rede (DNS, proxy, firewall) — vira erro legível
async function pluggyFetch(url, init) {
  try {
    return await fetch(url, init);
  } catch (error) {
    throw new PluggyError(`Não foi possível alcançar ${PLUGGY_API_URL} (${error.cause?.code || error.message})`, 502);
  }
}

function isConfigured() {
  return Boolean(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET);
}

async function getApiKey() {
  if (cachedApiKey && Date.now() < cachedApiKeyExpiresAt) return cachedApiKey;
  if (!isConfigured()) {
    throw new PluggyError('PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET não configurados no .env', 503);
  }

  const res = await pluggyFetch(`${PLUGGY_API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.apiKey) {
    throw new PluggyError('Falha ao autenticar no Pluggy (confira client id/secret)', res.status, body);
  }

  cachedApiKey = body.apiKey;
  cachedApiKeyExpiresAt = Date.now() + API_KEY_TTL_MS;
  return cachedApiKey;
}

async function request(method, pathname, { query, body, retry = true } = {}) {
  const apiKey = await getApiKey();
  const url = new URL(pathname, PLUGGY_API_URL);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }

  const res = await pluggyFetch(url, {
    method,
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  // apiKey expirou antes do previsto: renova uma vez e tenta de novo
  if (res.status === 401 && retry) {
    cachedApiKey = null;
    return request(method, pathname, { query, body, retry: false });
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    logger.error({ status: res.status, data }, `Pluggy ${method} ${pathname} falhou`);
    throw new PluggyError(data?.message || `Erro Pluggy ${res.status}`, res.status, data);
  }
  return data;
}

/**
 * Token de curta duração para abrir o widget Pluggy Connect no front.
 * Com itemId, o widget abre no modo "atualizar credenciais" daquele item.
 */
async function createConnectToken({ itemId, clientUserId } = {}) {
  // Sem avoidDuplicates: o MeuPluggy não tem credenciais, então qualquer item
  // anterior conta como "duplicado" e o widget falha com ITEM_USER_ALREADY_EXISTS
  const options = { clientUserId };
  if (process.env.PLUGGY_WEBHOOK_URL) options.webhookUrl = process.env.PLUGGY_WEBHOOK_URL;
  const data = await request('POST', '/connect_token', { body: { itemId, options } });
  return data.accessToken;
}

const getItem = (itemId) => request('GET', `/items/${itemId}`);
const refreshItem = (itemId) => request('PATCH', `/items/${itemId}`, { body: {} });
const deleteItem = (itemId) => request('DELETE', `/items/${itemId}`);

async function listAccounts(itemId) {
  const data = await request('GET', '/accounts', { query: { itemId } });
  return data.results || [];
}

/**
 * Busca todas as transações de uma conta no período (GET /v2/transactions,
 * paginado por cursor — o /transactions antigo foi desativado pelo Pluggy).
 */
async function listTransactions(accountId, { from, to } = {}) {
  const all = [];
  let cursor;
  do {
    const data = await request('GET', '/v2/transactions', {
      query: { accountId, dateFrom: from, dateTo: to, cursor },
    });
    all.push(...(data.results || []));
    cursor = data.next || undefined;
  } while (cursor);
  return all;
}

module.exports = {
  PluggyError,
  isConfigured,
  createConnectToken,
  getItem,
  refreshItem,
  deleteItem,
  listAccounts,
  listTransactions,
};
