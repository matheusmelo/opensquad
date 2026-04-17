# Guia de Prompts para Antigravity - Desenvolvimento dos Agentes Autônomos

Este guia contém prompts prontos para enviar ao Antigravity (Gemini) para acelerar o desenvolvimento dos agentes autônomos da squad Shlomo Engineering.

---

## 🎯 Prompt 1: Implementar Parser de PDF Real

**Copie e cole:**

```
Implemente o parser real de PDFs de faturas bancárias para o agente PDF Parser Engineer.

Arquivo alvo: squads/shlomo-engineering/agents/pdf-parser-engineer/tasks/build-parser-rules.md

Requisitos:
1. Usar biblioteca pdfplumber (Python) ou pdf-parse (Node.js)
2. Criar parsers específicos para:
   - Nubank (formato: DD/MM | Descrição | R$ Valor)
   - Itaú (formato: DD.MM.AA | Descrição | Valor)
   - Bradesco (formato similar)
3. Extrair: data, descrição, valor, tipo (debito/credito)
4. Lidar com edge cases:
   - Descrições multiline
   - Valores negativos entre parênteses
   - Transações parceladas ("COMPRA PARC 1/12")
5. Gerar CSV em: squads/shlomo-engineering/output/{run_id}/transactions.csv

Entregáveis:
- squads/shlomo-engineering/parsers/nubank_parser.py
- squads/shlomo-engineering/parsers/itau_parser.py
- squads/shlomo-engineering/parsers/base_parser.py (classe abstrata)
- Testes unitários com PDFs de exemplo

Bibliotecas permitidas: pdfplumber, re, csv, pytest
```

---

## 🎯 Prompt 2: Construir Motor de Classificação Regex

**Copie e cole:**

```
Construa o motor de classificação baseado em regex para o agente Classification Engine.

Arquivo alvo: squads/shlomo-engineering/agents/classification-engine/tasks/classify-transactions.md

Requisitos:
1. Carregar regras de squads/shlomo-engineering/_memory/classification-rules.yaml
2. Para cada transação do CSV:
   - Aplicar regex patterns (case-insensitive)
   - Calcular score de confiança:
     * Match exato de palavra: 0.95
     * Match parcial (substring): 0.80
     * Múltiplos patterns da mesma regra: +0.05
   - Se confiança < 0.80 → marcar como "REVISAO MANUAL"
3. Categorizar automaticamente:
   - PF → Pulmão 1/2/3 baseado em keywords
   - PJ → Orion baseado em keywords de serviços (AWS, Facebook Ads, etc.)
4. Gerar output em JSON estruturado para dashboard

Regras iniciais (implementar em YAML):
```yaml
rules:
  PF-Pulmao1-Essenciais:
    patterns:
      - "UBER|99|TAXI"
      - "CONDOMINIO|ALUGUEL|IPTU"
      - "SUPERMERCADO|MERCADONA|ASSAI"
      - "LUZ|ENERGIA|SABESP|COMGAS"
    contexto: "PF"
    pulmao: "Pulmao 1"
    
  PF-Pulmao3-Lazer:
    patterns:
      - "NETFLIX|SPOTIFY|PRIME"
      - "IFOOD|RAPPPI|RESTAURANTE"
      - "AIRBNB|DECOLAR|CVC"
    contexto: "PF"
    pulmao: "Pulmao 3"
```

Entregáveis:
- squads/shlomo-engineering/classifier/classification_engine.py
- squads/shlomo-engineering/_memory/classification-rules.yaml
- squads/shlomo-engineering/output/{run_id}/classified-transactions.json
- Testes com CSV de exemplo
```

---

## 🎯 Prompt 3: Componentes React do Dashboard

**Copie e cole:**

```
Construa os componentes React premium do Shlomo Ledger seguindo o design system definido.

Arquivos a criar:
1. shlomo-ledger/src/components/LungCard.tsx
2. shlomo-ledger/src/components/MonthlyOverview.tsx
3. shlomo-ledger/src/components/TransactionTable.tsx

Especificações LungCard:
```tsx
interface LungCardProps {
  lung: {
    label: string;        // "Pulmão 1: Essenciais"
    gasto: number;        // 5800.00
    teto: number;         // 7700.00
    status: 'OK' | 'ALERTA' | 'CRITICO';
    icon: string;         // "🏠"
    color: string;        // "bg-red-500" (Tailwind)
    textColor: string;    // "text-red-400"
  };
}
```

Design requirements:
- Dark mode nativo: bg-zinc-900
- Glassmorphism: backdrop-blur-md bg-opacity-50
- Bordas sutis: border border-zinc-800
- Barra de progresso animada com % de uso
- Hover effects suaves (transition-all duration-300)
- Responsivo (mobile/desktop)

MonthlyOverview:
- Grid com 3 LungCards
- Receita total em destaque (text-4xl font-bold)
- Saldo livre com cor dinâmica (verde/vermelho)
- Barra de distribuição percentual empilhada

TransactionTable:
- Lista scrollable com todas as transações
- Filtros por pulmão/categoria (dropdown)
- Badge de confiança (0.95 = ✅ verde, 0.50 = ⚠️ amarelo)
- Botão de reclassificar (abre modal)

Use Tailwind CSS v4 com design tokens do src/index.css existente.

Entregáveis:
- 3 arquivos .tsx completos
- Atualização em App.tsx integrando componentes
- Zero erros de compilação TypeScript
```

---

