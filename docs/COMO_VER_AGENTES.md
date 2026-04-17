# 🎯 Guia Completo - Monitoramento de Agentes Autônomos

## 📊 Interface de Monitoramento em Tempo Real

### Como Acessar

1. **Inicie o Dashboard:**
   ```bash
   cd shlomo-ledger
   npm run dev
   # Acesse: http://localhost:5173
   ```

2. **Clique no botão "Agentes"** no header (ícone Activity)
   
3. **Veja em tempo real:**
   - Quais agentes estão trabalhando
   - Progresso de cada tarefa (%)
   - Modelo de IA sendo usado
   - Custo acumulado por agente
   - Tempo decorrido da execução

---

## 🔍 O Que Você Vai Ver

### Dashboard Principal

```
┌─────────────────────────────────────────────────┐
│  Agent Monitor Dashboard                        │
│  Monitore todos os agentes autônomos            │
└─────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬──────────┐
│ Ativas   │ Feitas   │ Online   │ Custo    │
│    3     │   23     │   11     │  $0.08   │
└──────────┴──────────┴──────────┴──────────┘

┌─────────────────────────────────────────────────┐
│ Squad: shlomo-engineering           [Executando│
│ Run ID: 2026-04-17-020845                       │
│ Progresso: 2/4 steps                            │
│                                                 │
│ ┌──────────────┐ ┌──────────────┐              │
│ │PDF Parser    │ │Classification│              │
│ │[████░░░░] 40%│ │[███░░░░░] 30%│              │
│ │Claude Haiku  │ │Gemini Flash  │              │
│ │$0.002        │ │FREE          │              │
│ └──────────────┘ └──────────────┘              │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Testando AGORA MESMO

### Opção 1: Via WhatsApp (Sistema Completo)

```bash
# Terminal 1: Orchestrator
cd orchestrator
node orchestrator.js

# Terminal 2: WhatsApp Bot
cd skills/whatsapp-integration
node mcp-whatsapp-server.js
# Escaneie QR Code

# Terminal 3: Dashboard
cd shlomo-ledger
npm run dev

# Envie via WhatsApp:
[Anexa PDF] + "Processa essa fatura"

# Abra dashboard → Clique "Agentes"
# Veja agentes trabalhando em tempo real!
```

### Opção 2: Via Comando /dev-with-ai

```bash
# No Kilo:
/dev-with-ai "crie componente de gráfico de pizza"

# Enquanto executa, abra:
http://localhost:5173 → Aba "Agentes"

# Veja:
# - Senior Dev trabalhando (Claude Sonnet)
# - QA Tester validando (Gemini Flash - FREE)
# - Tech Writer documentando (Claude Haiku - FREE)
```

---

## 📱 Telas Disponíveis

### 1. Dashboard Financeiro PF (Existente)
- Cards dos 3 Pulmões
- Gráfico mensal
- Tabela de transações
- Upload de PDFs

### 2. Dashboard PJ Orion (Novo - Gemini)
- CampaignCard (métricas de campanhas)
- LaunchTimeline (lançamentos meteóricos)
- RoyaltyTracker (ganhos com música)

### 3. Agent Monitor (NOVO - Kilo) ⭐
- Execuções em tempo real
- Status de cada agente
- Custos por tarefa
- Progresso visual
- Histórico de execuções

---

## 🎬 Fluxo Visual Completo

```
Usuário envia PDF via WhatsApp
         ↓
┌────────────────────────┐
│ ORCHESTRATOR           │ ← Webhook recebido
│ Roteia para squad      │
└──────────┬─────────────┘
           ↓
┌────────────────────────┐
│ SQUAD EXECUTION        │ ← state.json atualizado
│ agents[].status =      │   a cada 2 segundos
│   'working'/'done'     │
└──────────┬─────────────┘
           ↓
┌────────────────────────┐
│ MONITOR API            │ ← GET /api/monitor/executions
│ Agrega dados de todas  │   (polling a cada 3s)
│ as squads              │
└──────────┬─────────────┘
           ↓
┌────────────────────────┐
│ REACT DASHBOARD        │ ← Atualiza UI automaticamente
│ AgentMonitor.tsx       │   Barras de progresso,
│                        │   status colors, custos
└────────────────────────┘
```

---

## 🔧 Troubleshooting

### Dashboard não mostra agentes

**Problema:** Tela vazia ou "Nenhuma Execução Ativa"

**Solução:**
1. Verifique se orchestrator está rodando:
   ```bash
   curl http://localhost:3001/api/monitor/executions
   # Deve retornar JSON com execuções
   ```

2. Se vazio, inicie uma tarefa:
   ```bash
   # WhatsApp: envie PDF
   # Ou comando:
   /dev-with-ai "teste"
   ```

### Agentes não aparecem em tempo real

**Problema:** Dashboard não atualiza

**Solução:**
1. Verifique console do navegador (F12)
2. Auto-refresh deve estar ativado (botão verde)
3. Recarregue página (Ctrl+R)

### Custos não aparecem

**Problema:** Campo "custo" mostrando $0.00

**Solução:**
1. Verifique se arquivo existe:
   ```bash
   ls orchestrator/logs/ai-usage.json
   ```

2. Crie arquivo manualmente:
   ```bash
   echo '[]' > orchestrator/logs/ai-usage.json
   ```

---

## 💡 Dicas Pro

### 1. Múltiplas Abas
Abra simultaneamente:
- `http://localhost:5173` → Dashboard React
- `http://localhost:3001/health` → Healthcheck API
- WhatsApp Web → Envie comandos

### 2. Logs em Tempo Real
```bash
# Orchestrator logs
tail -f orchestrator/orchestrator.log

# WhatsApp logs
tail -f skills/whatsapp-integration/logs/whatsapp.log

# AI usage logs
tail -f orchestrator/logs/ai-usage.json
```

### 3. Forçar Atualização
No dashboard, clique "Pausar" → "Retomar" para refresh imediato

---

## 🎯 Resumo: Como Ver Agentes Trabalhando

| Método | Tempo Real? | Detalhes? | Fácil? |
|--------|-------------|-----------|--------|
| **Dashboard React** | ✅ Sim (3s) | ✅ Completa | ✅ Muito |
| **API Direct** | ✅ Sim | ✅ Raw JSON | ⚠️ Médio |
| **PM2 Logs** | ✅ Sim | ❌ Texto only | ✅ Fácil |
| **WhatsApp** | ❌ Só final | ❌ Resumo | ✅ Muito |

**Recomendado:** Dashboard React + WhatsApp aberto simultaneamente!

---

**Agora é só abrir o dashboard e ver a mágica acontecer!** 🚀

Os agentes vão aparecer como cards coloridos mostrando exatamente o que cada um está fazendo, qual IA estão usando e quanto está custando.
