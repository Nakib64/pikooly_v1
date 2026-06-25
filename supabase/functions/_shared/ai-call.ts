// Shared AI provider router. Reads admin selection from site_settings
// (keys: ai_search_provider, ai_search_model) and routes to the chosen
// provider. Used by all AI features (search, product content, blog, etc.)
import { createClient } from "npm:@supabase/supabase-js@2";

export type AIProvider = "lovable" | "gemini" | "openai" | "anthropic";

const DEFAULTS: Record<AIProvider, string> = {
  lovable: "google/gemini-3-flash-preview",
  gemini: "gemini-2.5-pro",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-20241022",
};

const friendlyProviderError = (provider: AIProvider, status: number, body: string) => {
  const text = body.toLowerCase();
  if (status === 429 || text.includes("quota") || text.includes("rate_limit") || text.includes("insufficient_quota")) {
    return `${provider === "openai" ? "OpenAI" : provider === "gemini" ? "Gemini" : provider === "anthropic" ? "Anthropic" : "Lovable AI"} quota or rate limit reached. Switch provider or add billing/credits.`;
  }
  if (status === 401 || status === 403 || text.includes("api key")) {
    return `${provider === "openai" ? "OpenAI" : provider === "gemini" ? "Gemini" : provider === "anthropic" ? "Anthropic" : "Lovable AI"} API key is invalid or unauthorized.`;
  }
  if (status === 404 || text.includes("model") || text.includes("not found")) {
    return `${provider === "openai" ? "OpenAI" : provider === "gemini" ? "Gemini" : provider === "anthropic" ? "Anthropic" : "Lovable AI"} model is unavailable. Use the default model name.`;
  }
  return `${provider} ${status}: ${body.slice(0, 200)}`;
};

export interface AIConfig {
  provider: AIProvider;
  model: string;
  keys: { openai?: string; anthropic?: string; gemini?: string };
}

export async function getAIConfig(): Promise<AIConfig> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "ai_search_provider", "ai_search_model",
        "ai_openai_api_key", "ai_anthropic_api_key", "ai_gemini_api_key",
      ]);
    const m: Record<string, string> = {};
    (data || []).forEach((r: any) => { m[r.key] = r.value || ""; });
    const provider = ((m.ai_search_provider || "lovable").toLowerCase() as AIProvider);
    const valid: AIProvider[] = ["lovable", "gemini", "openai", "anthropic"];
    const p = valid.includes(provider) ? provider : "lovable";
    // Validate model — fall back to default if it doesn't look like a real model id
    const rawModel = (m.ai_search_model || "").trim();
    const looksValid = (() => {
      if (!rawModel || rawModel.length < 4) return false;
      if (p === "openai") return /^(gpt-|o\d|chatgpt)/i.test(rawModel);
      if (p === "anthropic") return /^claude-/i.test(rawModel);
      if (p === "gemini") return /^gemini-/i.test(rawModel);
      return /\//.test(rawModel); // lovable expects "provider/model"
    })();
    const model = looksValid ? rawModel : DEFAULTS[p];
    return {
      provider: p,
      model,
      keys: {
        openai: m.ai_openai_api_key?.trim() || undefined,
        anthropic: m.ai_anthropic_api_key?.trim() || undefined,
        gemini: m.ai_gemini_api_key?.trim() || undefined,
      },
    };
  } catch {
    return { provider: "lovable", model: DEFAULTS.lovable, keys: {} };
  }
}

export interface AICallOpts {
  system: string;
  user: string;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  provider?: AIProvider;
  model?: string;
}

/** Calls the admin-selected AI provider and returns the raw text content. */
export async function callAI(opts: AICallOpts): Promise<string> {
  let { provider, model } = opts;
  const cfg = await getAIConfig();
  provider = provider || cfg.provider;
  model = model || cfg.model;
  const { system, user, json, temperature = 0.8, maxTokens = 2000 } = opts;

  if (provider === "openai") {
    const key = cfg.keys.openai || Deno.env.get("OPENAI_API_KEY");
    if (!key) throw new Error("OpenAI not configured — add OpenAI API Key in Admin → Settings → AI Provider");
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        ...(json ? { response_format: { type: "json_object" } } : {}),
        temperature,
      }),
    });
    if (!r.ok) throw new Error(friendlyProviderError("openai", r.status, await r.text()));
    const j = await r.json();
    return j?.choices?.[0]?.message?.content || "";
  }

  if (provider === "anthropic") {
    const key = cfg.keys.anthropic || Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) throw new Error("Anthropic not configured — add Anthropic API Key in Admin → Settings → AI Provider");
    const u = json ? user + "\n\nRespond with ONLY the JSON object, no prose, no markdown fences." : user;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: u }],
        temperature,
      }),
    });
    if (!r.ok) throw new Error(friendlyProviderError("anthropic", r.status, await r.text()));
    const j = await r.json();
    return j?.content?.[0]?.text || "";
  }

  if (provider === "gemini") {
    const key = cfg.keys.gemini || Deno.env.get("GEMINI_API_KEY");
    if (!key) throw new Error("Gemini not configured — add Gemini API Key in Admin → Settings → AI Provider");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${key}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          ...(json ? { responseMimeType: "application/json" } : {}),
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    });
    if (!r.ok) throw new Error(friendlyProviderError("gemini", r.status, await r.text()));
    const j = await r.json();
    return j?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  // Default: Lovable AI Gateway
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("Lovable AI not configured");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      ...(json ? { response_format: { type: "json_object" } } : {}),
      temperature,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(friendlyProviderError("lovable", r.status, t));
  }
  const j = await r.json();
  return j?.choices?.[0]?.message?.content || "";
}
