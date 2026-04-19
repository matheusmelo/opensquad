# Sistema de Notificações Push e Alertas Financeiros

## 🎯 Objetivo

Enviar notificações em tempo real para usuário quando:
- Pulmão atingir 80% do teto (alerta amarelo)
- Pulmão ultrapassar 100% do teto (crítico vermelho)
- Squad completar execução
- Nova fatura processada
- Meta financeira atingida

---

## 🔔 Tipos de Notificação

### 1. WhatsApp (Já Implementado)
✅ Vantagem: Sempre conectado, alta taxa de abertura  
❌ Desvantagem: Só texto, sem rich media

### 2. Push Notifications (Web)
✅ Vantagem: Rich notifications com ações  
❌ Desvantagem: Requer permissão do browser

### 3. Email (Resumo Diário/Semanal)
✅ Vantagem: Histórico permanente  
❌ Desvantagem: Não é instantâneo

### 4. In-App (Dashboard)
✅ Vantagem: Contextual  
❌ Desvantagem: Só vê se estiver olhando

---

## 💻 Implementação Web Push

### 1. Service Worker (`shlomo-ledger/public/firebase-messaging-sw.js`)

```javascript
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "SUA_API_KEY",
  authDomain: "shlomo-ledger.firebaseapp.com",
  projectId: "shlomo-ledger",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, badge, data } = payload.notification;

  self.registration.showNotification(title, {
    body,
    icon: icon || '/icons/icon-192x192.png',
    badge: badge || '/icons/badge-72x72.png',
    data,
    actions: [
      { action: 'view', title: 'Ver Dashboard' },
      { action: 'dismiss', title: 'Dispensar' }
    ]
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
```

### 2. Hook React (`shlomo-ledger/src/hooks/usePushNotifications.ts`)

```typescript
import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "shlomo-ledger.firebaseapp.com",
  projectId: "shlomo-ledger",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Pedir permissão
    Notification.requestPermission().then(permission => {
      setPermission(permission);

      if (permission === 'granted') {
        // Obter token FCM
        getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
        }).then(currentToken => {
          if (currentToken) {
            setToken(currentToken);
            
            // Enviar token para backend
            registerToken(currentToken);
          }
        });
      }
    });

    // Listener para mensagens foreground
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Notificação recebida:', payload);
      
      // Mostrar notificação customizada no UI
      setNotifications(prev => [...prev, payload]);
      
      // Tocar som
      new Audio('/sounds/notification.mp3').play().catch(() => {});
    });

    return () => unsubscribe();
  }, []);

  async function registerToken(token: string) {
    try {
      await fetch('http://localhost:3001/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('@ShlomoLedger:token')}`
        },
        body: JSON.stringify({ token, platform: 'web' })
      });
    } catch (error) {
      console.error('Erro registrando token:', error);
    }
  }

  return { permission, token, notifications };
}
```

---

## 📧 Sistema de Email (Resumo Diário)

### Backend - Nodemailer (`orchestrator/services/email-service.js`)

```javascript
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configurar transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendDailySummary(userId) {
  // Buscar dados do usuário
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { transactions: true }
  });

  if (!user || !user.email) return;

  // Calcular resumo do dia
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTransactions = user.transactions.filter(t => 
    new Date(t.data) >= today
  );

  const totalGasto = todayTransactions.reduce((sum, t) => sum + Math.abs(t.valor), 0);
  
  // Agrupar por pulmão
  const pulmoes = {
    1: { gasto: 0, teto: 7700 },
    2: { gasto: 0, teto: 3080 },
    3: { gasto: 0, teto: 4620 }
  };

  todayTransactions.forEach(t => {
    if (t.pulmao && pulmoes[t.pulmao]) {
      pulmoes[t.pulmao].gasto += Math.abs(t.valor);
    }
  });

  // Montar email HTML
  const html = `
    <h1>📊 Resumo Financeiro - ${today.toLocaleDateString('pt-BR')}</h1>
    
    <div style="background: #18181b; color: white; padding: 20px; border-radius: 12px;">
      <h2>Total Gasto Hoje: R$ ${totalGasto.toFixed(2)}</h2>
      
      <h3>Pulmões:</h3>
      <ul>
        ${Object.entries(pulmoes).map(([id, data]) => {
          const pct = ((data.gasto / data.teto) * 100).toFixed(0);
          const status = pct > 100 ? '🔴' : pct > 80 ? '⚠️' : '✅';
          return `<li>P${id}: R$ ${data.gasto.toFixed(0)} / R$ ${data.teto} (${pct}%) ${status}</li>`;
        }).join('')}
      </ul>
    </div>
    
    <p style="margin-top: 20px; color: #71717a;">
      Acesse o dashboard completo: <a href="https://shlomo-ledger.railway.app">shlomo-ledger.railway.app</a>
    </p>
  `;

  // Enviar email
  await transporter.sendMail({
    from: '"Shlomo Ledger" <noreply@shlomo-ledger.com>',
    to: user.email,
    subject: `Resumo Financeiro - ${today.toLocaleDateString('pt-BR')}`,
    html
  });

  console.log(`📧 Email enviado para ${user.email}`);
}

// Agendar envio diário às 20h
const cron = require('node-cron');

