import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, generateOtp, hashOtp } from "../_shared/sms-utils.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get order
    const { data: order, error: oErr } = await supabase
      .from("orders").select("id, order_number, customer_phone, customer_name").eq("id", order_id).maybeSingle();
    if (oErr || !order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!order.customer_phone) return new Response(JSON.stringify({ error: "Order has no customer phone" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Rate limit: max 3 OTPs / hour for same order
    const { count } = await supabase
      .from("delivery_otps").select("id", { count: "exact", head: true })
      .eq("order_id", order_id).gte("created_at", new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Too many OTPs sent. Please wait." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const otp = generateOtp(6);
    const otpHash = await hashOtp(otp, serviceKey);

    await supabase.from("delivery_otps").insert({
      order_id, otp_hash: otpHash, phone: order.customer_phone,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      created_by: userData.user.id,
    });

    // Send SMS
    const message = `Pikooly Delivery OTP: ${otp}\nOrder ${order.order_number}\nValid 5 min. Share with delivery agent only.`;
    const { error: smsErr } = await supabase.functions.invoke("send-sms", { body: { to: order.customer_phone, message } });
    if (smsErr) {
      return new Response(JSON.stringify({ error: "Failed to send SMS", details: smsErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, phone_last4: String(order.customer_phone).slice(-4) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
