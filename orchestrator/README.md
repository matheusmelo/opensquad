---
name: Opensquad Orchestrator
description: "Orquestrador central que recebe comandos via WhatsApp e direciona para squads corretas baseado em intenção do usuário"
version: 0.1.0
type: mcp
---

# Opensquad Orchestrator

O orquestrador é o cérebro que conecta WhatsApp → Interpretação de Intenção → Squads → Resposta.

## Arquitetura

```
┌──────────────┐
│  WhatsApp    │ ← Usuário envia áudio/texto/PDF
└──────┬───────┘
       │
       ↓
┌──────────────────┐
│  Intent Parser   │ ← Classifica intenção com GPT-4
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│ Squad Router     │ ← Escolhe squad correta
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│  Squad Executor  │ ← Dispara pipeline da squad
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│ Response Builder  │ ← Prepara resposta concisa
└──────┬───────────┘
       │
       ↓
┌──────────────┐
│  WhatsApp    │ ← Envia resposta ao usuário
└──────────────┘
```

## Arquivos Criados

### 1. `orchestrator/orchestrator.js`
Servidor MCP principal que gerencia todo o fluxo.

### 2. `orchestrator/intent-parser.js`
Módulo de NLP para classificar intenções usando GPT-4o-mini.

### 3. `orchestrator/squad-registry.json`
Registro de todas as squads disponíveis e seus propósitos.

### 4. `orchestrator/queue-manager.js`
Gerencia fila de execuções assíncronas (evita sobrecarga).

### 5. `orchestrator/response-builder.js`
Transforma output técnico da squad em mensagem natural para WhatsApp.

## Configuração

Adicionar ao `.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "orchestrator": {
      "command": "node",
      "args": ["orchestrator/orchestrator.js"],
      "env": {
        "OPENAI_API_KEY": "sua_chave_aqui",
        "OPENSQUAD_BASE_PATH": "C:/inetpub/opensquad",
        "WHATSAPP_BOT_NUMBER": "5511999999999",
        "MAX_CONCURRENT_SQUADS": 3
      }
    }
  }
}
```

## Fluxo de Execução

### Exemplo 1: Processar Fatura via Áudio

**Usuário (WhatsApp):**
> [Áudio] "Processa essa fatura do Nubank de março e me fala quanto eu gastei no total"

**Orquestrador:**
1. Recebe áudio → transcreve com Deepgram
2. GPT identifica: `{ intent: "execute_squad", squad: "shlomo-engineering", action: "parse_fatura", mes: "marco" }`
3. Roteia para squad `shlomo-engineering`
4. Monitora execução via `state.json`
5. Quando conclui, extrai resumo: "Total gasto: R$ 5.432. Saldo livre: R$ 4.700."
6. Responde via WhatsApp

### Exemplo 2: Consulta Financeira

**Usuário:**
> "Quanto eu gastei com Uber esse mês?"

**Orquestrador:**
1. Identifica: `{ intent: "query_data", squad: "shlomo-engineering", query_type: "gasto_por_categoria", categoria: "Uber", periodo: "mes_atual" }`
2. Lê `dashboard-data.json` mais recente
3. Extrai dado: Pulmão 1 → Transporte → Uber = R$ 234,50
4. Responde: "Você gastou R$ 234,50 com Uber este mês (Pulmão 1 - Essenciais)."

### Exemplo 3: Adicionar Regra de Classificação

**Usuário:**
> [Áudio] "Quero que toda compra na Amazon vá pro Pulmão 2"

**Orquestrador:**
1. Identifica: `{ intent: "add_classification_rule", pattern: "AMAZON", pulmao: "Pulmao 2", confianca_minima: 0.85 }`
2. Lê `classification-rules.yaml` atual
3. Adiciona nova regra
4. Valida YAML
5. Confirma: "✅ Regra criada: compras na Amazon → Pulmão 2"

## Squad Registry

`squad-registry.json`:
```json
{
  "squads": {
    "shlomo-engineering": {
      "name": "Shlomo Engineering",
      "description": "Processa faturas, classifica transações, constrói dashboards financeiros",
      "icon": "🔧",
      "triggers": ["fatura", "classificar", "dashboard", "gasto", "uber", "nubank", "pulmao"],
      "pipeline_file": "squads/shlomo-engineering/pipeline/steps/01-parse-financial-data.md",
      "input_folder": "squads/shlomo-engineering/input/",
      "output_file": "squads/shlomo-engineering/output/{run_id}/dashboard-data.json",
      "auto_run": true
    },
    "gestao-pessoal": {
      "name": "Gestão Pessoal & Finanças",
      "description": "Gerencia agenda, finanças caóticas PF/PJ, desenvolve app customizado",
      "icon": "💼",
      "triggers": ["agenda", "rotina", "tempo", "organizar documentos"],
      "pipeline_file": "squads/gestao-pessoal/pipeline/rotina-diaria.md",
      "auto_run": false
    }
  }
}
```

## Queue Manager

Evita que múltiplas squads rodem simultaneamente e sobrecarreguem o sistema.

Features:
- Máximo de N squads concurrentes (configurável)
- Retry automático se squad falhar
- Timeout de 10 minutos por execução
- Prioridade: usuário > agendado > batch

## Response Builder

Transforma output técnico em linguagem natural:

**Input (dashboard-data.json):**
```json
{
  "pulmoes": {
    "Pulmao 1": {"gasto": 5800, "teto": 7700, "status": "OK"}
  },
  "saldo_livre": 4700
}
```

**Output (WhatsApp):**
```
📊 Resumo Financeiro - Março/2026

Pulmão 1 (Essenciais): R$ 5.800 / R$ 7.700 (75%) ✅
Pulmão 2 (Eventuais): R$ 1.500 / R$ 3.080 (49%) ✅
Pulmão 3 (Lazer): R$ 3.400 / R$ 4.620 (74%) ✅

Saldo Livre: R$ 4.700 💰

Tudo dentro dos limites! 👍
```

## Próximos Passos

1. Implementar webhook para squad notificar orquestrador quando concluir
2. Adicionar sistema de agendamento ("processe minha fatura todo dia 10")
3. Criar dashboard web do orquestrador (monitoramento em tempo real)
4. Implementar autenticação multi-usuário (cada usuário tem suas squads/dados)
