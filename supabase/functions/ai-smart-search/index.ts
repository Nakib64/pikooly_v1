// AI Smart Search — natural language → product recommendations
// Routes to the admin-selected provider (site_settings.ai_search_provider)
import { createClient } from "npm:@supabase/supabase-js@2";
import { callAI, getAIConfig } from "../_shared/ai-call.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, slug, price, image_url, tags, short_description, category_id, rating")
      .eq("is_active", true)
      .limit(300);
    if (error) throw error;

    const catalog = (products || []).map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price) || 0,
      tags: (p.tags || []).slice(0, 8),
      desc: (p.short_description || "").replace(/<[^>]+>/g, "").slice(0, 120),
    }));

    const system = `You are an empathetic gift concierge for Pikooly (flower & gift shop, Bangladesh).
Your job is to deeply understand the CUSTOMER'S FEELINGS and INTENT — no matter what language they write in.

MULTI-LANGUAGE SUPPORT (CRITICAL):
- The customer may write in ANY language or script: English, Bangla (বাংলা), Banglish (Roman Bangla), Hindi, Hinglish, Urdu, Arabic, Spanish, French, Chinese, Japanese, Korean, Russian, or anything else.
- Auto-detect the language and script of the query.
- ALWAYS write the "intent" and "reason" fields in the SAME language and script the customer used. If they mix two languages, mix them naturally.

Read between the lines to infer occasion, recipient, emotion, color hints, budget (BDT), urgency.
Then pick the 8 BEST matching products, ranked best→good.
Reply ONLY valid JSON.`;

    const user = `User query: "${query}"

Catalog (${catalog.length} items):
${JSON.stringify(catalog).slice(0, 60000)}

Return JSON (intent + reason MUST be in the same language/script as the user query):
{
  "intent": "<1 sentence in user's language>",
  "ids": ["<product id>", ...up to 8, ranked best→good],
  "reason": "<1-2 warm sentences in the user's language>"
}`;

    const { provider, model } = await getAIConfig();

    const fallbackMatches = () => {
      const q = query.toLowerCase();
      const words = q.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);
      return (products || [])
        .map((p) => {
          const haystack = [p.name, p.short_description, (p.tags || []).join(" ")].join(" ").toLowerCase();
          const score = words.reduce((sum, w) => sum + (haystack.includes(w) ? 1 : 0), 0) + (Number(p.rating) || 0) / 10;
          return { p, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((x) => x.p);
    };

    let content = "{}";
    try {
      content = await callAI({ system, user, json: true, provider, model });
    } catch (e) {
      const msg = (e as Error).message || "AI error";
      return new Response(JSON.stringify({
        intent: "",
        reason: msg,
        products: fallbackMatches(),
        provider,
        model,
        warning: msg,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
    }

    const ids: string[] = Array.isArray(parsed.ids) ? parsed.ids.filter((x: any) => typeof x === "string") : [];
    const byId = new Map((products || []).map((p) => [p.id, p]));
    const matches = ids.map((id) => byId.get(id)).filter(Boolean);

    return new Response(JSON.stringify({
      intent: parsed.intent || "",
      reason: parsed.reason || "",
      products: matches,
      provider,
      model,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