cron.schedule('0 20 * * *', async () => {
  console.log('📧 Enviando resumos diários...');
  
  const users = await prisma.user.findMany({
    where: { email: { not: null } }
  });

  for (const user of users) {
    await sendDailySummary(user.id);
  }
});

module.exports = { sendDailySummary };
```

---

## 🚨 Alertas Financeiros Inteligentes

### Detector de Anomalias (`orchestrator/services/alert-service.js`)

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFinancialAlerts(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { transactions: true }
  });

  if (!user) return [];

  const alerts = [];

  // Tetos dos pulmões
  const tetos = {
    1: 7700,
    2: 3080,
    3: 4620
  };

  // Calcular gasto do mês por pulmão
  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const gastosPorPulmao = { 1: 0, 2: 0, 3: 0 };

  user.transactions.forEach(t => {
    const dataTransacao = new Date(t.data);
    const mesTransacao = `${dataTransacao.getFullYear()}-${String(dataTransacao.getMonth() + 1).padStart(2, '0')}`;
    
    if (mesTransacao === mesAtual && t.pulmao && t.contexto === 'PF') {
      gastosPorPulmao[t.pulmao] += Math.abs(t.valor);
    }
  });

  // Verificar alertas
  Object.entries(gastosPorPulmao).forEach(([pulmaoId, gasto]) => {
    const teto = tetos[pulmaoId];
    const pct = (gasto / teto) * 100;

    if (pct > 100) {
      alerts.push({
        type: 'CRITICAL',
        message: `🔴 Pulmão ${pulmaoId} excedeu o teto!`,
        details: `Gasto: R$ ${gasto.toFixed(2)} / Teto: R$ ${teto} (${pct.toFixed(0)}%)`,
        timestamp: new Date()
      });
    } else if (pct > 80) {
      alerts.push({
        type: 'WARNING',
        message: `⚠️ Pulmão ${pulmaoId} está em alerta!`,
        details: `Gasto: R$ ${gasto.toFixed(2)} / Teto: R$ ${teto} (${pct.toFixed(0)}%)`,
        timestamp: new Date()
      });
    }
  });

  // Detectar gasto incomum (3x maior que média)
  const ultimos30Dias = new Date();
  ultimos30Dias.setDate(ultimos30Dias.getDate() - 30);

  const transacoesRecentes = user.transactions.filter(t => 
    new Date(t.data) >= ultimos30Dias
  );

  // Agrupar por categoria
  const gastosPorCategoria = {};
  transacoesRecentes.forEach(t => {
    if (!gastosPorCategoria[t.categoria]) {
      gastosPorCategoria[t.categoria] = 0;
    }
    gastosPorCategoria[t.categoria] += Math.abs(t.valor);
  });

  // Calcular médias
  Object.entries(gastosPorCategoria).forEach(([categoria, total]) => {
    const transacoesCategoria = transacoesRecentes.filter(t => t.categoria === categoria);
    const media = total / transacoesCategoria.length;

    // Verificar se alguma transação hoje é 3x maior que média
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const transacoesHoje = user.transactions.filter(t => {
      const dataT = new Date(t.data);
      return dataT >= hoje && t.categoria === categoria;
    });

    transacoesHoje.forEach(t => {
      if (Math.abs(t.valor) > media * 3) {
        alerts.push({
          type: 'ANOMALY',
          message: `💸 Gasto incomum detectado!`,
          details: `${t.descricao}: R$ ${Math.abs(t.valor).toFixed(2)} (média: R$ ${media.toFixed(2)})`,
          timestamp: new Date()
        });
      }
    });
  });

  return alerts;
}

// Executar verificação a cada hora
const cron = require('node-cron');

cron.schedule('0 * * * *', async () => {
  console.log('🔍 Verificando alertas financeiros...');
  
  const users = await prisma.user.findMany();

  for (const user of users) {
    const alerts = await checkFinancialAlerts(user.id);
    
    if (alerts.length > 0) {
      console.log(`⚠️ ${alerts.length} alertas para usuário ${user.id}`);
      
      // Enviar notificações
      alerts.forEach(alert => {
        // WhatsApp
        sendWhatsAppAlert(user.whatsappNumber, alert);
        
        // Push notification
        sendPushAlert(user.id, alert);
        
        // Email se for crítico
        if (alert.type === 'CRITICAL' && user.email) {
          sendEmailAlert(user.email, alert);
        }
      });
    }
  }
});

module.exports = { checkFinancialAlerts };
```

---

## 🎯 Como Usar

### No Dashboard React

```tsx
import { usePushNotifications } from '../hooks/usePushNotifications';

function App() {
  const { permission, notifications } = usePushNotifications();

  return (
    <div>
      {permission === 'granted' ? (
        <span className="text-emerald-400">🔔 Notificações ativas</span>
      ) : (
        <button onClick={() => Notification.requestPermission()}>
          Ativar Notificações
        </button>
      )}

      {/* Mostrar notificações recentes */}
      {notifications.map((notif, idx) => (
        <NotificationCard key={idx} payload={notif} />
      ))}
    </div>
  );
}
```

---

**Sistema completo pronto!** Quer que eu implemente isso agora ou focamos em outra parte?
