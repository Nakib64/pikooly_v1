// Forwards order data to a user-configured Google Apps Script webhook URL.
// The URL is stored in public.site_settings under key = 'google_sheets_webhook_url'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const orderId = body?.order_id as string | undefined;
    if (!orderId) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Read webhook URL + enabled flag from site_settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["google_sheets_webhook_url", "google_sheets_enabled"]);

    const settingMap: Record<string, string> = {};
    settings?.forEach((s: any) => (settingMap[s.key] = s.value || ""));

    const webhookUrl = settingMap.google_sheets_webhook_url?.trim();
    const enabled = settingMap.google_sheets_enabled !== "false";

    if (!enabled || !webhookUrl) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order + items
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (orderErr || !order) throw orderErr || new Error("order not found");

    const { data: items } = await supabase
      .from("order_items")
      .select("product_name, quantity, price, total, selected_size, selected_color")
      .eq("order_id", orderId);

    const itemsText = (items || [])
      .map(
        (i: any) =>
          `${i.product_name}${
            i.selected_size || i.selected_color
              ? ` (${[i.selected_size, i.selected_color].filter(Boolean).join("/")})`
              : ""
          } x${i.quantity} = ${i.total}`
      )
      .join(" | ");

    const payload = {
      order_number: order.order_number,
      date: order.created_at,
      customer_name: order.customer_name,
      phone: order.customer_phone,
      email: order.customer_email || "",
      address: order.delivery_address || "",
      recipient_name: order.recipient_name || "",
      alt_phone: order.alt_phone || "",
      gift_message: order.gift_message || "",
      delivery_date: order.delivery_date || "",
      delivery_time: order.delivery_time || "",
      delivery_type: order.delivery_type || "",
      items: itemsText,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      discount: order.discount,
      total: order.total,
      payment_method: order.payment_method,
      notes: order.notes || "",
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });
    const text = await res.text();

    return new Response(
      JSON.stringify({ ok: res.ok, status: res.status, response: text.slice(0, 500) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("google-sheets-sync error", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
