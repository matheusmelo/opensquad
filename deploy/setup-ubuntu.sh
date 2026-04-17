#!/bin/bash

# Opensquad Ubuntu Server Setup Script
# Run this on a fresh Ubuntu 22.04 LTS server

set -e

echo "🚀 Iniciando setup do servidor Opensquad..."

# 1. Atualizar sistema
echo "📦 Atualizando sistema..."
apt update && apt upgrade -y

# 2. Instalar Node.js 20 LTS
echo "📦 Instalando Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version
npm --version

# 3. Instalar PM2
echo "📦 Instalando PM2..."
npm install -g pm2
pm2 --version

# 4. Instalar Redis
echo "📦 Instalando Redis..."
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# 5. Instalar nginx
echo "📦 Instalando nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# 6. Configurar firewall (UFW)
echo "🔥 Configurando firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 7. Criar usuário da aplicação
echo "👤 Criando usuário opensquad..."
id -u opensquad &>/dev/null || useradd -r -m -s /bin/bash opensquad

# 8. Criar diretórios
echo "📁 Criando diretórios..."
mkdir -p /app/opensquad
mkdir -p /app/opensquad/data/whatsapp-sessions
mkdir -p /app/opensquad/logs
chown -R opensquad:opensquad /app/opensquad

# 9. Instalar dependências do projeto
echo "📦 Instalando dependências do projeto..."
cd /app/opensquad
npm install

# Instalar dependências específicas
cd /app/opensquad/skills/whatsapp-integration
npm install whatsapp-web.js @deepgram/sdk openai qrcode-terminal

cd /app/opensquad/orchestrator
npm install express openai

cd /app/opensquad/shlomo-ledger
npm install

# 10. Build do dashboard
echo "🔨 Buildando dashboard..."
cd /app/opensquad/shlomo-ledger
npm run build

# 11. Configurar nginx como proxy reverso
echo "🌐 Configurando nginx..."
cat > /etc/nginx/sites-available/opensquad << 'EOF'
server {
    listen 80;
    server_name _;

    # WhatsApp Bot e Orchestrator (proxy para PM2)
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Dashboard estático
    location / {
        root /app/opensquad/shlomo-ledger/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Assets do dashboard
    location /assets/ {
        alias /app/opensquad/shlomo-ledger/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf /etc/nginx/sites-available/opensquad /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# 12. Configurar SSL com Let's Encrypt (opcional - requer domínio)
echo "🔒 Para SSL, execute manualmente após configurar domínio:"
echo "   apt install certbot python3-certbot-nginx"
echo "   certbot --nginx -d seu-dominio.com"

# 13. Configurar PM2 para iniciar no boot
echo "⚙️ Configurando PM2 startup..."
pm2 startup systemd -u opensquad --hp /home/opensquad
pm2 save

# 14. Criar arquivo .env de exemplo
echo "📝 Criando .env.example..."
cat > /app/opensquad/.env.production << 'EOF'
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxxxxxxx
WHATSAPP_SESSION_PATH=/app/opensquad/data/whatsapp-sessions
OPENSQUAD_BASE_PATH=/app/opensquad
MAX_CONCURRENT_SQUADS=5
REDIS_URL=redis://localhost:6379
NODE_ENV=production
EOF

# 15. Instruções finais
echo ""
echo "✅ Setup concluído!"
echo ""
echo "📋 Próximos passos:"
echo "1. Faça upload do código para /app/opensquad"
echo "2. Configure as variáveis de ambiente em .env.production"
echo "3. Execute: cd /app/opensquad && pm2 start deploy/ecosystem.config.js"
echo "4. Escaneie o QR Code: pm2 logs whatsapp-bot"
echo "5. Acesse o dashboard em http://SEU_IP"
echo ""
echo "📊 Comandos úteis:"
echo "   pm2 status          - Ver status dos serviços"
echo "   pm2 logs            - Ver logs em tempo real"
echo "   pm2 restart all     - Reiniciar todos os serviços"
echo "   pm2 monit           - Monitorar recursos"
echo ""
