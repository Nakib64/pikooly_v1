import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  parseServiceAccount,
  getAccessToken,
  sendFcmMessage,
  interpolate,
} from "../_shared/fcm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Target {
  type: "token" | "topic" | "user" | "seller" | "all";
  value?: string;
}

interface Payload {
  event_key?: string;
  title?: string;
  body?: string;
  url?: string;
  variables?: Record<string, any>;
  target: Target;
  data?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const logRow: Record<string, any> = {
    provider: "fcm",
    status: "pending",
    payload: {},
    response: {},
    tokens_total: 0,
    tokens_success: 0,
    tokens_failed: 0,
  };

  try {
    const input = (await req.json()) as Payload;
    logRow.event_key = input.event_key || null;
    logRow.target_type = input.target?.type || "unknown";
    logRow.target_value = input.target?.value || null;

    // Load settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "push_enabled",
        "firebase_project_id",
        "firebase_service_account_json",
      ]);
    const s: Record<string, string> = {};
    settings?.forEach((r: any) => (s[r.key] = r.value || ""));

    if (s.push_enabled !== "true") throw new Error("Push notifications disabled");
    if (!s.firebase_service_account_json) throw new Error("Firebase service account not configured");

    const sa = parseServiceAccount(s.firebase_service_account_json);

    // Resolve title/body via template or direct input
    let title = input.title || "";
    let body = input.body || "";
    let url = input.url || "/";
    if (input.event_key) {
      const { data: tpl } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("event_key", input.event_key)
        .maybeSingle();
      if (tpl) {
        if (!tpl.enabled) {
          logRow.status = "skipped";
          logRow.error = "Template disabled";
          await supabase.from("notification_logs").insert(logRow);
          return new Response(JSON.stringify({ skipped: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        title = interpolate(tpl.title_template, input.variables);
        body = interpolate(tpl.body_template, input.variables);
        url = interpolate(tpl.click_url_template || "/", input.variables);
      }
    }
    logRow.title = title;
    logRow.body = body;
    logRow.payload = { url, variables: input.variables || {}, data: input.data || {} };

    if (!title || !body) throw new Error("Missing title or body");

    // Resolve tokens
    let tokens: { id: string; token: string }[] = [];
    let topic: string | undefined;

    if (input.target.type === "topic") {
      topic = input.target.value;
      if (!topic) throw new Error("Topic required");
    } else if (input.target.type === "token") {
      if (!input.target.value) throw new Error("Token required");
      tokens = [{ id: "ad-hoc", token: input.target.value }];
    } else {
      let q = supabase.from("device_tokens").select("id, token").eq("is_active", true);
      if (input.target.type === "user") q = q.eq("user_id", input.target.value);
      else if (input.target.type === "seller") q = q.eq("seller_id", input.target.value);
      const { data: rows } = await q;
      tokens = rows || [];
    }

    const accessToken = await getAccessToken(sa);
    const baseMsg = {
      notification: { title, body },
      data: { url, ...(input.data || {}) },
      webpush: { fcm_options: { link: url } },
    };

    let success = 0;
    let failed = 0;
    const responses: any[] = [];
    const deadTokens: string[] = [];

    if (topic) {
      const r = await sendFcmMessage(sa, accessToken, { ...baseMsg, topic } as any);
      responses.push({ topic, status: r.status, body: r.body });
      if (r.ok) success = 1;
      else failed = 1;
      logRow.tokens_total = 1;
    } else {
      logRow.tokens_total = tokens.length;
      for (const t of tokens) {
        const r = await sendFcmMessage(sa, accessToken, { ...baseMsg, token: t.token } as any);
        responses.push({ token_id: t.id, status: r.status, ok: r.ok, body: r.body });
        if (r.ok) success++;
        else {
          failed++;
          if (r.unregistered && t.id !== "ad-hoc") deadTokens.push(t.id);
        }
      }
      if (deadTokens.length) {
        await supabase
          .from("device_tokens")
          .update({ is_active: false })
          .in("id", deadTokens);
      }
    }

    logRow.tokens_success = success;
    logRow.tokens_failed = failed;
    logRow.status = failed === 0 ? "success" : success === 0 ? "failed" : "partial";
    logRow.response = { results: responses.slice(0, 50) };

    const { data: logged } = await supabase
      .from("notification_logs")
      .insert(logRow)
      .select("id")
      .maybeSingle();

    return new Response(
      JSON.stringify({
        success: logRow.status !== "failed",
        status: logRow.status,
        sent: success,
        failed,
        total: logRow.tokens_total,
        log_id: logged?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-push error:", err);
    logRow.status = "failed";
    logRow.error = err?.message || String(err);
    try {
      await supabase.from("notification_logs").insert(logRow);
    } catch (_) {}
    return new Response(
      JSON.stringify({ error: logRow.error }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
