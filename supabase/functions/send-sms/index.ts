import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const skippedResponse = (provider: string, error: unknown, extra: Record<string, unknown> = {}) => {
  const message = typeof error === "string" ? error : (error as any)?.message || "SMS delivery skipped";
  return jsonResponse({ success: false, skipped: true, provider, error: message, ...extra }, 200);
};

const safeJson = async (res: Response) => {
  const text = await res.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { message: text }; }
};

const isEnabled = (v: string) => ["enable", "enabled", "true", "1", "yes", "on"].includes((v || "").toLowerCase());

// Normalize a phone number to E.164. Returns null if it can't be parsed.
// If no country code is given, assumes Bangladesh (+880).
function toE164(raw: string): string | null {
  if (!raw) return null;
  let p = String(raw).trim().replace(/[\s\-()]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("+")) return /^\+\d{8,15}$/.test(p) ? p : null;
  // No country code → Bangladesh default
  if (p.startsWith("880")) return "+" + p;
  if (p.startsWith("0")) return "+880" + p.slice(1);
  if (/^1\d{9}$/.test(p)) return "+880" + p; // 10-digit BD mobile starting with 1
  return null;
}

function isBdNumber(e164: string): boolean {
  return e164.startsWith("+880");
}

// ── Provider senders ──────────────────────────────────────────────────────────

async function sendSmsNetBd(config: Record<string, string>, e164: string, message: string) {
  // sms.net.bd requires number in 880XXXXXXXXXX format (no +)
  const bdNumber = e164.replace(/[^0-9]/g, "");
  const url = "https://api.sms.net.bd/sendsms";
  const params = new URLSearchParams({
    api_key: config.smsnetbd_api_key,
    msg: message,
    to: bdNumber,
  });
  // Optional Sender ID (only if approved by sms.net.bd)
  if (config.smsnetbd_sender_id) {
    params.append("sender_id", config.smsnetbd_sender_id);
  }
  const res = await fetch(`${url}?${params.toString()}`, { method: "GET" });
  const result = await safeJson(res);
  // sms.net.bd success: HTTP 200 with body { "error": 0, "msg": "...", "data": { "request_id": ... } }
  // Any non-zero "error" code (400/403/410-421 etc.) means failure.
  const ok = res.ok && (result.error === 0 || result.error === "0");
  return { ok, result, status: res.status };
}

async function sendBulkSmsBd(config: Record<string, string>, e164: string, message: string) {
  const bdNumber = e164.replace(/[^0-9]/g, ""); // 880XXXXXXXXXX
  const url = "http://bulksmsbd.net/api/smsapi";
  const params = new URLSearchParams({
    api_key: config.bulksmsbd_api_key,
    type: "text",
    number: bdNumber,
    senderid: config.bulksmsbd_sender_id,
    message,
  });
  const res = await fetch(`${url}?${params.toString()}`, { method: "GET" });
  const result = await safeJson(res);
  if (!res.ok || (result.response_code && result.response_code !== 202)) {
    return { ok: false, result, status: res.status };
  }
  return { ok: true, result };
}

async function sendMimSms(config: Record<string, string>, e164: string, message: string) {
  const bdNumber = e164.replace(/[^0-9]/g, "");
  const res = await fetch("https://api.mimsms.com/api/SmsSending/SMS", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      UserName: "",
      Apikey: config.mimsms_api_key,
      MobileNumber: bdNumber,
      CampaignId: "null",
      SenderName: config.mimsms_sender_id,
      TransactionType: (config.mimsms_type || "text").toLowerCase() === "unicode" ? "U" : "T",
      Message: message,
    }),
  });
  const result = await safeJson(res);
  const ok = res.ok && (result.statusCode === "200" || result.statusCode === 200 || /success/i.test(result.status || ""));
  return { ok, result, status: res.status };
}

