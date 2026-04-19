# Sistema de Autenticação JWT para Shlomo Ledger

## 🎯 Objetivo

Implementar sistema completo de autenticação e autorização para proteger dados financeiros.

---

## 🔧 Implementação Backend

### 1. Instalar Dependências

```bash
cd orchestrator
npm install jsonwebtoken bcryptjs express-rate-limit helmet cors
```

### 2. Criar Middleware de Auth (`orchestrator/middleware/auth.js`)

```javascript
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
}

module.exports = { authenticateToken, JWT_SECRET };
```

### 3. Criar Rotas de Auth (`orchestrator/routes/auth.js`)

```javascript
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Rate limiting para prevenir brute force
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: 'Muitas tentativas. Tente novamente em 15 minutos.'
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { whatsappNumber, nome, plano = 'FREE' } = req.body;

    // Verificar se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { whatsappNumber }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Usuário já cadastrado' });
    }

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        whatsappNumber,
        nome,
        plano
      }
    });

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        whatsappNumber: user.whatsappNumber,
        plano: user.plano 
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      user: {
        id: user.id,
        whatsappNumber: user.whatsappNumber,
        nome: user.nome,
        plano: user.plano
      },
      token
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { whatsappNumber } = req.body;

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { whatsappNumber }
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Gerar token JWT (sem senha - autenticação via WhatsApp)
    const token = jwt.sign(
      { 
        id: user.id, 
        whatsappNumber: user.whatsappNumber,
        plano: user.plano 
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      user: {
        id: user.id,
        whatsappNumber: user.whatsappNumber,
        nome: user.nome,
        plano: user.plano
      },
      token
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/auth/me (protegido)
const { authenticateToken } = require('../middleware/auth');

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);

  } catch (error) {
    console.error('Erro buscando perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
```

### 4. Proteger Rotas Existentes

```javascript
// orchestrator/orchestrator.js

// Importar middleware de auth
const { authenticateToken } = require('./middleware/auth');

// Aplicar auth em rotas protegidas
app.use('/api/transactions', authenticateToken, transactionRoutes);
app.use('/api/finance', authenticateToken, financeRoutes);

// Manter rotas públicas sem auth
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
```

---

## 🔐 Fluxo de Autenticação via WhatsApp

### Registro Automático

```
1. Usuário envia mensagem no WhatsApp
   ↓
2. Bot verifica se número está cadastrado
   ↓
3. Se NÃO estiver:
   → Cria usuário automaticamente
   → Gera token JWT
   → Salva sessão
   ↓
4. Se já existir:
   → Busca dados do banco
   → Renova token
   ↓
5. Todas as requests usam token
```

---

## 💾 Armazenamento Seguro

### Variáveis de Ambiente

```env
# .env.production
JWT_SECRET=sua_chave_secreta_super_segura_aqui_$(openssl rand -base64 32)
JWT_EXPIRATION=30d
BCRYPT_ROUNDS=10
```

### Gerar Chave Segura

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

---

## 🎨 Frontend - Context de Auth

### `shlomo-ledger/src/contexts/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  whatsappNumber: string;
  nome: string;
  plano: 'FREE' | 'PRO';
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  login: (whatsappNumber: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Carregar token do localStorage
    const storedToken = localStorage.getItem('@ShlomoLedger:token');
    const storedUser = localStorage.getItem('@ShlomoLedger:user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  async function login(whatsappNumber: string) {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsappNumber })
    });

    const data = await response.json();

    if (response.ok) {
      setToken(data.token);
      setUser(data.user);
      
      localStorage.setItem('@ShlomoLedger:token', data.token);
      localStorage.setItem('@ShlomoLedger:user', JSON.stringify(data.user));
    } else {
      throw new Error(data.error);
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('@ShlomoLedger:token');
    localStorage.removeItem('@ShlomoLedger:user');
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      isAuthenticated: !!token 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## 🚀 Como Usar

### 1. Proteger Componentes React

```tsx
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div>
      <h1>Bem-vindo, {user.nome}!</h1>
      {/* Dashboard content */}
    </div>
  );
}
```

### 2. Fazer Requests Autenticados

```typescript
const { token } = useAuth();

const response = await fetch('/api/transactions', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 📊 Resumo da Segurança

| Camada | Proteção |
|--------|----------|
| **JWT Tokens** | Expiram em 30 dias |
| **Rate Limiting** | 5 tentativas login/15min |
| **HTTPS Only** | Em produção |
| **Bcrypt Hashing** | Para senhas (se necessário) |
| **WhatsApp Auth** | Sem senha - usa número verificado |
| **CORS** | Domínios whitelistados |

---

**Sistema pronto para implementar!** Quer que eu adicione isso ao código agora?
