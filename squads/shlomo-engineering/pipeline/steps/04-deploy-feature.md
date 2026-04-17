---
id: build-dashboard
name: "Construção de Dashboard"
agent: dashboard-builder
execution: subagent
model_tier: powerful
inputFile: squads/shlomo-engineering/output/{run_id}/dashboard-data.json
outputFile: shlomo-ledger/src/components/Dashboard.tsx
format: react-dashboard
---

# Instruções do Passo 3: Construção de Dashboard

## Objetivo
Construir ou atualizar componentes React do Shlomo Ledger com base nos dados classificados, seguindo estética premium dark mode.

## Contexto
O Shlomo Ledger usa:
- React + TypeScript + Vite
- Tailwind CSS v4 com design tokens customizados
- Dark mode nativo (`bg-zinc-950`)
- Glassmorphism e gradientes sutis
- Cores dos pulmões: Pulmão 1=red-500, Pulmão 2=red-800, Pulmão 3=blue-600, PJ=emerald-600

## Processo

1. **Carregar dados** de `dashboard-data.json`
2. **Analisar estrutura** dos dados (pulmoes[], transacoes[], alertas[])
3. **Construir componentes**:
   
   ### LungCard Component
   ```tsx
   interface LungCardProps {
     lung: {
       label: string;
       gasto: number;
       teto: number;
       status: 'OK' | 'ALERTA' | 'CRITICO';
       icon: string;
       color: string;
     };
   }
   ```
   
   Features:
   - Barra de progresso circular ou linear com % de uso
   - Valor gasto vs teto
   - Ícone visual
   - Hover effects suaves
   - Cor dinâmica baseada no status (verde/amarelo/vermelho)

   ### MonthlyOverview Component
   - Grid com 3 cards de pulmões
   - Receita total do mês em destaque
   - Saldo livre (receita - despesas)
   - Barra de distribuição percentual empilhada

   ### TransactionTable Component
   - Lista scrollable com todas as transações
   - Filtros por pulmão/categoria
   - Badge de confiança da classificação
   - Botão de reclassificação manual

4. **Estilizar com Tailwind**
   - Usar classes utilitárias para glassmorphism: `backdrop-blur-md bg-opacity-50`
   - Bordas sutis: `border border-zinc-800`
   - Sombras profundas: `shadow-2xl`
   - Gradientes discretos: `bg-gradient-to-br from-zinc-900 to-zinc-950`

5. **Integrar com App existente**
   - Importar novos componentes em `shlomo-ledger/src/App.tsx`
   - Passar dados via props ou Zustand store
   - Testar responsividade (mobile/desktop)

## Output Esperado

Arquivos `.tsx` em `shlomo-ledger/src/components/`:
- `LungCard.tsx`
- `MonthlyOverview.tsx`
- `TransactionTable.tsx`

Atualização em `shlomo-ledger/src/App.tsx` integrando componentes.

## Critérios de Sucesso
- Zero erros de compilação TypeScript
- Componentes responsivos (testar em 320px, 768px, 1920px)
- Animações suaves (transition-all duration-300)
- Acessibilidade básica (ARIA labels)

## Veto Conditions
- Erros de TypeScript → RETRY
- Componentes não responsivos → RETRY
- Cores fora da paleta definida → REJEITAR
- Hardcoded values ao invés de usar props → RETRY
