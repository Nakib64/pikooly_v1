// Shared helpers for image generation & vision calls.
// Routes through the admin-selected AI provider (site_settings.ai_search_provider)
// and the matching API key. Falls back to LOVABLE_API_KEY if no admin key set,
// then to GEMINI_API_KEY/OPENAI_API_KEY/ANTHROPIC_API_KEY env vars.
//
// Supported providers per capability:
//   - text vision JSON: lovable, gemini, openai, anthropic
//   - image generation: lovable, gemini, openai   (anthropic falls back to gemini→openai)
import { createClient } from "npm:@supabase/supabase-js@2";

type Provider = "lovable" | "gemini" | "openai" | "anthropic";

interface AISettings {
  provider: Provider;
  keys: {
    lovable?: string;
    gemini?: string;
    openai?: string;
    anthropic?: string;
  };
}

async function loadSettings(): Promise<AISettings> {
  const keys = {
    lovable: Deno.env.get("LOVABLE_API_KEY") || undefined,
    gemini: Deno.env.get("GEMINI_API_KEY") || undefined,
    openai: Deno.env.get("OPENAI_API_KEY") || undefined,
    anthropic: Deno.env.get("ANTHROPIC_API_KEY") || undefined,
  };
  let provider: Provider = "lovable";
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["ai_search_provider", "ai_gemini_api_key", "ai_openai_api_key", "ai_anthropic_api_key"]);
    const m: Record<string, string> = {};
    (data || []).forEach((r: any) => { if (r.value) m[r.key] = String(r.value).trim(); });
    const p = (m.ai_search_provider || "lovable").toLowerCase();
    if (["lovable", "gemini", "openai", "anthropic"].includes(p)) provider = p as Provider;
    if (m.ai_gemini_api_key) keys.gemini = m.ai_gemini_api_key;
    if (m.ai_openai_api_key) keys.openai = m.ai_openai_api_key;
    if (m.ai_anthropic_api_key) keys.anthropic = m.ai_anthropic_api_key;
  } catch { /* ignore */ }
  return { provider, keys };
}

/** Pick provider for a capability — honour admin choice, fall back through list. */
function pick(s: AISettings, order: Provider[]): { provider: Provider; key: string } | null {
  const ordered: Provider[] = [s.provider, ...order.filter((p) => p !== s.provider)];
  for (const p of ordered) {
    const k = s.keys[p];
    if (k) return { provider: p, key: k };
  }
  return null;
}

const NO_AI_ERROR = "AI not configured — set an active provider and API key in Admin → Settings → AI Provider";

/* ============================================================
 *  IMAGE GENERATION (text → image)
 * ============================================================ */
export async function generateImageB64(prompt: string): Promise<string> {
  const s = await loadSettings();
  // Anthropic can't generate images — skip it in the fallback order
  const p = pick(s, ["lovable", "gemini", "openai"]);
  if (!p || p.provider === "anthropic") {
    const p2 = pick({ ...s, provider: "lovable" }, ["lovable", "gemini", "openai"]);
    if (!p2 || p2.provider === "anthropic") throw new Error(NO_AI_ERROR);
    return runImageGen(prompt, p2);
  }
  return runImageGen(prompt, p);
}

