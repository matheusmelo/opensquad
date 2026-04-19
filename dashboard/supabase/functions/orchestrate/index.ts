// Orquestrador OpenSquad — executa pipeline de um squad sequencialmente via Lovable AI Gateway,
// registrando handoffs reais entre agentes, custos e tokens.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mesmo catálogo de custos do front (src/lib/aiModels.ts)
const COSTS: Record<string, { in: number; out: number; gateway: string }> = {
  "claude-haiku":   { in: 0.00025,  out: 0.00125, gateway: "google/gemini-2.5-flash-lite" },
  "gemini-flash":   { in: 0.000075, out: 0.0003,  gateway: "google/gemini-2.5-flash-lite" },
  "gemini-pro":     { in: 0.00035,  out: 0.00105, gateway: "google/gemini-2.5-flash" },
  "claude-sonnet":  { in: 0.003,    out: 0.015,   gateway: "google/gemini-2.5-pro" },
  "gpt-4o-mini":    { in: 0.00015,  out: 0.0006,  gateway: "openai/gpt-5-mini" },
  "gpt-4o":         { in: 0.0025,   out: 0.01,    gateway: "openai/gpt-5" },
  "claude-opus":    { in: 0.015,    out: 0.075,   gateway: "openai/gpt-5" },
};

function mapModel(modelId: string) {
  const m = COSTS[modelId];
  return { gateway: m?.gateway ?? "google/gemini-2.5-flash", in: m?.in ?? 0.0001, out: m?.out ?? 0.0004 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "missing auth" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "unauthenticated" }, 401);

    const { squadId, prompt } = await req.json();
    if (!squadId || !prompt) return json({ error: "squadId and prompt required" }, 400);

    const { data: squad } = await supabase.from("squads").select("*").eq("id", squadId).maybeSingle();
    if (!squad) return json({ error: "squad not found" }, 404);

    const { data: agents } = await supabase.from("agents")
      .select("*").eq("squad_id", squadId).order("desk_col");
    if (!agents?.length) return json({ error: "squad has no agents" }, 400);

    // Cria run no primeiro agente (pipeline inteiro contabiliza nele como entry point)
    const { data: run, error: runErr } = await supabase.from("runs").insert({
      agent_id: agents[0].id, squad_id: squadId,
      status: "running", step_total: agents.length, step_current: 0,
      step_label: agents[0].role ?? agents[0].name,
      pipeline_file: squad.pipeline_file ?? `${squad.code}.pipeline.json`,
    }).select().single();
    if (runErr || !run) return json({ error: runErr?.message ?? "run insert failed" }, 500);

    await supabase.from("squads").update({ status: "running" }).eq("id", squadId);

    // Executa em background, retorna 202 imediatamente
    const exec = async () => {
      const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;
      let lastOutput = prompt;
      let totalIn = 0, totalOut = 0, totalCost = 0;

      try {
        for (let i = 0; i < agents.length; i++) {
          const agent = agents[i];
          await supabase.from("runs").update({
            step_current: i, step_label: agent.role ?? agent.name,
          }).eq("id", run.id);
          await supabase.from("agents").update({ status: "working" }).eq("id", agent.id);
          await supabase.from("run_logs").insert({
            run_id: run.id, level: "info",
            message: `Agente ${agent.name} (${agent.role ?? "—"}) iniciou step ${i + 1}/${agents.length}`,
          });

          const mapped = mapModel(agent.model);
          const sys = agent.system_prompt ??
            `Você é ${agent.name}, ${agent.role ?? "agente"} do squad ${squad.name}. Entregue resposta concisa em PT-BR.`;
          const userMsg = i === 0
            ? `Comando recebido: ${prompt}`
            : `Saída do agente anterior:\n${lastOutput}\n\nSua tarefa: continue o pipeline.`;

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: mapped.gateway,
              messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
            }),
          });

          if (aiRes.status === 429) throw new Error("rate_limit: AI gateway 429");
          if (aiRes.status === 402) throw new Error("payment_required: créditos AI esgotados");
          if (!aiRes.ok) throw new Error(`AI ${aiRes.status}: ${await aiRes.text()}`);

          const aiData = await aiRes.json();
          const content = aiData.choices?.[0]?.message?.content ?? "";
          const usage = aiData.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
          const tIn = usage.prompt_tokens ?? 0, tOut = usage.completion_tokens ?? 0;
          const cost = (tIn / 1000) * mapped.in + (tOut / 1000) * mapped.out;
          totalIn += tIn; totalOut += tOut; totalCost += cost;

          await supabase.from("agents").update({ status: "delivering" }).eq("id", agent.id);
          await supabase.from("handoffs").insert({
            run_id: run.id, step_index: i,
            from_agent: agent.id,
            to_agent: agents[i + 1]?.id ?? null,
            message: content.slice(0, 800),
            completed_at: new Date().toISOString(),
          });
          await supabase.from("run_logs").insert({
            run_id: run.id, level: "info",
            message: `${agent.name} concluiu (${tIn}+${tOut} tokens, $${cost.toFixed(5)})`,
            data: { tokens_in: tIn, tokens_out: tOut, cost },
          });
          await supabase.from("agents").update({ status: "done" }).eq("id", agent.id);

          lastOutput = content;
        }

        await supabase.from("runs").update({
          status: "success", ended_at: new Date().toISOString(),
          step_current: agents.length, step_label: "completed",
          tokens_in: totalIn, tokens_out: totalOut, cost: totalCost,
        }).eq("id", run.id);
        await supabase.from("squads").update({ status: "idle" }).eq("id", squadId);
        // reset agents para idle
        for (const a of agents) await supabase.from("agents").update({ status: "idle" }).eq("id", a.id);
      } catch (e: any) {
        await supabase.from("runs").update({
          status: "failed", ended_at: new Date().toISOString(),
          error: String(e?.message ?? e),
          tokens_in: totalIn, tokens_out: totalOut, cost: totalCost,
        }).eq("id", run.id);
        await supabase.from("run_logs").insert({
          run_id: run.id, level: "error", message: `Pipeline falhou: ${e?.message ?? e}`,
        });
        await supabase.from("squads").update({ status: "idle" }).eq("id", squadId);
        for (const a of agents) await supabase.from("agents").update({ status: "idle" }).eq("id", a.id);
      }
    };

    // @ts-ignore EdgeRuntime global
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(exec());
    else exec();

    return json({ runId: run.id, squadId, agents: agents.length }, 202);
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
