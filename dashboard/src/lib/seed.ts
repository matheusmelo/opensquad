import { supabase } from "@/integrations/supabase/client";
import { calcCost } from "@/lib/aiModels";

// Seed inspired by real OpenSquad concepts (squads, agents, handoffs, skills).
// Idempotent-ish: only runs if user has zero squads.
export async function seedDemoIfEmpty(userId: string) {
  const { count } = await supabase.from("squads").select("id", { count: "exact", head: true }).eq("owner_id", userId);
  if ((count ?? 0) > 0) return;

  // 1. Real OpenSquad skills catalog
  const REAL_SKILLS = [
    { name: "WhatsApp Integration", description: "Recebe e envia mensagens via WhatsApp Business API.", icon: "MessageSquare" },
    { name: "Apify", description: "Web scraping e crawling com runs do Apify.", icon: "Globe" },
    { name: "Resend", description: "Envio de emails transacionais via Resend.", icon: "Mail" },
    { name: "Canva", description: "Cria designs e templates visuais via Canva API.", icon: "Sparkles" },
    { name: "Image AI Generator", description: "Gera imagens via modelos de IA (Gemini/DALL-E).", icon: "Sparkles" },
    { name: "Instagram Publisher", description: "Publica posts e reels no Instagram.", icon: "Sparkles" },
    { name: "Blotato", description: "Distribui conteúdo em múltiplas redes sociais.", icon: "Webhook" },
    { name: "OpenSquad Skill Creator", description: "Meta-skill: gera novas skills automaticamente.", icon: "Terminal" },
    { name: "OpenSquad Agent Creator", description: "Meta-skill: cria novos agentes a partir de specs.", icon: "Bot" },
    { name: "PDF Parser", description: "Extrai texto e estrutura de documentos PDF.", icon: "FileText" },
  ];

  // Insert global skills if catalog is empty
  const { count: skillsCount } = await supabase.from("skills").select("id", { count: "exact", head: true }).eq("is_custom", false);
  if ((skillsCount ?? 0) === 0) {
    // is_custom=false skills require admin or service-role, but RLS allows any authenticated user to view.
    // We insert as custom user-owned for the seed so RLS passes.
    await supabase.from("skills").insert(REAL_SKILLS.map((s) => ({ ...s, owner_id: userId, is_custom: true })));
  }

  const { data: skills } = await supabase.from("skills").select("id, name").order("created_at");

  // 2. Two real squads
  const squadDefs = [
    {
      owner_id: userId, code: "shlomo-engineering", name: "Shlomo Engineering",
      description: "Pipeline de engenharia de dados: parse, classificação, validação e dashboard.",
      icon: "Cpu", triggers: ["shlomo", "engenharia", "dados"], pipeline_file: "pipelines/shlomo.yaml",
      response_max_chars: 2000, auto_run: true, status: "idle",
    },
    {
      owner_id: userId, code: "gestao-pessoal", name: "Gestão Pessoal",
      description: "Squad de produtividade pessoal: agenda, emails e lembretes.",
      icon: "Calendar", triggers: ["agenda", "lembrar", "tarefa"], pipeline_file: "pipelines/gestao.yaml",
      response_max_chars: 1500, auto_run: false, status: "idle",
    },
  ];

  const { data: squads } = await supabase.from("squads").insert(squadDefs).select();
  if (!squads) return;
  const shlomo = squads.find((s) => s.code === "shlomo-engineering")!;
  const gestao = squads.find((s) => s.code === "gestao-pessoal")!;

  // 3. Agents per squad with desks (col, row) and roles
  const agentDefs = [
    // shlomo-engineering pipeline (4 steps) — modelos do multi-ai-router OpenSquad
    { owner_id: userId, squad_id: shlomo.id, name: "Atlas", role: "PDF Parser Engineer", description: "Extrai dados de PDFs de entrada.", model: "gemini-flash", status: "idle" as const, gender: "male", desk_col: 0, desk_row: 0, system_prompt: "Você extrai texto estruturado de PDFs." },
    { owner_id: userId, squad_id: shlomo.id, name: "Nova", role: "Classification Engine", description: "Classifica os documentos por categoria.", model: "claude-haiku", status: "idle" as const, gender: "female", desk_col: 1, desk_row: 0, system_prompt: "Você classifica documentos em categorias." },
    { owner_id: userId, squad_id: shlomo.id, name: "Echo", role: "QA Validator", description: "Valida qualidade da classificação.", model: "gpt-4o-mini", status: "idle" as const, gender: "neutral", desk_col: 0, desk_row: 1, system_prompt: "Você valida resultados e retorna issues." },
    { owner_id: userId, squad_id: shlomo.id, name: "Vega", role: "Dashboard Builder", description: "Monta o dashboard final com os dados validados.", model: "claude-sonnet", status: "idle" as const, gender: "female", desk_col: 1, desk_row: 1, system_prompt: "Você gera HTML/JSON de dashboard." },
    // gestao-pessoal (2 agents)
    { owner_id: userId, squad_id: gestao.id, name: "Iris", role: "Calendar Agent", description: "Agenda compromissos.", model: "gemini-flash", status: "idle" as const, gender: "female", desk_col: 0, desk_row: 0, system_prompt: "Você gerencia o calendário do usuário." },
    { owner_id: userId, squad_id: gestao.id, name: "Lyra", role: "Email Agent", description: "Triagem e respostas de email.", model: "gpt-4o-mini", status: "idle" as const, gender: "female", desk_col: 1, desk_row: 0, system_prompt: "Você cuida de emails do usuário." },
  ];

  const { data: insertedAgents } = await supabase.from("agents").insert(agentDefs).select();
  if (!insertedAgents) return;

  // 4. Link skills to agents
  if (skills && skills.length) {
    const links = insertedAgents.flatMap((a, i) => skills.slice(0, 2 + (i % 3)).map((s) => ({
      agent_id: a.id, skill_id: s.id, enabled: true,
    })));
    await supabase.from("agent_skills").insert(links);
  }

  // 5. Demo tasks (queue)
  const tasks = [
    { created_by: userId, agent_id: insertedAgents[0].id, title: "Processar lote PDFs Q4", status: "running" as const, priority: "high" as const, progress: 60 },
    { created_by: userId, agent_id: insertedAgents[4].id, title: "Agendar reunião com cliente", status: "queued" as const, priority: "urgent" as const, progress: 0 },
    { created_by: userId, agent_id: insertedAgents[2].id, title: "Validação trimestral", status: "backlog" as const, priority: "medium" as const, progress: 0 },
    { created_by: userId, agent_id: insertedAgents[3].id, title: "Dashboard fechamento mês", status: "done" as const, priority: "medium" as const, progress: 100 },
    { created_by: userId, agent_id: insertedAgents[5].id, title: "Resposta automática FAQ", status: "failed" as const, priority: "low" as const, progress: 30 },
  ];
  await supabase.from("tasks").insert(tasks);

  // 6. Runs with handoffs — gera custos REAIS via tabela de preços do router
  const now = Date.now();
  for (let h = 0; h < 24 * 7; h++) { // 7 dias para alimentar a página de Custos
    const n = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < n; i++) {
      const squad = Math.random() < 0.65 ? shlomo : gestao;
      const squadAgents = insertedAgents.filter((a) => a.squad_id === squad.id);
      const firstAgent = squadAgents[Math.floor(Math.random() * squadAgents.length)];
      const started = new Date(now - h * 3600_000 - Math.random() * 3600_000);
      const duration = Math.floor(Math.random() * 30000) + 5000;
      const failed = Math.random() < 0.08;
      const stepTotal = squadAgents.length;
      const stepCurrent = failed ? Math.floor(Math.random() * stepTotal) + 1 : stepTotal;
      const tokensIn = Math.floor(Math.random() * 3000) + 300;
      const tokensOut = Math.floor(Math.random() * 2000) + 150;
      const realCost = calcCost(firstAgent.model, tokensIn, tokensOut);

      const { data: run } = await supabase.from("runs").insert({
        agent_id: firstAgent.id,
        squad_id: squad.id,
        status: failed ? "failed" as const : "success" as const,
        started_at: started.toISOString(),
        ended_at: new Date(started.getTime() + duration).toISOString(),
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        cost: Number(realCost.toFixed(8)),
        step_current: stepCurrent,
        step_total: stepTotal,
        step_label: squadAgents[Math.min(stepCurrent - 1, stepTotal - 1)]?.role ?? null,
        pipeline_file: squad.pipeline_file,
        error: failed ? "Validation step failed" : null,
      }).select().single();

      if (run && squadAgents.length > 1) {
        const handoffs = [];
        for (let j = 0; j < stepCurrent - 1 && j < squadAgents.length - 1; j++) {
          handoffs.push({
            run_id: run.id,
            from_agent: squadAgents[j].id,
            to_agent: squadAgents[j + 1].id,
            message: `Handoff: ${squadAgents[j].role} → ${squadAgents[j + 1].role}`,
            step_index: j,
            completed_at: new Date(started.getTime() + (duration / stepTotal) * (j + 1)).toISOString(),
          });
        }
        if (handoffs.length) await supabase.from("handoffs").insert(handoffs);
      }
    }
  }
}