## 🎯 Prompt 4: Database Schema e Persistência

**Copie e cole:**

```
Projete e implemente o schema de banco de dados para persistência das transações e regras de classificação.

Stack: SQLite (dev) / PostgreSQL (prod) + Prisma ORM

Schema necessário:

Model Transaction:
- id: String (UUID)
- data: DateTime
- descricao: String
- valor: Float
- tipo: Enum (DEBITO, CREDITO)
- contexto: Enum (PF, PJ)
- pulmao: String? (Pulmao 1, Pulmao 2, Pulmao 3, null para PJ)
- categoria: String?
- confianca: Float (0.0 - 1.0)
- recorrencia: Enum? (BAIXA, MEDIA, ALTA)
- mesReferencia: String (YYYY-MM)
- createdAt: DateTime
- updatedAt: DateTime

Model ClassificationRule:
- id: String (UUID)
- pattern: String (regex)
- contexto: Enum (PF, PJ)
- pulmao: String?
- categoria: String
- confiancaMinima: Float
- ativo: Boolean (default true)
- createdBy: Enum (SYSTEM, USER)
- createdAt: DateTime

Model User:
- id: String (UUID)
- whatsappNumber: String (unique)
- nome: String?
- plano: Enum (FREE, PRO)
- createdAt: DateTime

Relationships:
- User → Transaction (one-to-many)
- User → ClassificationRule (one-to-many)

Entregáveis:
- prisma/schema.prisma
- prisma/migrations/20260417_init/migration.sql
- src/lib/prisma.ts (client singleton)
- seed.ts com dados de exemplo
- Scripts: npm run db:migrate, npm run db:seed
```

---

## 🎯 Prompt 5: Sistema de Aprendizado de Regras

**Copie e cole:**

```
Implemente o sistema de aprendizado contínuo de regras de classificação.

Funcionalidade:
Quando usuário reclassifica manualmente uma transação via WhatsApp:
  Input: "Aquela compra na Amazon não é Pulmão 3, é Pulmão 2"
  
Sistema deve:
1. Identificar transação original (Amazon, valor X, data Y)
2. Extrair padrão da descrição: "AMAZON" ou "AMAZON.*BR"
3. Verificar se já existe regra para este pattern
4. Se não existir → criar nova regra:
   ```yaml
   - pattern: "AMAZON"
     contexto: "PF"
     pulmao: "Pulmao 2"
     categoria: "Vestuário"
     confiancaMinima: 0.85
     createdBy: USER
   ```
5. Se existir → incrementar contador de acertos
6. Regras com > 10 acertos → promoted to SYSTEM rule
7. Regras com 0 acertos após 30 dias → sugerir remoção

Algoritmo de sugestão automática:
- Analisar transações marcadas como "REVISAO MANUAL"
- Agrupar por similaridade de descrição (fuzzy matching)
- Sugerir pattern comum ao usuário:
  "Percebi que 5 transações com 'ATACADAO' foram classificadas como Pulmão 1. 
   Criar regra automática? (Sim/Não)"

Entregáveis:
- squads/shlomo-engineering/classifier/rule_learner.py
- squads/shlomo-engineering/_memory/classification-rules.yaml (atualizado)
- Endpoint: POST /api/rules/suggest (retorna sugestões pendentes)
- Endpoint: POST /api/rules/approve/:id (aprova sugestão)
```

---

## 🎯 Prompt 6: Upload de PDFs via UI

**Copie e cole:**

```
Implemente interface de upload de PDFs de faturas diretamente pelo dashboard web.

Componente: shlomo-ledger/src/components/PDFUploader.tsx

Features:
1. Drag & drop zone estilizada
   - Ícone de PDF grande
   - Texto: "Arraste sua fatura aqui ou clique para selecionar"
   - Limite: 10MB
  
2. Preview pós-upload:
   - Nome do arquivo
   - Tamanho
   - Status: "Processando..." → "✅ Classificado" ou "❌ Erro"
   
3. Múltiplos arquivos:
   - Queue de uploads
   - Progress bar individual
   
4. Integração com backend:
   - POST /api/upload/fatura
   - FormData com arquivo PDF
   - Response: { run_id, total_transacoes, saldo_livre }
   
5. Trigger automático da squad:
   - Ao completar upload → disparar orchestrator-command.json
   - Polling state.json até completion
   - Notificar usuário quando pronto

Backend endpoint (Express):
```typescript
// orchestrator/routes/upload.ts
POST /api/upload/fatura
- Salvar PDF em squads/shlomo-engineering/input/
- Criar orchestrator-command.json
- Retornar run_id para polling
```

Design: Seguir estética premium dark mode do dashboard existente.
```

---

## 📋 Ordem Recomendada de Execução

Execute estes prompts nesta sequência:

1. **Prompt 4** (Database) → Base de dados primeiro
2. **Prompt 2** (Classificação) → Lógica core
3. **Prompt 1** (Parser PDF) → Ingestão de dados
4. **Prompt 3** (React Components) → Visualização
5. **Prompt 6** (Upload UI) → Integração frontend-backend
6. **Prompt 5** (Aprendizado) → Inteligência avançada

---

## 💡 Dicas de Envio

- Envie **um prompt por vez**
- Aguarde confirmação de conclusão antes do próximo
- Se algo falhar, peça: "Debug e corrija o erro acima"
- Para testar: "Rode testes unitários e mostre resultados"

Quer que eu prepare mais prompts para outras áreas (autenticação, deploy, etc.)?
