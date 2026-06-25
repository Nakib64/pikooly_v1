// Creates a verification token + sends email via send-custom-email
// Used for: signup confirm, password reset, seller verify, login OTP
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  email: string;
  purpose: "verify_signup" | "reset_password" | "seller_verify" | "login_otp";
  name?: string;
  redirect_base?: string; // e.g. https://yoursite.com
  metadata?: Record<string, unknown>;
}

function randomToken(len = 48) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const body: Payload = await req.json();
    if (!body.email || !body.purpose) throw new Error("Missing email or purpose");

    const isOtp = body.purpose === "login_otp";
    const token = randomToken();
    const otp = isOtp ? randomOtp() : null;
    const ttl = isOtp ? 10 * 60 * 1000 : body.purpose === "reset_password" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttl).toISOString();

    // Find user (may not exist yet for signup)
    const { data: userList } = await supabase.auth.admin.listUsers();
    const user = userList?.users?.find((u) => u.email?.toLowerCase() === body.email.toLowerCase());

    await supabase.from("email_verification_tokens").insert({
      user_id: user?.id ?? null,
      email: body.email,
      token,
      otp_code: otp,
      purpose: body.purpose,
      metadata: body.metadata ?? {},
      expires_at: expiresAt,
    });

    const base = body.redirect_base || new URL(req.url).origin.replace(/\.supabase\.co.*/, "");
    const pathMap: Record<string, string> = {
      verify_signup: "/auth/verify",
      seller_verify: "/auth/verify",
      reset_password: "/auth/reset",
      login_otp: "/auth/verify",
    };
    const actionUrl = `${body.redirect_base || ""}${pathMap[body.purpose]}?token=${token}`;

    // Send email through SMTP
    const sendRes = await supabase.functions.invoke("send-custom-email", {
      body: {
        to: body.email,
        template_key: body.purpose,
        variables: {
          name: body.name || body.email.split("@")[0],
          action_url: actionUrl,
          otp_code: otp || "",
        },
      },
    });

    if (sendRes.error) throw new Error(sendRes.error.message || "Email send failed");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("auth-send-verification error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
