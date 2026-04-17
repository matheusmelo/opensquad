# Deploy em Nuvem - Opensquad + Shlomo Ledger

Este guia prepara todo o sistema para rodar em servidor cloud (DigitalOcean, Railway, Render, Fly.io) 24/7.

## 🏗️ Arquitetura de Produção

```
┌─────────────────────────────────────────┐
│         Load Balancer / Proxy           │
│         (nginx / Caddy)                 │
└──────────────┬──────────────────────────┘
               │
     ┌─────────┴─────────┐
     │                   │
     ↓                   ↓
┌──────────┐      ┌──────────────┐
│ WhatsApp │      │   Opensquad  │
│   Bot    │◄────►│ Orchestrator │
│ (PM2)    │      │   (PM2)      │
└──────────┘      └──────┬───────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ↓                     ↓
       ┌───────────┐        ┌─────────────┐
       │  Squads   │        │   Shlomo    │
       │  Runner   │        │   Ledger    │
       │           │        │   (Vite)    │
       └───────────┘        └─────────────┘
```

## 📦 Estrutura de Arquivos para Deploy

```
opensquad/
├── package.json              # Root package com scripts de deploy
├── docker-compose.yml        # Orquestração de containers
├── Dockerfile                # Imagem Docker multi-stage
├── .env.example              # Template de variáveis de ambiente
├── deploy/
│   ├── nginx.conf            # Configuração do proxy reverso
│   ├── ecosystem.config.js   # PM2 configuration
│   ├── setup-ubuntu.sh       # Script de setup automático
│   └── healthcheck.sh        # Verificação de saúde do sistema
├── orchestrator/
│   ├── package.json
│   ├── orchestrator.js
│   └── squad-registry.json
├── skills/whatsapp-integration/
│   ├── package.json
│   ├── mcp-whatsapp-server.js
│   └── sessions/             # Persistência de sessão WhatsApp
├── squads/
│   ├── shlomo-engineering/
│   └── gestao-pessoal/
├── shlomo-ledger/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
└── _opensquad/
```

## 🐳 Dockerização

### `docker-compose.yml` (produção)

Serviços:
- `whatsapp-bot`: Container do WhatsApp MCP Server
- `orchestrator`: Container do orquestrador principal
- `shlomo-ledger`: Dashboard React estático (nginx)
- `redis`: Cache e fila de mensagens
- `postgres`: Banco de dados para persistência (opcional)

### Volumes Persistentes

- `whatsapp-sessions`: Sessão do WhatsApp (evita reescanear QR Code)
- `squads-output`: Outputs gerados pelas squads
- `logs`: Logs da aplicação

## 🌍 Plataformas Recomendadas

### Opção 1: **Railway.app** (Mais fácil - Recomendado)
✅ Deploy automático via GitHub
✅ Redis e Postgres integrados
✅ Domínio HTTPS automático
✅ Preço: ~$5/mês para uso moderado

**Passos:**
1. Push do código para GitHub
2. Conectar repo no Railway
3. Adicionar variáveis de ambiente
4. Deploy automático!

### Opção 2: **DigitalOcean Droplet** ($6-18/mês)
✅ Controle total do servidor
✅ Melhor custo-benefício
✅ Escalável

**Setup:**
```bash
# Rodar script de setup automático
./deploy/setup-ubuntu.sh

# Iniciar serviços
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup
```

### Opção 3: **Fly.io** (Global edge)
✅ Deploy próximo aos usuários
✅ Free tier generoso
✅ HTTPS automático

### Opção 4: **Render.com**
✅ Free tier para testes
✅ Zero config deploy
✅ Auto-deploy via Git

## 🔧 Variáveis de Ambiente Necessárias

Criar arquivo `.env.production`:

