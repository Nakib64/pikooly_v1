import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Load order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_phone, delivery_address, total, district_id")
      .eq("id", order_id)
      .maybeSingle();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: orderErr?.message || "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order.district_id) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_district" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Look up active seller for the district
    const { data: seller } = await supabase
      .from("sellers")
      .select("id, name, email, phone, district_id")
      .eq("district_id", order.district_id)
      .eq("is_active", true)
      .maybeSingle();

    // 3) Get district name (for message)
    const { data: district } = await supabase
      .from("shipping_districts")
      .select("name")
      .eq("id", order.district_id)
      .maybeSingle();
    const districtName = district?.name || "your area";

    if (!seller) {
      console.warn(`No seller assigned for district ${districtName} (order ${order.order_number})`);
      return new Response(JSON.stringify({ ok: true, skipped: "no_seller", district: districtName }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = `New order received in ${districtName}! Order ID: ${order.order_number}. Check your Pikooly Seller Dashboard.`;

    // 4) Insert dashboard notification
    const { error: notifErr } = await supabase.from("seller_notifications").insert({
      seller_id: seller.id,
      order_id: order.id,
      order_number: order.order_number,
      district_name: districtName,
      message,
      type: "new_order",
    });
    if (notifErr) console.error("Notification insert error:", notifErr);

    // 5) Send email (fire-and-forget)
    if (seller.email) {
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0071e3; color: #fff; padding: 20px; border-radius: 12px 12px 0 0;">
            <h2 style="margin:0;">New Order Assigned</h2>
          </div>
          <div style="background: #fff; padding: 24px; border: 1px solid #eee; border-top: 0; border-radius: 0 0 12px 12px;">
            <p>Hi ${seller.name},</p>
            <p>You have received a new order in <strong>${districtName}</strong>.</p>
            <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding:6px 0;color:#666;">Order ID:</td><td style="padding:6px 0;"><strong>${order.order_number}</strong></td></tr>
              <tr><td style="padding:6px 0;color:#666;">Customer:</td><td style="padding:6px 0;">${order.customer_name}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Phone:</td><td style="padding:6px 0;">${order.customer_phone}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Address:</td><td style="padding:6px 0;">${order.delivery_address}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Total:</td><td style="padding:6px 0;"><strong>৳${order.total}</strong></td></tr>
            </table>
            <p>Please check your Pikooly Seller Dashboard to take action.</p>
          </div>
        </div>`;
      supabase.functions.invoke("send-email", {
        body: {
          to: seller.email,
          subject: `New Order — ${districtName} | Pikooly`,
          html: emailHtml,
          body: message,
        },
      }).catch((e) => console.error("Seller email error:", e));
    }

    // 6) Send SMS (fire-and-forget)
    if (seller.phone) {
      supabase.functions.invoke("send-sms", {
        body: { to: seller.phone, message },
      }).catch((e) => console.error("Seller SMS error:", e));
    }

    return new Response(
      JSON.stringify({ ok: true, seller_id: seller.id, district: districtName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("notify-seller error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
