# Dev Assistant - Seu Assistente de Desenvolvimento Autônomo

O squad `dev-assistant` está pronto para trabalhar junto com você no projeto.

## 🚀 Como Usar

### Via Comando Direto

```
/dev implemente upload de PDFs na UI
/dev debugue erro no parser do Nubank
/dev adicione rate limiting no WhatsApp bot
/dev crie endpoint para consultar saldo
/dev refatore classification engine para performance
```

### Exemplos de Tarefas

**Features:**
```
/dev crie componente de upload drag-and-drop
/dev implemente filtro por data no dashboard
/dev adicione export CSV nas transações
```

**Bug Fixes:**
```
/dev corrija tipo no LungCard.tsx
/dev resolva memory leak no WhatsApp session
/dev fixe regex do parser que está perdendo transações
```

**Refatoração:**
```
/dev extraia validação de PDF para função separada
/dev otimize queries do Prisma
/dev tipifique corretamente todos os any do código
```

**Deploy/Infra:**
```
/dev configure SSL automático com Let's Encrypt
/dev adicione healthcheck endpoint no orchestrator
/dev setup backup automático do database
```

**Documentação:**
```
/dev documente API endpoints em docs/API.md
/dev crie ADR para escolha de SQLite vs Postgres
/dev atualize README com novos comandos
```

## 👥 Agentes da Squad

### Senior Dev 👨‍💻
Desenvolvedor full-stack autônomo que:
- Analisa requisitos
- Implementa features
- Debuga problemas
- Segue best practices (DRY, SOLID, KISS)

### QA Tester 🧪
Engenheiro de qualidade que valida:
- TypeScript check (zero errors)
- Lint limpo
- Testes passando
- Build funcionando

### Tech Writer ✍️
Documentador que mantém:
- README atualizado
- CHANGELOG consistente
- API docs completos
- ADRs para decisões arquiteturais

## 📋 Pipeline de Execução

```
Usuário envia tarefa
       ↓
Senior Dev analisa requisito
       ↓
Senior Dev implementa solução
       ↓
QA Tester roda lint + tests + build
       ↓
Tech Writer atualiza docs
       ↓
Resultado entregue ao usuário
```

## 🔧 Comandos Disponíveis

Adicionar ao `.kilo/command/dev.md`:

```markdown
# /dev

Execute tarefas de desenvolvimento autônomas.

## Uso

/dev <descrição da tarefa>

## Exemplos

/dev implemente feature X
/dev debugue erro Y
/dev refatore módulo Z
/deploy configure CI/CD
/docs atualize README
```

## 💡 Dicas de Uso

1. **Seja específico:**
   - ❌ "Melhore o parser"
   - ✅ "Adicione suporte a faturas do Bradesco no parser"

2. **Forneça contexto:**
   - ❌ "Está quebrado"
   - ✅ "Parser falha quando descrição tem newline"

3. **Defina prioridade:**
   - "[URGENTE] Fix bug no upload"
   - "[NICE TO HAVE] Adicionar animações suaves"

4. **Peça validação:**
   - "Rode testes e confirme que nada quebrou"
   - "Verifique bundle size após mudança"

## 📊 Status Atual

| Capacidade | Status |
|-----------|--------|
| Análise de requisito | ✅ Pronto |
| Implementação React/TS | ✅ Pronto |
| Implementação Node.js | ✅ Pronto |
| Implementação Python | ✅ Pronto |
| Validação QA | ✅ Pronto |
| Documentação | ✅ Pronto |
| Deploy automation | ⏳ Em progresso |
| Database migrations | ⏳ Pendente |

---

**Pronto para começar!** Envie sua primeira tarefa:

```
/dev {sua tarefa aqui}
```
