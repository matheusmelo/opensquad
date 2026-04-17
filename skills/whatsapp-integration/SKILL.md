---
name: WhatsApp Integration
description: "Integração com WhatsApp para receber áudios, transcrever e transformar em prompts estruturados para squads"
type: mcp
version: 0.1.0
author: Shlomo Engineering
requirements:
  - "@modelcontextprotocol/server-whatsapp"
  - "whatsapp-web.js"
  - "@deepgram/sdk"
---

# WhatsApp Integration Skill

Esta skill permite que o Opensquad receba comandos via WhatsApp, transcreva áudios automaticamente e direcione para as squads corretas.

## Funcionalidades

1. **Recebimento de Mensagens**
   - Escuta mensagens de texto e áudio do WhatsApp
   - Suporta múltiplos números/remetentes
   - Rate limiting para evitar spam

2. **Transcrição de Áudio**
   - Converte arquivos `.opus`/`.m4a` para texto usando Deepgram API
   - Suporte a português brasileiro (pt-BR)
   - Detecção automática de idioma

3. **Interpretação de Intenção**
   - Classifica mensagem como: comando de squad, pergunta geral, feedback
   - Extrai entidades: nome da squad, ação desejada, parâmetros
   - Mapeia para prompt estruturado

4. **Roteamento para Squads**
   - Direciona prompt para squad correta baseado na intenção
   - Mantém contexto de conversas anteriores
   - Notifica usuário quando squad inicia/conclui tarefa

## Configuração MCP

Adicionar ao `.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "whatsapp": {
      "command": "node",
      "args": ["skills/whatsapp-integration/mcp-whatsapp-server.js"],
      "env": {
        "WHATSAPP_SESSION_PATH": "./sessions/whatsapp",
        "DEEPGRAM_API_KEY": "sua_chave_aqui",
        "OPENAI_API_KEY": "sua_chave_aqui",
        "OPENSQUAD_BASE_PATH": "C:/inetpub/opensquad"
      }
    }
  }
}
```

## Comandos Suportados via WhatsApp

### 1. Executar Squad
```
/shlomo processe minha fatura do Nubank de março
```
→ Dispara squad `shlomo-engineering` com PDF anexado

### 2. Enviar Arquivo
```
[PDF anexado] + "Classifica isso pra mim"
```
→ Upload de arquivo + comando implícito de classificação

### 3. Status da Squad
```
/status shlomo-engineering
```
→ Reporta progresso atual da squad

### 4. Consulta Financeira
```
Quanto gastei com Uber esse mês?
```
→ Query no dashboard-data.json mais recente

### 5. Áudio para Prompt
```
[Áudio: "Quero adicionar uma nova regra de classificação: 
toda compra na Amazon vai pro Pulmão 2"]
```
→ Transcreve → interpreta → atualiza classification-rules.yaml

## Fluxo de Processamento

```
1. Recebe mensagem/áudio
       ↓
2. Se áudio → Transcreve com Deepgram API
       ↓
3. Extrai intenção com GPT-4o-mini
       ↓
4. Identifica squad alvo
       ↓
5. Constrói prompt estruturado
       ↓
6. Dispatch via Task tool
       ↓
7. Notifica usuário quando concluído
```

## Exemplo de Interpretação

**Input (áudio transcrito):**
> "E aí, processa essa fatura do Nubank que eu mandei ontem e me fala quanto que eu gastei no total e quanto que tá sobrando"

**Output estruturado:**
```yaml
intent: execute_squad
squad: shlomo-engineering
parameters:
  action: parse_and_classify
  file_reference: "fatura-nubank-marco.pdf"
  follow_up_query: "total_gasto e saldo_livre"
  
prompt_for_squad: |
  Processe o arquivo fatura-nubank-marco.pdf localizado em 
  squads/shlomo-engineering/input/. Extraia todas as transações, 
  classifique pelo método dos 3 Pulmões e retorne:
  1. Total gasto por pulmão
  2. Saldo livre do mês
  3. Alertas se algum pulmão excedeu o teto
```

## Dependências

Instalar com:
```bash
npm install whatsapp-web.js @deepgram/sdk openai qrcode-terminal
```

## Server MCP (`mcp-whatsapp-server.js`)

O servidor implementa:
- Conexão com WhatsApp Web via QR Code
- Listener de mensagens incoming
- Download de mídia (áudio/PDF)
- Transcrição assíncrona
- Callback para Opensquad engine

Ver código completo em `skills/whatsapp-integration/mcp-whatsapp-server.js`

## Anti-Patterns

- NUNCA execute squads sem confirmação explícita do usuário (exceto se configurado como auto-run)
- NUNCA armazene áudios sensíveis sem criptografia
- SEMPRE notifique usuário sobre falhas na transcrição ou interpretação
- NÃO misture sessões de WhatsApp de diferentes usuários
