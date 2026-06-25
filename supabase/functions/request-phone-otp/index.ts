import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, generateOtp, hashOtp, normalizeBdPhone } from "../_shared/sms-utils.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { phone, purpose } = await req.json();
    if (!phone || !["login", "reset"].includes(purpose)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const normalized = normalizeBdPhone(phone);
    if (!/^880\d{10}$/.test(normalized)) {
      return new Response(JSON.stringify({ error: "Invalid Bangladesh phone number" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Rate limit: 3 per hour per phone
    const { count } = await supabase
      .from("phone_otps").select("id", { count: "exact", head: true })
      .eq("phone", normalized).eq("purpose", purpose)
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait an hour." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // For reset, user must exist
    if (purpose === "reset") {
      const email = `${normalized}@phone.pikooly.local`;
      const { data: users } = await supabase.auth.admin.listUsers();
      const exists = users?.users?.some((u) => u.email === email || u.phone === normalized);
      if (!exists) {
        return new Response(JSON.stringify({ error: "No account found for this phone" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const otp = generateOtp(6);
    const otpHash = await hashOtp(otp, serviceKey);

    await supabase.from("phone_otps").insert({
      phone: normalized, otp_hash: otpHash, purpose,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      ip: req.headers.get("x-forwarded-for") ?? null,
    });

    const action = purpose === "login" ? "login" : "password reset";
    const message = `Pikooly ${action} OTP: ${otp}\nValid 5 min. Do not share.`;
    const { error: smsErr } = await supabase.functions.invoke("send-sms", { body: { to: normalized, message } });
    if (smsErr) {
      return new Response(JSON.stringify({ error: "Failed to send SMS" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, phone: normalized }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
