import OpenAI from 'openai';

/**
 * LLM layer — routed through NY Token Exchange (TrustedRouter), an OpenAI-compatible
 * multi-provider gateway with privacy floors (ZDR / confidential) and per-call cost.
 * Falls back to OpenAI / Anthropic-compatible keys, then to deterministic heuristics.
 */
export type LlmStats = { calls: number; costMicro: number; tokens: number; provider: string; models: Record<string, number> };
export const llmStats: LlmStats = { calls: 0, costMicro: 0, tokens: 0, provider: 'none', models: {} };

let client: OpenAI | null = null;
let defaultModel = '';
let extraBody: Record<string, unknown> | undefined;

export function initLlm() {
  const nyte = process.env.NYTE_API_KEY || process.env.TR_API_KEY || process.env.TRUSTEDROUTER_API_KEY;
  if (nyte) {
    client = new OpenAI({ apiKey: nyte, baseURL: process.env.NYTE_BASE_URL || 'https://api.nytokenexchange.com/v1' });
    defaultModel = process.env.NYTE_MODEL || 'nyte/auto';
    // Accessibility audits can contain private page content: enforce a zero-data-retention floor.
    extraBody = { provider: { min_privacy: process.env.NYTE_PRIVACY || 'zdr' } };
    llmStats.provider = 'NY Token Exchange';
  } else if (process.env.OPENAI_API_KEY) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
    defaultModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    llmStats.provider = 'OpenAI';
  } else if (process.env.ANTHROPIC_API_KEY) {
    client = new OpenAI({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: 'https://api.anthropic.com/v1/' });
    defaultModel = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
    llmStats.provider = 'Anthropic';
  } else {
    llmStats.provider = 'offline heuristics';
  }
  return llmStats.provider;
}

export const llmAvailable = () => !!client;

export async function chat(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  opts: { model?: string; json?: boolean; maxTokens?: number; temperature?: number } = {},
): Promise<string | null> {
  if (!client) return null;
  const model = opts.model || defaultModel;
  try {
    const res: any = await client.chat.completions.create({
      model,
      messages,
      max_tokens: opts.maxTokens ?? 1200,
      temperature: opts.temperature ?? 0.3,
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      ...(extraBody ? ({ provider: (extraBody as any).provider } as any) : {}),
    } as any);
    llmStats.calls++;
    llmStats.tokens += res.usage?.total_tokens || 0;
    llmStats.costMicro += Number(res.usage?.cost_microdollars || 0);
    const used = res.model || model;
    llmStats.models[used] = (llmStats.models[used] || 0) + 1;
    return res.choices?.[0]?.message?.content ?? null;
  } catch (e: any) {
    console.warn('[llm] call failed:', e?.status, e?.message?.slice(0, 200));
    return null;
  }
}

export async function chatJson<T = any>(system: string, user: string, opts: { model?: string; maxTokens?: number } = {}): Promise<T | null> {
  const out = await chat(
    [
      { role: 'system', content: system + '\nRespond with a single valid JSON object only.' },
      { role: 'user', content: user },
    ],
    { ...opts, json: true },
  );
  if (!out) return null;
  try {
    const m = out.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : out) as T;
  } catch {
    return null;
  }
}
