import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PSI_ENDPOINT =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

async function runPSI(url: string, strategy: "mobile" | "desktop") {
  const params = new URLSearchParams({
    url,
    strategy,
    category: "performance",
  });
  const apiKey = Deno.env.get("PAGESPEED_API_KEY");
  if (apiKey) params.set("key", apiKey);

  const res = await fetch(`${PSI_ENDPOINT}?${params.toString()}`);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PSI ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const lr = data.lighthouseResult ?? {};
  const audits = lr.audits ?? {};
  const num = (v: any) =>
    v === undefined || v === null || Number.isNaN(Number(v))
      ? null
      : Number(v);

  return {
    performance_score: num(lr?.categories?.performance?.score) !== null
      ? Math.round((lr.categories.performance.score as number) * 100)
      : null,
    lcp_ms: num(audits["largest-contentful-paint"]?.numericValue),
    fcp_ms: num(audits["first-contentful-paint"]?.numericValue),
    cls: num(audits["cumulative-layout-shift"]?.numericValue),
    ttfb_ms: num(audits["server-response-time"]?.numericValue),
    inp_ms: num(audits["interaction-to-next-paint"]?.numericValue) ??
      num(audits["experimental-interaction-to-next-paint"]?.numericValue),
    tbt_ms: num(audits["total-blocking-time"]?.numericValue),
    si_ms: num(audits["speed-index"]?.numericValue),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Admin check
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: hasAdmin } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!hasAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { page_id, base_url, strategies } = body as {
      page_id?: string;
      base_url: string;
      strategies?: ("mobile" | "desktop")[];
    };
    if (!base_url) throw new Error("base_url required");

    let path = "/";
    if (page_id) {
      const { data: page } = await admin
        .from("perf_pages")
        .select("path")
        .eq("id", page_id)
        .maybeSingle();
      if (page?.path) path = page.path;
    }
    const fullUrl = base_url.replace(/\/$/, "") + path;
    const targets = strategies ?? ["mobile", "desktop"];

    const results: any[] = [];
    for (const strat of targets) {
      try {
        const m = await runPSI(fullUrl, strat);
        const { data: inserted } = await admin
          .from("perf_psi_runs")
          .insert({
            page_id: page_id ?? null,
            url: fullUrl,
            strategy: strat,
            ...m,
          })
          .select()
          .single();
        results.push(inserted);
      } catch (e: any) {
        const { data: inserted } = await admin
          .from("perf_psi_runs")
          .insert({
            page_id: page_id ?? null,
            url: fullUrl,
            strategy: strat,
            error: String(e?.message ?? e),
          })
          .select()
          .single();
        results.push(inserted);
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
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
