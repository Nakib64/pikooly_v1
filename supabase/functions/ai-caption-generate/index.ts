// AI Caption Generator — generates a short highlighted quote/caption from a topic
import { callAI } from "../_shared/ai-call.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, language, tone } = await req.json();
    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are a caption writer for Pikooly — a premium flower, cake & gift brand in Bangladesh.
You write ONE short, emotional, share-worthy caption / quote that fits inside a highlighted quote card on a blog post.

STRICT rules:
- Output ONLY the caption text. No quotes around it. No author name. No hashtags. No emojis unless the topic clearly calls for it.
- Length: 1 to 3 short lines, max ~220 characters total.
- Match the language the user wrote the topic in (Bangla → Bangla, English → English, Banglish → Banglish). Never translate.
- If the topic mentions a count like "120+ captions" or "400+ romantic captions", IGNORE the count — produce ONLY ONE single caption on that theme. Never produce a list.
- Sound human, warm, poetic but simple. Not corporate, not AI-template.
- No "click here", no CTAs, no shop links.`;

    const user = `Topic: ${topic.trim()}
${tone ? `Tone: ${tone}` : ""}
${language ? `Language: ${language}` : ""}

Write ONE caption now. Output only the caption text.`;

    const raw = await callAI({ system, user, temperature: 0.9, maxTokens: 400 });
    const caption = String(raw || "")
      .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, "")
      .replace(/^caption[:：]\s*/i, "")
      .trim();

    if (!caption) {
      return new Response(JSON.stringify({ error: "AI returned empty caption" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ caption }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || "Failed to generate caption" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