async function runImageGen(prompt: string, p: { provider: Provider; key: string }): Promise<string> {
  if (p.provider === "lovable") {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!r.ok) throw new Error(`Lovable AI ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    const b64 = j?.data?.[0]?.b64_json
      || j?.choices?.[0]?.message?.images?.[0]?.image_url?.url?.split(",")[1];
    if (!b64) throw new Error("No image returned");
    return b64;
  }

  if (p.provider === "openai") {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
      body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1024", n: 1 }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    const b64 = j?.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned from OpenAI");
    return b64;
  }

  // Gemini
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${p.key}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const parts = j?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) if (part?.inlineData?.data) return part.inlineData.data;
  throw new Error("No image returned from Gemini");
}

/* ============================================================
 *  VISION → JSON (image + text → structured JSON)
 * ============================================================ */
export async function visionJson(opts: {
  system: string;
  userText: string;
  imageUrl: string;
}): Promise<any> {
  const s = await loadSettings();
  const p = pick(s, ["lovable", "gemini", "openai", "anthropic"]);
  if (!p) throw new Error(NO_AI_ERROR);

  if (p.provider === "lovable") {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: [
            { type: "text", text: opts.userText },
            { type: "image_url", image_url: { url: opts.imageUrl } },
          ] },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });
    if (!r.ok) throw new Error(`Lovable AI ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    return safeJson(j?.choices?.[0]?.message?.content);
  }

  if (p.provider === "openai") {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: [
            { type: "text", text: opts.userText },
            { type: "image_url", image_url: { url: opts.imageUrl } },
          ] },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    return safeJson(j?.choices?.[0]?.message?.content);
  }

  if (p.provider === "anthropic") {
    const { mime, b64 } = await fetchImageB64(opts.imageUrl);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": p.key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        system: opts.system,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
            { type: "text", text: opts.userText + "\n\nRespond with ONLY a JSON object, no prose, no markdown fences." },
          ],
        }],
        temperature: 0.2,
      }),
    });
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    return safeJson(j?.content?.[0]?.text);
  }

  // Gemini direct
  const { mime, b64 } = await fetchImageB64(opts.imageUrl);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${p.key}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{
        role: "user",
        parts: [
          { text: opts.userText },
          { inlineData: { mimeType: mime, data: b64 } },
        ],
      }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return safeJson(j?.candidates?.[0]?.content?.parts?.[0]?.text);
}

/* ============================================================
 *  IMAGE-WITH-REFS (text + reference images → image)
 * ============================================================ */
export async function generateImageWithRefs(prompt: string, refImages: string[]): Promise<string> {
  const s = await loadSettings();
  // OpenAI gpt-image-1 supports edits but the gateway path requires multipart; for simplicity
  // route OpenAI selection to Gemini for ref-based gen (better multimodal support).
  const p = pick(s, ["lovable", "gemini"]) || pick({ ...s, provider: "lovable" }, ["lovable", "gemini"]);
  if (!p) throw new Error(NO_AI_ERROR);

  if (p.provider === "lovable") {
    const content: any[] = [{ type: "text", text: prompt }];
    for (const img of refImages.slice(0, 3)) {
      content.push({ type: "image_url", image_url: { url: img } });
    }
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      const err: any = new Error(`Lovable AI ${r.status}: ${t.slice(0, 200)}`);
      err.status = r.status;
      throw err;
    }
    const j = await r.json();
    const msg = j?.choices?.[0]?.message;
    const url = msg?.images?.[0]?.image_url?.url || msg?.images?.[0]?.url;
    if (!url) throw new Error("No image returned");
    return url;
  }

  // Gemini direct (handles either provider falling through)
  const key = s.keys.gemini;
  if (!key) throw new Error("Gemini API Key required for reference-image generation. Add it in Admin → Settings → AI Provider.");
  const parts: any[] = [{ text: prompt }];
  for (const img of refImages.slice(0, 3)) {
    const m = img.match(/^data:(.+?);base64,(.+)$/);
    if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${key}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const respParts = j?.candidates?.[0]?.content?.parts || [];
  for (const part of respParts) {
    if (part?.inlineData?.data) return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
  }
  throw new Error("No image returned from Gemini");
}

/* ============================================================ */

async function fetchImageB64(imageUrl: string): Promise<{ mime: string; b64: string }> {
  const m = imageUrl.match(/^data:(.+?);base64,(.+)$/);
  if (m) return { mime: m[1], b64: m[2] };
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Could not fetch image (${res.status})`);
  const mime = res.headers.get("content-type") || "image/jpeg";
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return { mime, b64: btoa(bin) };
}

function safeJson(raw: any): any {
  const s = typeof raw === "string" ? raw : "";
  try { return JSON.parse(s); }
  catch {
    return { verdict: "suspicious", confidence: 0, summary: "Could not parse AI response", reasons: [s.slice(0, 200)] };
  }
}
