# 📱 Guia Completo - Conectar WhatsApp ao Opensquad

## 🎯 Objetivo

Conectar seu número do WhatsApp pessoal ao orchestrator para:
- Controlar agentes autônomos via mensagens
- Receber notificações em tempo real
- Enviar comandos de desenvolvimento
- Consultar dados financeiros do Shlomo Ledger

---

## 🚀 Método 1: Conexão Local (Testes)

### Passo a Passo

```bash
# Terminal 1: Iniciar WhatsApp Bot
cd skills/whatsapp-integration
npm install whatsapp-web.js qrcode-terminal deepgram-sdk openai
node mcp-whatsapp-server.js
```

**Output esperado:**
```
🚀 Iniciando WhatsApp MCP Server...
📱 Escaneie o QR Code do WhatsApp:
[QR CODE APARECE AQUI]
```

### Escanear QR Code

1. Abra WhatsApp no celular
2. Configurações → Dispositivos conectados → Conectar dispositivo
3. Aponte câmera para QR Code no terminal
4. Aguarde mensagem "✅ WhatsApp client pronto!"

### Testar Conexão

Envie pelo WhatsApp:
```
Teste
```

Deve receber:
```
🤖 Olá! Sou seu assistente Opensquad.

Comandos disponíveis:
/dev <tarefa> - Desenvolver feature
/status <squad> - Ver status
/custos - Ver custos de IA
/help - Ajuda completa
```

---

## ☁️ Método 2: Conexão Cloud (Produção 24/7)

### Opção A: Railway.app (Recomendado)

1. **Deploy do WhatsApp Bot:**
   ```bash
   # Adicionar variáveis no Railway
   WHATSAPP_SESSION_PATH=/data/sessions
   DEEPGRAM_API_KEY=sua_chave_aqui
   OPENAI_API_KEY=sua_chave_aqui
   OPENSQUAD_BASE_PATH=/app
   
   # Deploy
   railway up --detach
   ```

2. **Persistir Sessão:**
   - Primeira vez: escaneia QR Code
   - Sessão salva em volume persistente
   - Não precisa reescanear após restart

3. **Webhook Configuration:**
   ```
   WhatsApp Number: +55 11 XXXXX-XXXX (seu número)
   Webhook URL: https://seu-app.railway.app/webhook/whatsapp
   ```

### Opção B: Twilio API (Enterprise)

1. **Setup Twilio:**
   ```bash
   npm install twilio
   ```

2. **Configurar Twilio CLI:**
   ```bash
   twilio login
   twilio phone-numbers:update +1234567890 \
     --sms-url=https://seu-app.com/webhook/twilio
   ```

3. **Vantagens:**
   - Número dedicado
   - Múltiplos usuários
   - Logs detalhados
   - Suporte oficial

---

## 🔧 Configuração Avançada

### 1. Multi-Usuário Setup

Se quiser que várias pessoas usem:

```javascript
// orchestrator/whatsapp-users.js
const USERS = {
  '5511999999999': { name: 'Mateus', role: 'admin', squads: ['all'] },
  '5511888888888': { name: 'User2', role: 'member', squads: ['shlomo'] }
};

function authorizeUser(phoneNumber) {
  return USERS[phoneNumber] || null;
}
```

### 2. Rate Limiting

Para evitar spam:

```javascript
const rateLimit = require('express-rate-limit');

const whatsappLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // 50 mensagens por janela
  message: '⚠️ Limite excedido. Tente novamente em 15 minutos.'
});

app.use('/webhook/whatsapp', whatsappLimiter);
```

### 3. Audio Transcription

Para processar áudios:

```javascript
// Já implementado em mcp-whatsapp-server.js
// Usa Deepgram API para transcrever

// Custo: ~$0.0043/minuto de áudio
// Precisão: 95%+ em português brasileiro
```

---

## 📱 Comandos Disponíveis no WhatsApp

### Desenvolvimento (`/dev`)

```
/dev crie componente de upload
→ Roteia para squad shlomo-autodev
→ Senior Dev implementa
→ QA valida
→ DevOps faz deploy
→ Responde: "✅ Feature pronta! https://..."
```

### Debug (`/debug`)

```
/debug parser está falhando com PDF do Nubank
→ Analisa erro nos logs
→ Gemini Pro investiga
→ Sugere fix
→ Aplica e testa
→ Responde: "🐛 Bug corrigido! Commit abc123"
```

### Status (`/status`)

```
/status shlomo-engineering
→ Lê state.json
→ Retorna:
📊 Squad: shlomo-engineering
Status: Executando
Step: 2/4 - Classification Engine
Agentes: 
  ✅ PDF Parser (done)
  🔵 Classification (working 60%)
  ⚪ Dashboard Builder (idle)
  ⚪ QA Validator (idle)
```

