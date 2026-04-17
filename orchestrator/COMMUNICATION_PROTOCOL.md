# Interface de Comunicação Orquestrador ↔ Squads

Este documento descreve o protocolo de comunicação entre o orquestrador central e as squads.

## Protocolo de Comando

### 1. Arquivo de Comando (`orchestrator-command.json`)

Localização: `squads/{squad-name}/orchestrator-command.json`

Estrutura:
```json
{
  "intent": {
    "action": "execute",
    "parameters": {
      "input_file": "squads/shlomo-engineering/input/fatura-marco.pdf",
      "mes_referencia": "2026-03",
      "follow_up_query": null
    }
  },
  "user_message": "Processa essa fatura do Nubank de março",
  "from": "5511999999999@c.us",
  "timestamp": "2026-04-17T03:45:00.000Z",
  "callback_url": "http://localhost:3001/webhook/squad-complete"
}
```

### 2. Arquivo de Estado (`state.json`)

Localização: `squads/{squad-name}/state.json`

O Runner Pipeline já gerencia este arquivo. O orquestrador faz polling para verificar status.

Estados possíveis:
- `"status": "idle"` - Squad pronta para executar
- `"status": "running"` - Em execução
- `"status": "completed"` - Concluída com sucesso
- `"status": "failed"` - Falhou (ver campo `error`)

### 3. Webhook de Callback (Opcional)

Para squads que suportam callback, o orquestrador expõe:

**Endpoint:** `POST /webhook/squad-complete`

Payload:
```json
{
  "squad_id": "shlomo-engineering",
  "run_id": "2026-04-17-034500",
  "status": "completed",
  "output_summary": {
    "total_transacoes": 68,
    "saldo_livre": 4700.00,
    "pulmoes_status": "OK"
  },
  "completed_at": "2026-04-17T03:47:30.000Z"
}
```

---

## Fluxo Detalhado de Comunicação

### Fase 1: Dispatch

```
Orquestrador → Escreve orchestrator-command.json
            → (Opcional) Anexa arquivo em input/
            → Aguarda state.json mudar para "running"
```

### Fase 2: Execução

```
Squad Runner → Lê orchestrator-command.json
            → Inicia pipeline
            → Atualiza state.json para "running"
            → Executa steps...
            → Atualiza state.json para "completed" ou "failed"
```

### Fase 3: Coleta de Resultado

```
Orquestrador → Detecta state.json "completed"
            → Lê output file (dashboard-data.json ou similar)
            → Extrai resumo relevante
            → Constrói resposta natural
            → Envia via WhatsApp
            → Limpa orchestrator-command.json
```

---

## Tratamento de Erros

### Caso 1: Timeout

Se `state.json` não mudar para "completed" em 10 minutos:
```
Orquestrador → Cancela execução
            → Marca comando como falho
            → Notifica usuário: "⏰ A squad demorou mais que o esperado. Tente novamente."
```

### Caso 2: Falha na Squad

Se `state.json.status === "failed"`:
```
Orquestrador → Lê campo state.json.error
            → Reporta erro ao usuário de forma amigável
            → Mantém arquivos de debug para análise
```

### Caso 3: Conflito de Execução

Se duas mensagens chegam simultaneamente:
```
Orquestrador → Primeira executa imediatamente
            → Segunda entra na fila (queue)
            → Processa quando primeira completar
```

---

## Exemplo Completo

### Input do Usuário (WhatsApp)
> [Áudio transcrito] "Quanto eu gastei com iFood esse mês?"

### Processamento do Orquestrador

1. **Classificação de intenção:**
   ```json
   {
     "intent": "query_data",
     "squad": "shlomo-engineering",
     "query": "gasto_por_categoria",
     "categoria": "IFOOD",
     "periodo": "mes_atual"
   }
   ```

2. **Verifica se há dados recentes:**
   ```bash
   ls -lt squads/shlomo-engineering/output/*/dashboard-data.json | head -1
   ```
   
   Encontrado: `squads/shlomo-engineering/output/2026-04-17-034500/dashboard-data.json`

3. **Extrai informação:**
   - Lê JSON
   - Filtra transações onde descricao.includes('IFOOD')
   - Soma valores: R$ 89,90 + R$ 45,00 + R$ 120,00 = R$ 254,90

4. **Constrói resposta:**
   ```
   Você gastou R$ 254,90 com iFood este mês (Pulmão 3 - Lazer/Restaurantes).
   
   Isso representa 7.5% do seu teto do Pulmão 3 (R$ 4.620).
   
   Está dentro do limite! ✅
   ```

5. **Envia via WhatsApp MCP**

---

## Monitoramento e Logs

### Log do Orquestrador

Arquivo: `orchestrator/orchestrator.log`

Formato:
```
[2026-04-17T03:45:00.000Z] 📨 Comando recebido de 5511999999999@c.us: "Processa essa fatura..."
[2026-04-17T03:45:01.000Z] 🎯 Squad identificada: shlomo-engineering
[2026-04-17T03:45:01.000Z] 🚀 Executando squad...
[2026-04-17T03:47:30.000Z] ✅ Squad completada em 150s
[2026-04-17T03:47:31.000Z] 📤 Resposta enviada via WhatsApp
```

### Log da Squad

Cada squad mantém logs em: `squads/{squad-name}/_memory/runs.md`

Registrado após cada execução:
```markdown
| Data       | Run ID              | Tema                  | Output                | Resultado |
|------------|---------------------|-----------------------|-----------------------|-----------|
| 2026-04-17 | 2026-04-17-034500  | Fatura Nubank Março  | dashboard-data.json   | Aprovado  |
```

---

## Próximas Melhorias

1. **Websocket em tempo real** ao invés de polling
2. **Sistema de prioridade** (usuário VIP > normal)
3. **Cache de consultas frequentes** (evita reprocessar mesma pergunta)
4. **Dashboard web** para monitorar execuções
5. **Retry inteligente** com aprendizado de falhas anteriores
