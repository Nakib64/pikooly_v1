import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED = new Set(["LCP", "CLS", "INP", "TTFB", "FCP", "FID"]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const body = await req.json();
    const events = Array.isArray(body) ? body : [body];
    const ua = req.headers.get("user-agent") ?? "";
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
    const device = isMobile ? "mobile" : "desktop";

    const rows = events
      .filter((e) => e && typeof e.metric === "string" && ALLOWED.has(e.metric))
      .map((e) => ({
        path: String(e.path ?? "/").slice(0, 500),
        metric: e.metric,
        value: Number(e.value) || 0,
        rating: e.rating ?? null,
        navigation_type: e.navigation_type ?? null,
        device,
        user_agent: ua.slice(0, 500),
      }));

    if (!rows.length) {
      return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await supabase.from("perf_rum_events").insert(rows);
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, inserted: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: String(e?.message ?? e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