### Custos (`/custos`)

```
/custos
→ Query em ai-usage.json
→ Retorna:
💰 Custos Hoje:
Claude Haiku: $0.00 (89 tasks)
Gemini Flash: $0.00 (23 tasks)
Claude Sonnet: $1.80 (12 tasks)
GPT-4o Mini: $0.65 (3 tasks)

Total: $2.45/dia
Economia: 96% vs GPT-4 puro
```

### Help (`/help`)

```
/help
→ Retorna lista completa de comandos
→ Exemplos de uso
→ Documentação online
```

---

## 🎬 Fluxo Completo de Uso

### Cenário 1: Desenvolver Feature

```
Você (WhatsApp):
/dev adicione export CSV nas transações

Sistema:
1. Orchestrator recebe mensagem
2. Roteia para /dev-with-ai
3. Task Router analisa: complexidade 6/10
4. Seleciona Claude Sonnet ($0.003/1k)
5. Squad shlomo-autodev executa:
   ├─ Tech Lead especifica
   ├─ Senior Dev implementa
   ├─ QA Engineer testa
   └─ DevOps faz deploy
6. Webhook callback enviado
7. Você recebe:

✅ Feature "Export CSV" implementada!
   Componente: TransactionTable.tsx
   Endpoint: GET /api/transactions/export?format=csv
   Deploy: https://shlomo-ledger.railway.app
   
   Custo: $0.02 | Tempo: 3min 45s
```

### Cenário 2: Consultar Dados

```
Você (WhatsApp):
Quanto gastei com iFood esse mês?

Sistema:
1. GPT-4o-mini interpreta intenção
2. Query no Prisma database
3. Extrai: iFood transactions, mês atual
4. Soma valores
5. Responde:

🍕 iFood - Maio/2026
   Total: R$ 487,90
   Transações: 8
   Pulmão 3 (Lazer): 10.5% usado
   
   Média por pedido: R$ 60,99
   vs mês anterior: ↑ 12%
```

### Cenário 3: Monitorar Agentes

```
Você (WhatsApp):
/quem está trabalhando?

Sistema:
1. Query /api/monitor/executions
2. Lista agents com status='working'
3. Responde:

🤖 Agentes Ativos (3):

1. Senior Dev (shlomo-autodev)
   Task: Implementando gráfico pizza
   Progress: 65%
   Modelo: Claude Sonnet
   Custo: $0.008

2. PDF Parser (shlomo-engineering)
   Task: Extraindo fatura #12345
   Progress: 30%
   Modelo: Claude Haiku (FREE)
   
3. Classification Engine
   Task: Classificando 68 transações
   Progress: 80%
   Modelo: Gemini Flash (FREE)
```

---

## 🐛 Troubleshooting

### Problema: QR Code não aparece

**Solução:**
```bash
# Limpar sessões corrompidas
rm -rf skills/whatsapp-integration/sessions/*

# Reiniciar
node mcp-whatsapp-server.js
```

### Problema: Mensagens não chegam

**Solução:**
```bash
# Verificar webhook
curl -X POST http://localhost:3001/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Deve retornar: {"success": true}
```

### Problema: Áudio não transcreve

**Solução:**
```bash
# Verificar Deepgram API key
echo $DEEPGRAM_API_KEY

# Testar API
curl https://api.deepgram.com/v1/listen \
  -H "Authorization: Token $DEEPGRAM_API_KEY" \
  --data-binary @test-audio.opus
```

---

## 💡 Dicas Pro

### 1. Atalhos de Texto (iOS/Android)

Crie atalhos para comandos frequentes:
```
"dva" → "/dev adicione "
"dbs" → "/debug status "
"cst" → "/custos hoje"
```

### 2. Grupos WhatsApp

Crie grupo "Opensquad Team":
- Adicione bot como membro
- Todos podem enviar comandos
- Notificações em tempo real

### 3. Agendamento

Use Siri Shortcuts ou Tasker:
```
Todo dia às 9am:
→ Envia "/relatório diário"
→ Recebe resumo financeiro
```

---

## 🎯 Resumo Rápido

| Ação | Comando WhatsApp |
|------|------------------|
| Desenvolver feature | `/dev <descrição>` |
| Corrigir bug | `/debug <erro>` |
| Ver status squad | `/status <nome>` |
| Ver custos | `/custos` |
| Listar comandos | `/help` |
| Parar execução | `/stop` |
| Relatório | `/relatório` |

---

**Pronto para conectar!** Execute:

```bash
/conectar-whatsapp
```

E escaneie o QR Code! 🚀
