# Divisão de Responsabilidades - Opensquad

Para evitar conflitos de desenvolvimento entre Kilo e Gemini, establishemos esta divisão clara de áreas:

## 🔧 Kilo - Áreas Responsáveis

### 1. **Infraestrutura & Deploy**
- [x] Dockerização do sistema
- [x] Scripts de deploy (Ubuntu, Railway, Render)
- [x] Configuração PM2 (ecosystem.config.js)
- [x] nginx reverse proxy
- [x] CI/CD pipelines (GitHub Actions)
- [ ] Monitoramento e alertas (Sentry, UptimeRobot)
- [ ] Backup automatizado

### 2. **Orquestrador Central**
- [x] Roteamento de intenções (`orchestrator/orchestrator.js`)
- [x] Squad registry (`squad-registry.json`)
- [x] Queue manager
- [x] Response builder
- [ ] Webhook callbacks
- [ ] Sistema de autenticação multi-usuário

### 3. **Skill WhatsApp Integration**
- [x] MCP server (`mcp-whatsapp-server.js`)
- [x] Transcrição de áudio (Deepgram)
- [x] Interpretação de intenção (GPT-4o-mini)
- [x] Dispatch para squads
- [ ] Rate limiting e segurança
- [ ] Suporte a múltiplos números

### 4. **Squad Shlomo Engineering**
- [x] PDF Parser Engineer (agente + tasks)
- [x] Classification Engine (agente + tasks)
- [x] Dashboard Builder (agente + tasks)
- [x] QA Validator (agente + tasks)
- [ ] Implementação real dos parsers de PDF
- [ ] Integração com bancos específicos (Nubank, Itaú, etc.)

### 5. **Pipeline Runner Core**
- [ ] Otimizações de performance
- [ ] Melhorias no sistema de retry
- [ ] Logging estruturado

---

## 🤖 Gemini - Áreas Responsáveis

### 1. **Shlomo Ledger Frontend**
- [ ] Componentes React (LungCard, MonthlyOverview, TransactionTable)
- [ ] Estilização Tailwind premium
- [ ] Animações e transições
- [ ] Responsividade mobile
- [ ] Gráficos e visualizações (Recharts)

### 2. **Lógica Financeira**
- [ ] Algoritmos de classificação por regex
- [ ] Método dos 3 Pulmões (validações, tetos)
- [ ] Geração de regras automáticas
- [ ] Análise de saúde financeira
- [ ] Recomendações inteligentes

### 3. **Dashboard Interativo**
- [ ] Integração com dados em tempo real
- [ ] Filtros e buscas
- [ ] Reclassificação manual de transações
- [ ] Upload de PDFs via UI
- [ ] Exportação de relatórios (CSV/PDF)

### 4. **Persistência de Dados**
- [ ] Escolha de database (Postgres vs SQLite)
- [ ] Schema design (transações, usuários, regras)
- [ ] ORM setup (Prisma/Drizzle)
- [ ] Migrações
- [ ] Seed data

### 5. **Experiência do Usuário**
- [ ] Copywriting das mensagens
- [ ] Fluxo de onboarding
- [ ] Tutoriais e help center
- [ ] Feedback visual de erros

---

## 📋 Pontos de Integração (Ambos Trabalham Juntos)

### Interface Orquestrador ↔ Squads
- **Kilo**: Protocolo de comunicação, arquivos de comando
- **Gemini**: Validação do formato dos dados, schema validation

### API de Consultas
- **Kilo**: Endpoint REST `/query/:squadName`
- **Gemini**: Lógica de extração de dados, queries otimizadas

### Sistema de Autenticação
- **Kilo**: Middleware de auth, JWT tokens
- **Gemini**: UI de login, gestão de sessão no frontend

---

## 🚦 Workflow Colaborativo

### Regras de Não-Conflito

1. **Antes de editar um arquivo:**
   - Verificar se está na sua área de responsabilidade
   - Se for arquivo compartilhado → comunicar no prompt

2. **Pull Requests:**
   - Sempre criar branch feature específica
   - Descrever mudanças claramente
   - Taggar o outro dev para review se tocar em área compartilhada

3. **Commits:**
   - Mensagens descritivas e convencionais
   - Ex: `feat(orchestrator): add webhook callback support`
   - Ex: `feat(dashboard): implement LungCard component`

4. **Documentação:**
   - Atualizar README.md quando adicionar nova feature
   - Manter este arquivo de divisão sempre atualizado

---

## 📊 Status Atual

| Área | Responsável | Status | Progresso |
|------|-------------|--------|-----------|
| Infraestrutura & Deploy | Kilo | ✅ Concluído | 100% |
| Orquestrador Core | Kilo | ✅ Concluído | 90% |
| WhatsApp Skill | Kilo | ✅ Concluído | 85% |
| Squad Engineering | Kilo | ✅ Concluído | 80% |
| Frontend Dashboard | Gemini | ⏳ Pendente | 0% |
| Lógica Financeira | Gemini | ⏳ Pendente | 0% |
| Database/Persistência | Gemini | ⏳ Pendente | 0% |
| Autenticação | Ambos | ⏳ Pendente | 0% |

---

## 🎯 Próximos Passos Imediatos

### Kilo vai focar em:
1. Testar deploy em servidor cloud (Railway/DigitalOcean)
2. Implementar webhook callbacks para squads notificarem conclusão
3. Adicionar sistema de autenticação básica (API key)

### Gemini vai focar em:
1. Construir componentes React do dashboard (LungCard, etc.)
2. Implementar lógica de classificação regex
3. Setup de database (SQLite para dev, Postgres para prod)

---

**Última atualização:** 2026-04-17