```env
# API Keys
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxxxxxxx

# WhatsApp
WHATSAPP_SESSION_PATH=/data/whatsapp-sessions
WHATSAPP_BOT_NUMBER=5511999999999

# Orchestrator
ORCHESTRATOR_PORT=3001
OPENSQUAD_BASE_PATH=/app/opensquad
MAX_CONCURRENT_SQUADS=5

# Redis (fila)
REDIS_URL=redis://localhost:6379

# Database (opcional)
DATABASE_URL=postgresql://user:pass@localhost:5432/opensquad

# Monitoramento (opcional)
SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=info
```

## 🚀 Scripts de Deploy

### `deploy/setup-ubuntu.sh`
Script completo para configurar servidor Ubuntu do zero:
- Instala Node.js 20 LTS
- Instala PM2
- Instala nginx
- Configura firewall (UFW)
- Setup SSL com Let's Encrypt
- Configura backups automáticos

### `deploy/ecosystem.config.js`
Configuração PM2 para todos os processos:
- whatsapp-bot (auto-restart)
- orchestrator (auto-restart + load balancing)
- shlomo-ledger dev server (opcional)

### `deploy/healthcheck.sh`
Verifica se todos os serviços estão saudáveis:
- WhatsApp conectado?
- Orchestrator respondendo?
- Squads executáveis?
- Espaço em disco suficiente?

## 🔒 Segurança

### Checklist de Produção
- [ ] Remover chaves API do código (usar .env)
- [ ] Habilitar HTTPS (Let's Encrypt)
- [ ] Configurar firewall (só portas 80, 443, SSH)
- [ ] Rate limiting no WhatsApp bot
- [ ] Autenticação básica para dashboard admin
- [ ] Backup automático diário de:
  - Sessions WhatsApp
  - Dados classificados
  - Classification rules
  - Logs

### `.gitignore` de Produção
```
.env
sessions/
*.log
node_modules/
squads/*/output/
orchestrator/orchestrator.log
```

## 📊 Monitoramento

### Opção 1: **PM2 + Keymetrics**
```bash
pm2 monitor
```
Dashboard web com métricas em tempo real.

### Opção 2: **UptimeRobot**
Monitora healthcheck endpoint a cada 5 min.
Alerta se sistema cair.

### Opção 3: **Sentry**
Error tracking em produção.
Captura exceptions não tratadas.

## 🔄 CI/CD Pipeline

### GitHub Actions (`.github/workflows/deploy.yml`)

Workflow:
1. Push para `main`
2. Rodar tests
3. Build Docker images
4. Push para registry
5. Deploy em produção
6. Health check pós-deploy

## 💰 Custo Estimado por Mês

| Plataforma | Recursos | Custo |
|-----------|----------|-------|
| Railway | 2 services + Redis | $5-10 |
| DigitalOcean | 1GB Droplet | $6 |
| Fly.io | 2 shared-CPU VMs | $0-5 (free tier) |
| Render | Free tier | $0 (limitado) |
| **Total estimado** | | **$6-15/mês** |

## ⚡ Performance Otimizações

1. **Cache Redis** para consultas frequentes
2. **CDN** para assets estáticos do dashboard
3. **Compression** gzip/brotli no nginx
4. **Connection pooling** para database
5. **Lazy loading** de squads (carrega só quando necessário)

## 🆘 Rollback Plan

Se deploy falhar:
```bash
# PM2 rollback
pm2 reload all --update-env
pm2 logs --lines 100

# Ou reverter para versão anterior
git checkout HEAD~1
npm run build
pm2 restart all
```

## ✅ Checklist Pré-Deploy

- [ ] Todas as variáveis de ambiente configuradas
- [ ] WhatsApp session persistida
- [ ] Tests passando (`npm test`)
- [ ] Build sem errors/warnings
- [ ] SSL certificate válido
- [ ] Backup configurado
- [ ] Monitoramento ativo
- [ ] Documentação atualizada

---

**Próximo passo:** Escolher plataforma e executar deploy!

Qual plataforma você prefere usar? Posso configurar automaticamente.
