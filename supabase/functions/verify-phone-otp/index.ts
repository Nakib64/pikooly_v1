import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, hashOtp, normalizeBdPhone } from "../_shared/sms-utils.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { phone, code, purpose, new_password } = await req.json();
    if (!phone || !code || !["login", "reset"].includes(purpose)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (purpose === "reset" && (!new_password || String(new_password).length < 6)) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalized = normalizeBdPhone(phone);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const otpHash = await hashOtp(String(code), serviceKey);
    const { data: row } = await supabase
      .from("phone_otps").select("*")
      .eq("phone", normalized).eq("purpose", purpose).is("verified_at", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (!row) return new Response(JSON.stringify({ error: "No active OTP" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (new Date(row.expires_at) < new Date()) return new Response(JSON.stringify({ error: "OTP expired" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if ((row.attempts ?? 0) >= 5) return new Response(JSON.stringify({ error: "Too many attempts" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (row.otp_hash !== otpHash) {
      await supabase.from("phone_otps").update({ attempts: (row.attempts ?? 0) + 1 }).eq("id", row.id);
      return new Response(JSON.stringify({ error: "Invalid code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("phone_otps").update({ verified_at: new Date().toISOString() }).eq("id", row.id);

    const email = `${normalized}@phone.pikooly.local`;
    const password = crypto.randomUUID() + "Aa1!";

    // Find or create user
    const { data: list } = await supabase.auth.admin.listUsers();
    let user = list?.users?.find((u) => u.email === email);

    if (purpose === "login") {
      if (!user) {
        const { data: created, error: cErr } = await supabase.auth.admin.createUser({
          email, password, email_confirm: true,
          phone: normalized,
          user_metadata: { phone: normalized, signup_method: "phone_otp" },
        });
        if (cErr || !created.user) return new Response(JSON.stringify({ error: cErr?.message ?? "Failed to create user" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        user = created.user;
      } else {
        // Reset to a known password to issue a session
        await supabase.auth.admin.updateUserById(user.id, { password });
      }

      // Sign in with password to get session
      const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({ email, password });
      if (sErr || !signIn.session) return new Response(JSON.stringify({ error: sErr?.message ?? "Sign-in failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      return new Response(JSON.stringify({
        success: true,
        session: {
          access_token: signIn.session.access_token,
          refresh_token: signIn.session.refresh_token,
        },
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // RESET
    if (!user) return new Response(JSON.stringify({ error: "Account not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { error: upErr } = await supabase.auth.admin.updateUserById(user.id, { password: String(new_password) });
    if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
