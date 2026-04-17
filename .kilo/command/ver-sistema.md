# /ver-sistema

Mostra o status atual de todos os componentes do sistema e como testar.

## Uso

```
/ver-sistema
```

## O que faz

Verifica e exibe:
- Status dos serviços (WhatsApp, Orchestrator, Dashboard)
- Últimas execuções de squads
- Portas disponíveis
- Variáveis de ambiente configuradas
- Comandos para iniciar cada componente

## Exemplo de Output

```
🔍 Status do Sistema Opensquad

✅ WhatsApp Bot: Parado
   → cd skills/whatsapp-integration && node mcp-whatsapp-server.js
   
✅ Orchestrator: Parado
   → cd orchestrator && node orchestrator.js
   
✅ Dashboard: Parado
   → cd shlomo-ledger && npm run dev

📊 Squads disponíveis:
   - shlomo-engineering (4 agentes)
   - dev-assistant (3 agentes)
   - gestao-pessoal (4 agentes)

🚀 Para testar:
   1. Inicie os 3 serviços acima
   2. Envie PDF via WhatsApp
   3. Acesse http://localhost:5173
```
