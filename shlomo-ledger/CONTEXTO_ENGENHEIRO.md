# Contexto Mestre de Engenharia: Shlomo Ledger

Este documento serve como o "Cérebro Técnico" e o roadmap oficial para o Agente Autônomo (Engenheiro de Software) que assumirá o desenvolvimento contínuo do **Shlomo Ledger**. O MVP inicial já foi inicializado (React + Vite + TailwindCSS v4). 

Leia tudo antes de programar novas features.

---

## 1. Visão do Produto
**Nome:** Shlomo Ledger  
**Filosofia:** Governança financeira baseada nos princípios de sabedoria do Rei Salomão. O objetivo central não é apenas registrar gastos, mas dar visão de futuro, controle absoluto de "cada centavo" e paz mental ao usuário.

**O Problema Atual:**
O usuário possui finanças pessoais e finanças corporativas (Agência Orion / Carreira Musical) completamente misturadas em faturas de cartão de crédito e contas bancárias caóticas. O app deve ser capaz de interpretar dados brutos futuramente.

---

## 2. Arquitetura de Dados e Contextos
O sistema possui uma divisão **ESTRITA** no nível mais alto ("Context Switcher" na UI). Os dados de um contexto não podem vazar para o outro.

### Contexto A: Gestão Pessoal (PF) - O Método dos "3 Pulmões"
Baseado em planilhas e metodologias financeiras. A renda líquida alimenta 3 "pulmões" (buckets).

*   🔴 **Pulmão 1: Essenciais (Sobrevivência)**  
    *Cores:* Tailwind `bg-red-500` / `bg-red-900`
    *Escopo:* Habitação (aluguel, condomínio, diarista), Transporte (prestação, seguro), Educação, Serviços (luz, água, cel), Impostos, Alimentação Básica (supermercado, feira), Cuidados Pessoais.
*   🟤 **Pulmão 2: Eventuais (Qualidade / Segurança)**  
    *Cores:* Tailwind `bg-red-800` (Vinho/Marrom Escuro)
    *Escopo:* Saúde, Manutenções (carro/casa), Vestuário, Presentes, Reservas pontuais. Gastos que não ocorrem todo mês mas exigem caixa.
*   🔵 **Pulmão 3: Lazer e Estilo de Vida**  
    *Cores:* Tailwind `bg-blue-600` / `bg-blue-900`
    *Escopo:* Viagens, Cinema, Restaurantes, Bares, Presentes Sociais.

### Contexto B: Gestão Orion & Musical (PJ)
*   *Cores:* Tailwind `bg-emerald-600`
*   *Escopo:* Entradas de tráfego, campanhas, lançamentos meteóricos, ganhos com royalties de música, projetos da agência e pagamento de impostos corporativos.

---

## 3. Stack Tecnológica
- **Frontend:** React (TypeScript).
- **Tooling:** Vite, Node.js.
- **Estilização:** Tailwind CSS v4 (Design tokens já declarados no `src/index.css` via `@theme`).
- **UI/UX:** Dark mode nativo (`bg-zinc-950`). Utilização forte de Glassmorphism (fundos com translucidez e `backdrop-blur`), gradientes discretos para profundidade (`shadow-2xl`, bordas sutis `border-zinc-800`), e UI Premium moderna.

---

## 4. Próximos Passos (Roadmap de Desenvolvimento)

Ao iniciar uma sessão de código, o agente autônomo deve escolher as tarefas listadas abaixo ou seguir a solicitação imediata do usuário:

1.  **Ingestão de Dados (O Núcleo do Caos):**
    *   Criar rotas, parsers ou componentes de Upload para Faturas (PDFs / CSV dos bancos).
    *   Criar um modelo de Inteligência/Regras (regex ou integração local LLM) para classificar os gastos do CSV em "PF - Pulmão X" ou "PJ - Orion".

2.  **Módulo de Regras (Brain):**
    *   Permitir que o usuário crie regras de classificação automáticas (Ex: se a descrição contiver "UBER", classificar sempre como "Transporte / Pulmão 1").

3.  **Dashboards de Visualização Anual:**
    *   O MVP possui cards estáticos. O próximo passo lógico é criar visualização de 12 meses, calculando fluxos percentuais de saúde financeira a longo prazo.

4.  **Consumo de Referências do Usuário:**
    *   **Playlist Youtube:** O agente autônomo deve utilizar integração de web-search (se disponível no seu terminal) nas referências deste link: `https://youtube.com/playlist?list=PLocPqX6MXf_0x6Etgkw4omFOrGNA81U8Y`
    *   **Planilhas:** Extrair a mecânica da planilha: `https://docs.google.com/spreadsheets/d/1RXHT2rGAIYWMrrcHWfbH1_DQRV2ZkB2q83WyaYfAKTw/edit?usp=sharing`

---

## 5. Regras de Ouro de Programação para o Agente Autônomo
- Não mude a arquitetura base (Vite/React/Tailwind) para frameworks mais pesados como Next.js sem autorização explícita.
- Mantenha componentes puristas e modulares.
- Toda nova dependência visual (ex: Recharts, Framer Motion) deve agregar valor estético "Premium". Shlomo Ledger não pode parecer uma planilha "feia" com botões quadrados; deve ter cara de ferramenta profissional. 
- Salve as mudanças, mantenha o repositório limpo e pergunte sempre ao usuário por feedback visual ao concluir uma interface.
