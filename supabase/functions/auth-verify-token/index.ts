// Validates a verification token / OTP and performs the action:
//  - verify_signup / seller_verify  => confirm user email
//  - reset_password                  => return a one-time session for setting new password
//  - login_otp                       => return a magic link for sign-in
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  token?: string;
  email?: string;
  otp?: string;
  new_password?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const body: Payload = await req.json();

    let query = supabase.from("email_verification_tokens").select("*").is("used_at", null).gt("expires_at", new Date().toISOString());
    if (body.token) query = query.eq("token", body.token);
    else if (body.email && body.otp) query = query.eq("email", body.email).eq("otp_code", body.otp);
    else throw new Error("Provide token or email+otp");

    const { data: rec } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!rec) throw new Error("Invalid or expired token");

    // Find / ensure user
    const { data: userList } = await supabase.auth.admin.listUsers();
    let user = userList?.users?.find((u) => u.email?.toLowerCase() === rec.email.toLowerCase());

    let response: Record<string, unknown> = { success: true, purpose: rec.purpose, email: rec.email };

    if (rec.purpose === "verify_signup" || rec.purpose === "seller_verify") {
      if (user) {
        await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });
      }
      const { data: link } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: rec.email,
      });
      response.token_hash = link?.properties?.hashed_token;
      response.otp_type = "magiclink";
    } else if (rec.purpose === "reset_password") {
      if (!body.new_password) {
        response.requires_password = true;
      } else {
        if (!user) throw new Error("User not found");
        await supabase.auth.admin.updateUserById(user.id, { password: body.new_password });
        const { data: link } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: rec.email,
        });
        response.token_hash = link?.properties?.hashed_token;
        response.otp_type = "magiclink";
      }
    } else if (rec.purpose === "login_otp") {
      const { data: link } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: rec.email,
      });
      response.token_hash = link?.properties?.hashed_token;
      response.otp_type = "magiclink";
    }

    // Mark used only if action fully complete
    if (!(rec.purpose === "reset_password" && response.requires_password)) {
      await supabase.from("email_verification_tokens").update({ used_at: new Date().toISOString() }).eq("id", rec.id);
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("auth-verify-token error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
