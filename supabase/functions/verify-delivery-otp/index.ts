import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, hashOtp } from "../_shared/sms-utils.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { order_id, code } = await req.json();
    if (!order_id || !code) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const otpHash = await hashOtp(String(code), serviceKey);
    const { data: row, error } = await supabase
      .from("delivery_otps")
      .select("*")
      .eq("order_id", order_id)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !row) return new Response(JSON.stringify({ error: "No active OTP. Please request a new one." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (new Date(row.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "OTP expired. Please request a new one." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if ((row.attempts ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Too many failed attempts." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (row.otp_hash !== otpHash) {
      await supabase.from("delivery_otps").update({ attempts: (row.attempts ?? 0) + 1 }).eq("id", row.id);
      return new Response(JSON.stringify({ error: "Invalid code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Success: mark verified + mark order delivered
    await supabase.from("delivery_otps").update({ verified_at: new Date().toISOString() }).eq("id", row.id);
    await supabase.from("orders").update({ status: "delivered", updated_at: new Date().toISOString() }).eq("id", order_id);
    await supabase.from("order_status_history").insert({
      order_id, status: "delivered", note: "Delivery confirmed via OTP", created_by: userData.user.id,
    }).select();

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
