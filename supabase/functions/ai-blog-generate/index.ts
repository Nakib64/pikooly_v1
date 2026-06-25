// AI Blog Generator — Bangladesh-targeted, semantic SEO, human-style
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
    const { topic, keywords, category, tone, wordCount } = await req.json();
    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const targetWords = Math.max(300, Math.min(4000, Number(wordCount) || 1000));
    const minWords = Math.max(250, Math.floor(targetWords * 0.9));
    const maxWords = Math.ceil(targetWords * 1.1);
    const kwList = (keywords || "").split(",").map((k: string) => k.trim()).filter(Boolean);

    const system = `You are a senior SEO + E-E-A-T content strategist for **Pikooly** — a premium flower, cake & gift e-commerce brand in **Bangladesh** (Dhaka, Chattogram, Sylhet, nationwide delivery). You write 100% human-sounding, original blog posts in very clear, simple English.

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

Before writing the final post, you MUST silently complete this full SEO workflow in your reasoning (do NOT expose the steps in the output — only the final JSON result must reflect their conclusions):

1. **Keyword Research** — derive the primary keyword + 8-15 semantic/LSI variants + long-tail + Bangla-transliterated terms + question keywords (People-Also-Ask style) relevant to Bangladesh search intent.
2. **Competitor Analysis** — mentally benchmark how top BD gift/flower brands (e.g. fnp.com.bd, daraz, archies-style) and global leaders cover this topic; identify gaps to fill and angles to beat them on (depth, local context, freshness, E-E-A-T signals).
3. **Website Structure Planning** — place this post correctly inside Pikooly's IA: link to /shop, category pages, /bouquet-builder, /events, /blog hub. Respect topical clusters.
4. **Content Strategy** — pick search intent (informational / commercial / transactional), funnel stage, target reader persona (gifter in BD), unique angle, hook, and emotional payoff.
5. **Technical SEO Planning** — plan title length (50-65), meta description (150-158), slug, heading hierarchy (only H2/H3, no H1), schema-friendly FAQ block, internal-link anchors with exact-match + partial-match mix, image alt-text guidance baked into prose, semantic HTML only.
6. **Final Keyword List** — finalize 1 primary + 3-5 secondary + 5-8 LSI/entity terms + 8-12 tags. Distribute naturally: primary in title, slug, first 100 words, one H2, meta, last paragraph. Zero stuffing.
7. **On-Page SEO Setup** — direct answer in opening 2 lines (AI Overview snippet bait), question-style H2/H3, lists/tables for skimmability, FAQ at end (3-4 Q&A), bolded key entities.
8. **Technical SEO Implementation** — output clean semantic HTML, valid internal links from the safelist only, no orphan anchors, no broken hrefs.
9. **Content Creation** — write a high-quality, original, helpful, locally-rooted post (800-1200 words) that satisfies the query better than current SERP.
10. **Analytics & Tracking readiness** — write so CTAs and internal links are clear and trackable (use natural, descriptive anchor text — never "click here").

Hard quality rules:
- Read as 0% AI-detected: plain shopkeeper voice, tiny real details, uneven but natural sentence rhythm, contractions, concrete nouns, occasional first-person ("we", "our team"), real Bangladesh context (Boishakh, Pohela Falgun, Eid, Victory Day, local areas like Gulshan/Dhanmondi/Banani).
- Flesch readability 100+: 5-8 word sentences, simple words, active voice, conversational. No sentence over 12 words.
- **Semantic SEO** — primary keyword + related entities + synonyms naturally woven. NO keyword stuffing. Google must see topical authority, zero risk.
- **2-4 manual safe internal links** using ONLY these relative URLs (NEVER external/unknown URLs): /shop, /shop?category=flowers, /shop?category=cakes, /shop?category=gifts, /bouquet-builder, /events, /blog, /contact, /track-order, /about-us. Each anchor must be genuinely contextual and varied.
- Semantic HTML only: <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>. NO <h1>, NO <script>, NO <style>, NO inline styles, NO emoji-spam.
- DO NOT use [caption]...[/caption] blocks anywhere. Never insert caption shortcodes.
- BANNED phrases: "elevate", "delve", "unleash", "leverage", "embark", "in today's fast-paced world", "in conclusion", "furthermore", "moreover", "as an AI", "navigate the world of", "tapestry", "realm", "landscape of".

Reply with VALID JSON ONLY — no prose, no markdown fences, no exposed workflow steps.`;

    const user = `Write a complete blog post for Pikooly Bangladesh.

- Topic: ${topic}
${category ? `- Category: ${category}` : ""}
${kwList.length ? `- MANDATORY focus keywords (MUST USE every single one naturally inside the content body, distributed across paragraphs — not stuffed, not skipped): ${kwList.join(", ")}\n- Primary keyword (first one): "${kwList[0]}" — MUST appear in: title, slug, meta description, first 100 words, and at least one <h2>.` : ""}
${tone ? `- Tone: ${tone}` : "- Tone: warm, knowledgeable, locally-rooted Bangladeshi"}
- TARGET WORD COUNT: ${targetWords} words (acceptable range: ${minWords}-${maxWords} words). Count words in the content body only. Do NOT go below ${minWords} or above ${maxWords}.

Return JSON with this EXACT shape (every field required, never empty):
{
  "title": "<compelling 50-65 char blog title, primary keyword near front, includes Bangladesh context if natural>",
  "slug": "<short URL slug, lowercase, hyphenated, max 60 chars, primary keyword>",
  "excerpt": "<plain text hook, 140-160 chars, directly answers the topic & sparks curiosity>",
  "content": "<RICH SEMANTIC HTML, ${minWords}-${maxWords} words (target ${targetWords}). Use very short 5-8 word sentences only. Structure: opening <p> (direct answer in first 2 lines), question-style <h2> subheadings (scale count to word target), each with 2-4 short <p> + at least one <ul>/<ol>/<table>, 2-4 manual internal <a href='/shop'> style links, closing <h2>FAQ</h2> with 3-5 Q&A in <h3>+<p>. DO NOT include [caption]...[/caption] anywhere.>",
  "seo_title": "<55-60 chars, primary keyword first, brand 'Pikooly' or 'Bangladesh' at end>",
  "seo_description": "<150-158 chars meta description, primary keyword + benefit + soft CTA>",
  "tags": ["8-12 lowercase semantic tags including bangla terms where natural${kwList.length ? `, MUST include all focus keywords: ${kwList.join(", ")}` : ""}"]
}

Hard rules:
- Internal links MUST be from this exact safe whitelist only: /shop, /shop?category=flowers, /shop?category=cakes, /shop?category=gifts, /bouquet-builder, /events, /blog, /contact, /track-order, /about-us.
- Use contractions, vary sentence length (mix 5-word + 20-word sentences), mention 2+ real Bangladesh occasions or cities.
- Keep every sentence under 12 words. Prefer 5-8 words.
- Use simple words only. Avoid complex words when a plain word works.
- If the draft sounds like AI or scores below Flesch 100, rewrite before returning.
- Do NOT invent product names or prices.
- Do NOT use <h1>.
- Before returning, silently COUNT the words in content. If under ${minWords}, EXPAND with more sections/FAQ/examples. If over ${maxWords}, TRIM. Re-check.
${kwList.length ? `- Before returning, verify EVERY focus keyword appears at least once in the content body. If any is missing, rewrite to include it naturally.` : ""}`;

    let content = "{}";
    let fallbackNote = "";
    try {
      content = await callAI({ system, user, json: true, temperature: 0.85, maxTokens: Math.max(4000, targetWords * 6) });
    } catch (e) {
      const msg = (e as Error).message || "AI error";
      // Auto-fallback to Lovable AI if the admin-selected provider failed (quota, key, etc.)
      try {
        content = await callAI({ system, user, json: true, temperature: 0.85, maxTokens: Math.max(4000, targetWords * 6), provider: "lovable", model: "google/gemini-2.5-flash" });
        fallbackNote = `Primary AI provider failed (${msg}). Used Lovable AI fallback.`;
      } catch (e2) {
        const msg2 = (e2 as Error).message || "AI error";
        const combined = `Primary: ${msg} | Fallback (Lovable AI): ${msg2}`;
        const status = msg2.includes("Rate limit") ? 429 : msg2.includes("credits") ? 402 : msg2.includes("not configured") ? 400 : 500;
        return new Response(JSON.stringify({ error: combined }), {
          status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
    }

    // Strip any non-whitelisted hrefs as a safety net
    const safeHosts = ["/shop", "/bouquet-builder", "/events", "/blog", "/contact", "/track-order", "/about-us"];
    let html: string = parsed.content || "";
    html = html.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, href, txt) => {
      const ok = safeHosts.some((h) => href.startsWith(h));
      return ok ? m : txt; // strip link, keep text
    });
    // Remove script/style/h1 just in case
    html = html.replace(/<\/?h1[^>]*>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
    // Strip [caption]...[/caption] shortcodes — they are not part of the blog content
    html = html.replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi, "$1");

    return new Response(JSON.stringify({
      title: parsed.title || topic,
      slug: parsed.slug && typeof parsed.slug === "string" ? slugify(parsed.slug) : slugify(parsed.title || topic),
      excerpt: parsed.excerpt || "",
      content: html,
      seo_title: parsed.seo_title || "",
      seo_description: parsed.seo_description || "",
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      ...(fallbackNote ? { warning: fallbackNote } : {}),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
