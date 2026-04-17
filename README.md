# Opensquad Project

AI-powered squad automation system with WhatsApp integration, autonomous agents, and financial dashboard.

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start all services (WhatsApp bot + Orchestrator + Dashboard)
npm run dev

# Or start individually:
npm run dev:whatsapp    # WhatsApp bot
npm run dev:orchestrator # Orchestrator API
npm run dev:dashboard   # React dashboard
```

### Production Deploy (Railway/Render)

1. Push to GitHub
2. Connect repo to Railway.app
3. Add environment variables
4. Deploy!

See `deploy/README.md` for full instructions.

## 📱 WhatsApp Commands

Send messages to your bot number:

```
🎤 Audio: "Process my Nubank invoice for March"
📄 PDF + text: "Classify this for me"
💬 Text: "How much did I spend on Uber this month?"
```

## 👥 Squads Available

### Shlomo Engineering 🔧
Automated financial data processing with 3-Lung method.

**Agents:**
- PDF Parser Engineer
- Classification Engine
- Dashboard Builder
- QA Validator

### Dev Assistant 👨‍💻
Autonomous development assistant for coding tasks.

**Agents:**
- Senior Dev
- QA Tester
- Tech Writer

**Commands:**
```
/dev implement PDF upload UI
/dev debug Nubank parser error
/docs update README
```

## 🏗️ Architecture

```
WhatsApp → Orchestrator → Squads → Dashboard
           (Router)      (Agents)  (React UI)
```

## 🔧 Tech Stack

- **Frontend:** React + TypeScript + Tailwind + Vite
- **Backend:** Node.js + Express + Python
- **Database:** SQLite (dev) / PostgreSQL (prod)
- **Infrastructure:** Docker + PM2 + nginx
- **AI:** OpenAI GPT-4 + Deepgram transcription

## 📊 Environment Variables

Create `.env.production`:

```env
OPENAI_API_KEY=sk-proj-xxxxx
DEEPGRAM_API_KEY=xxxxx
WHATSAPP_SESSION_PATH=/data/sessions
OPENSQUAD_BASE_PATH=/app
MAX_CONCURRENT_SQUADS=5
REDIS_URL=redis://localhost:6379
DB_PASSWORD=secure_password
```

## 📖 Documentation

- `deploy/README.md` - Cloud deployment guide
- `DIVISAO_RESPONSABILIDADES.md` - Team responsibilities
- `PROMPTS_ANTIGRAVITY.md` - Prompts for AI assistant
- `squads/dev-assistant/README.md` - Dev assistant docs

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run tests: `npm test`
4. Lint: `npm run lint`
5. Submit PR

## 📄 License

Private project - All rights reserved
