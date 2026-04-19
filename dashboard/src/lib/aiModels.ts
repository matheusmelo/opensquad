// Catálogo de modelos do multi-ai-router do OpenSquad (orchestrator/multi-ai-router.js).
// Custos em USD por 1k tokens — fonte: tabela AI_MODELS do repo matheusmelo/opensquad.

export type AIModel = {
  id: string;
  name: string;
  provider: "anthropic" | "google" | "openai";
  model: string;
  cost_in: number;   // USD / 1k input tokens
  cost_out: number;  // USD / 1k output tokens
  max_tokens: number;
  speed: "very_fast" | "fast" | "medium" | "slow";
  quality: "good" | "very_good" | "excellent" | "best";
  free_tier: boolean;
  use_for: string[];
};

export const AI_MODELS: AIModel[] = [
  { id: "claude-haiku", name: "Claude 3 Haiku", provider: "anthropic", model: "claude-3-haiku-20240307",
    cost_in: 0.00025, cost_out: 0.00125, max_tokens: 200_000, speed: "fast", quality: "good", free_tier: true,
    use_for: ["boilerplate", "simple_fix", "docs", "test_generation", "translation"] },
  { id: "gemini-flash", name: "Gemini 1.5 Flash", provider: "google", model: "gemini-1.5-flash-latest",
    cost_in: 0.000075, cost_out: 0.0003, max_tokens: 1_000_000, speed: "very_fast", quality: "good", free_tier: true,
    use_for: ["debug", "translation", "simple_refactor", "code_explanation"] },
  { id: "gemini-pro", name: "Gemini 1.5 Pro", provider: "google", model: "gemini-1.5-pro-latest",
    cost_in: 0.00035, cost_out: 0.00105, max_tokens: 2_000_000, speed: "medium", quality: "very_good", free_tier: true,
    use_for: ["code_review", "architecture_review", "complex_analysis"] },
  { id: "claude-sonnet", name: "Claude 3.5 Sonnet", provider: "anthropic", model: "claude-3-5-sonnet-20241022",
    cost_in: 0.003, cost_out: 0.015, max_tokens: 200_000, speed: "medium", quality: "excellent", free_tier: false,
    use_for: ["refactor", "feature_dev", "code_review", "api_design"] },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", model: "gpt-4o-mini",
    cost_in: 0.00015, cost_out: 0.0006, max_tokens: 128_000, speed: "fast", quality: "very_good", free_tier: false,
    use_for: ["complex_logic", "architecture", "debug_hard", "system_design"] },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", model: "gpt-4o",
    cost_in: 0.0025, cost_out: 0.01, max_tokens: 128_000, speed: "medium", quality: "best", free_tier: false,
    use_for: ["critical_architecture", "security_review", "performance_optimization"] },
  { id: "claude-opus", name: "Claude 3 Opus", provider: "anthropic", model: "claude-3-opus-20240229",
    cost_in: 0.015, cost_out: 0.075, max_tokens: 200_000, speed: "slow", quality: "best", free_tier: false,
    use_for: ["mission_critical", "complex_research", "deep_analysis"] },
];

export const MODEL_BY_ID: Record<string, AIModel> = Object.fromEntries(AI_MODELS.map((m) => [m.id, m]));

export const PROVIDER_COLOR: Record<AIModel["provider"], string> = {
  anthropic: "hsl(28 90% 55%)",
  google: "hsl(210 90% 60%)",
  openai: "hsl(160 70% 45%)",
};

export function calcCost(modelId: string, tokensIn: number, tokensOut: number): number {
  const m = MODEL_BY_ID[modelId];
  if (!m) return 0;
  return (tokensIn / 1000) * m.cost_in + (tokensOut / 1000) * m.cost_out;
}

export function modelLabel(modelId: string): string {
  return MODEL_BY_ID[modelId]?.name ?? modelId;
}

export function fmtUsd(n: number, digits = 4): string {
  if (n === 0) return "$0";
  if (n < 0.0001) return `$${n.toExponential(2)}`;
  return `$${n.toFixed(digits)}`;
}
