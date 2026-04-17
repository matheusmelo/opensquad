# 🚀 Deploy Rápido - Opensquad

Sistema pronto para rodar 24/7 em cloud! Escolha uma opção:

---

## Opção 1: Railway.app (Recomendado - Mais Fácil)

### Passo a Passo

1. **Push para GitHub:**
   ```bash
   git remote add origin https://github.com/seu-usuario/opensquad.git
   git push -u origin main
   ```

2. **Acesse Railway.app** e faça login com GitHub

3. **Novo Projeto → Deploy from GitHub repo**
   - Selecione `opensquad`

4. **Adicione variáveis de ambiente:**
   ```
   OPENAI_API_KEY=sk-proj-xxxxx
   DEEPGRAM_API_KEY=xxxxx
   DB_PASSWORD=senha_segura
   ```

5. **Adicione serviços:**
   - Add Database → PostgreSQL
   - Add Database → Redis

6. **Deploy automático!** 🎉

**Custo estimado:** $5-10/mês

---

## Opção 2: DigitalOcean Droplet ($6/mês)

### Setup Automático

1. **Crie Droplet Ubuntu 22.04 LTS** (1GB RAM mínimo)

2. **SSH no servidor:**
   ```bash
   ssh root@SEU_IP
   ```

3. **Clone repositório:**
   ```bash
   git clone https://github.com/seu-usuario/opensquad.git
   cd opensquad
   ```

4. **Execute setup automático:**
   ```bash
   chmod +x deploy/setup-ubuntu.sh
   ./deploy/setup-ubuntu.sh
   ```

5. **Configure .env.production:**
   ```bash
   cp .env.example .env.production
   nano .env.production
   # Adicione suas API keys
   ```

6. **Inicie serviços:**
   ```bash
   pm2 start deploy/ecosystem.config.js
   pm2 save
   pm2 startup
   ```

7. **Escaneie QR Code:**
   ```bash
   pm2 logs whatsapp-bot
   # Escaneie o QR Code com seu WhatsApp
   ```

8. **Acesse:** `http://SEU_IP:3000`

---

## Opção 3: Render.com (Free Tier Disponível)

1. **Conecte repo do GitHub**
2. **Create Web Service**
3. **Build Command:** `npm run build`
4. **Start Command:** `pm2 start deploy/ecosystem.config.js`
5. **Add Redis/Postgres addons**

---

## Testando Deploy

Após deploy, teste:

```bash
# Health check
curl http://SEU_DOMINIO:3001/health

# WhatsApp: envie mensagem para seu bot
"Teste de conexão"

# Dashboard: acesse no navegador
http://SEU_DOMINIO:3000
```

---

## Comandos Úteis

### PM2 (Process Manager)
```bash
pm2 status              # Ver status dos serviços
pm2 logs                # Logs em tempo real
pm2 restart all         # Reiniciar tudo
pm2 monit               # Monitorar recursos
```

### Docker (alternativa)
```bash
docker-compose up -d    # Iniciar todos os containers
docker-compose logs -f  # Ver logs
docker-compose down     # Parar tudo
```

---

## Troubleshooting

### WhatsApp desconectou
```bash
pm2 logs whatsapp-bot
# Reescaneie QR Code se necessário
```

### Erro de database
```bash
# Verificar conexão
echo $DATABASE_URL

# Restart do service
pm2 restart orchestrator
```

### Bundle size muito grande
```bash
cd shlomo-ledger
npm run build
ls -lh dist/  # Deve ser < 1MB
```

---

## Monitoramento

### UptimeRobot (Gratuito)
1. Crie conta em uptimerobot.com
2. Adicione monitor HTTP(s) para:
   - `http://SEU_IP:3001/health`
   - `http://SEU_IP:3000`
3. Alertas por email/SMS se cair

### Sentry (Error Tracking)
1. Crie projeto em sentry.io
2. Adicione DSN ao `.env.production`:
   ```
   SENTRY_DSN=https://xxx@sentry.io/xxx
   ```

---

**Sistema pronto para produção!** 🚀

Qual plataforma você vai usar? Posso configurar automaticamente.