async function sendTwilio(config: Record<string, string>, e164: string, message: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilio_account_sid}/Messages.json`;
  const auth = btoa(`${config.twilio_account_sid}:${config.twilio_auth_token}`);
  const body = new URLSearchParams({
    To: e164,
    From: config.twilio_from.startsWith("+") ? config.twilio_from : "+" + config.twilio_from.replace(/[^0-9]/g, ""),
    Body: message,
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const result = await safeJson(res);
  return { ok: res.ok, result, status: res.status };
}

async function sendClickatell(config: Record<string, string>, e164: string, message: string) {
  const res = await fetch("https://platform.clickatell.com/messages/http/send", {
    method: "POST",
    headers: { "Authorization": config.clickatell_apikey, "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ content: message, to: [e164.replace(/[^0-9]/g, "")] }),
  });
  const result = await safeJson(res);
  return { ok: res.ok, result, status: res.status };
}

async function sendNexmo(config: Record<string, string>, e164: string, message: string) {
  const res = await fetch("https://rest.nexmo.com/sms/json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: config.nexmo_key,
      api_secret: config.nexmo_secret,
      to: e164.replace(/[^0-9]/g, ""),
      from: "Pikooly",
      text: message,
    }),
  });
  const result = await safeJson(res);
  const ok = result.messages?.[0]?.status === "0";
  return { ok, result, status: res.status };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, message, audience } = await req.json();

    if (!to || !message) {
      return jsonResponse({ error: "Missing 'to' or 'message'" }, 400);
    }

    // ── Audience guard: only billing customer / admin / agent / seller allowed.
    // Gift recipient phones (alt_phone / recipient_phone) must NEVER receive SMS,
    // because most orders are surprise gifts.
    const aud = String(audience || "customer").toLowerCase();
    const ALLOWED = ["customer", "billing", "admin", "agent", "seller", "affiliate", "system"];
    if (!ALLOWED.includes(aud)) {
      console.warn("send-sms: blocked non-allowed audience:", aud);
      return skippedResponse("blocked", `Audience '${aud}' is not allowed. SMS only goes to billing customer / admin / agent.`);
    }
    if (aud === "recipient") {
      return skippedResponse("blocked", "Recipient SMS is disabled (surprise-gift policy).");
    }

    const e164 = toE164(to);
    if (!e164) {
      return skippedResponse("invalid", `Invalid phone number: ${to}`);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: settings, error: settingsError } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "smsnetbd_api_key", "smsnetbd_sender_id", "smsnetbd_status",
        "twilio_account_sid", "twilio_auth_token", "twilio_from", "twilio_status",
        "clickatell_apikey", "clickatell_status",
        "nexmo_key", "nexmo_secret", "nexmo_status",
        "bulksmsbd_api_key", "bulksmsbd_sender_id", "bulksmsbd_status",
        "mimsms_api_key", "mimsms_sender_id", "mimsms_type", "mimsms_status",
      ]);
    if (settingsError) throw settingsError;

    const config: Record<string, string> = {};
    settings?.forEach((s: any) => { config[s.key] = s.value || ""; });

    // ── Build provider chain based on destination country ─────────────────────
    type Provider = "smsnetbd" | "bulksmsbd" | "mimsms" | "twilio" | "clickatell" | "nexmo";
    const bd = isBdNumber(e164);

    const available: Record<Provider, boolean> = {
      smsnetbd:  isEnabled(config.smsnetbd_status)  && !!config.smsnetbd_api_key,
      bulksmsbd: isEnabled(config.bulksmsbd_status) && !!config.bulksmsbd_api_key && !!config.bulksmsbd_sender_id,
      mimsms:    isEnabled(config.mimsms_status)    && !!config.mimsms_api_key    && !!config.mimsms_sender_id,
      twilio:    isEnabled(config.twilio_status)    && !!config.twilio_account_sid && !!config.twilio_auth_token && !!config.twilio_from,
      clickatell: isEnabled(config.clickatell_status) && !!config.clickatell_apikey,
      nexmo:     isEnabled(config.nexmo_status)     && !!config.nexmo_key && !!config.nexmo_secret,
    };

    // BD numbers → cheap local first, then international fallback.
    // International numbers → SKIP BD-only providers, go straight to global gateways.
    const chain: Provider[] = bd
      ? ["smsnetbd", "bulksmsbd", "mimsms", "twilio", "clickatell", "nexmo"]
      : ["twilio", "clickatell", "nexmo"];

    const attempts: any[] = [];

    for (const provider of chain) {
      if (!available[provider]) continue;
      try {
        let r;
        if (provider === "smsnetbd") r = await sendSmsNetBd(config, e164, message);
        else if (provider === "bulksmsbd") r = await sendBulkSmsBd(config, e164, message);
        else if (provider === "mimsms") r = await sendMimSms(config, e164, message);
        else if (provider === "twilio") r = await sendTwilio(config, e164, message);
        else if (provider === "clickatell") r = await sendClickatell(config, e164, message);
        else r = await sendNexmo(config, e164, message);

        if (r.ok) {
          return jsonResponse({ success: true, provider, country: bd ? "BD" : "INT", to: e164, result: r.result });
        }
        console.error(`send-sms [${provider}] failed:`, r);
        attempts.push({ provider, status: (r as any).status, error: (r as any).result });
      } catch (err: any) {
        console.error(`send-sms [${provider}] threw:`, err);
        attempts.push({ provider, error: err?.message });
      }
    }

    if (chain.every((p) => !available[p])) {
      return skippedResponse(
        "none",
        bd
          ? "No SMS gateway is configured/enabled. Set up SMS.net.bd, BulkSMSBD, MimSMS, or Twilio in Admin > Settings > SMS Gateway."
          : `International SMS requires Twilio (or Clickatell/Nexmo). Enable one in Admin > Settings > SMS Gateway to reach ${e164}.`
      );
    }

    return skippedResponse("all_failed", "All configured SMS gateways failed for this number.", { attempts, to: e164 });
  } catch (error: any) {
    console.error("Send SMS error:", error);
    return skippedResponse("unknown", error?.message || "Failed to send SMS");
  }
});
