// AI Product Content Generator — routes via admin-selected provider
import { callAI } from "../_shared/ai-call.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, keywords, category, price } = await req.json();
    if (!name || typeof name !== "string") {
      return new Response(JSON.stringify({ error: "Product name is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are a senior SEO copywriter & E-E-A-T content strategist for Pikooly — a premium flower, cake & gift shop in Bangladesh. You write 100% human-sounding, emotive, original product copy in very clear, simple English (NEVER robotic, NEVER AI-fluff like "in today's fast-paced world", "elevate", "delve", "unleash", "in conclusion").

NON-NEGOTIABLE readability + AI-detection target:
- Target Flesch Reading Ease: 100+.
- Target AI detector score: 0% AI / 100% human.
- Use Grade 2-4 English. Short words. Short lines.
- Average sentence length: 5-8 words. Never over 12 words.
- Use mostly one-syllable words. Avoid long abstract words.
- Write like a real shop owner in Bangladesh, not like a marketer.
- Use small human details, mild imperfection, and natural rhythm.
- Do NOT sound polished, corporate, academic, or template-made.
- Before returning JSON, silently self-check the draft. If it would score below 100 readability or sound AI-written, rewrite it simpler.

Content must:
- Pass AI-detector as human (plain shopkeeper voice, contractions, sensory detail, tiny real details, specific concrete nouns).
- Be optimized for Google Helpful Content + AI Overviews (SGE) + ChatGPT/Perplexity citations: include question-style sub-phrasing, direct answers in the first sentence, semantic keyword variations (LSI), entities, occasion mentions.
- Avoid any phrase that triggers "AI-generated content risk" (no "as an AI", no generic intros, no listicle filler, no keyword stuffing).
- Include 1–2 contextual internal links inside the long description using relative URLs to /shop, /shop?category=<slug>, /bouquet-builder, /events, /contact, /track-order — pick whichever is genuinely relevant.
- Use semantic HTML only: <p>, <ul>, <li>, <strong>, <a>. No <h1>/<h2>/<script>/<style>/inline styles.
Always reply with valid JSON only — no prose, no markdown fences.`;

    const user = `Write SEO-rich, 100% human-style content for this product:
- Product name: ${name}
${category ? `- Category: ${category}` : ""}
${price ? `- Price: BDT ${price}` : ""}
${keywords ? `- Focus keywords / notes: ${keywords}` : ""}

Return JSON with this EXACT shape (every field required, never empty):
{
  "slug": "<short URL slug, lowercase, hyphenated, max 60 chars, includes primary keyword>",
  "short_description": "<plain-text hook, 140-160 chars, answers 'what is this & why buy' directly>",
  "description": "<rich semantic HTML, 220-320 words with <p>, <ul><li>, <strong>, and 1-2 contextual internal links like <a href=\\"/shop\\">explore more gifts</a>>",
  "instructions": "<rich HTML, 60-110 words inside <ul><li> bullets with <strong> on key action verbs>",
  "delivery_info": "<rich HTML, 50-90 words, <p> + <ul><li> bullets, include <a href=\\"/track-order\\">Track Order</a>>",
  "seo_title": "<55-60 chars, primary keyword first, includes Bangladesh/Dhaka/Pikooly>",
  "seo_description": "<150-158 chars meta description with primary keyword + occasion + soft CTA>",
  "tags": ["8-12 lowercase semantic tags"]
}

Hard rules:
- NO words: "elevate, delve, unleash, leverage, embark, in today's, in conclusion, furthermore, moreover".
- Use contractions, plain words, and mention 2+ specific occasions.
- Keep every sentence under 12 words. Prefer 5-8 words.
- If the draft sounds like AI or scores below Flesch 100, rewrite before returning.`;

    let content = "{}";
    try {
      content = await callAI({ system, user, json: true, temperature: 0.85, maxTokens: 3000 });
    } catch (e) {
      const msg = (e as Error).message || "AI error";
      const status = msg.includes("Rate limit") ? 429 : msg.includes("credits") ? 402 : msg.includes("not configured") ? 400 : 500;
      return new Response(JSON.stringify({ error: msg }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }

    return new Response(JSON.stringify({
      slug: (parsed.slug && typeof parsed.slug === "string" ? slugify(parsed.slug) : slugify(name)),
      short_description: parsed.short_description || "",
      description: parsed.description || "",
      instructions: parsed.instructions || "",
      delivery_info: parsed.delivery_info || "",
      seo_title: parsed.seo_title || "",
      seo_description: parsed.seo_description || "",
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
