import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { order_number } = await req.json();

    if (!order_number || typeof order_number !== "string") {
      return new Response(JSON.stringify({ error: "Order number is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("order_number, customer_name, status, payment_status, payment_method, subtotal, delivery_fee, discount, total, delivery_address, delivery_date, delivery_time, recipient_name, created_at")
      .eq("order_number", order_number.trim())
      .maybeSingle();

    if (orderError) throw orderError;

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order items with product images
    const { data: orderRow } = await supabaseAdmin.from("orders").select("id").eq("order_number", order_number.trim()).single();
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_name, quantity, price, total, product_id")
      .eq("order_id", orderRow!.id);

    // Attach product images
    const enrichedItems = await Promise.all((items || []).map(async (item: any) => {
      if (item.product_id) {
        const { data: prod } = await supabaseAdmin.from("products").select("image_url").eq("id", item.product_id).maybeSingle();
        return { ...item, image_url: prod?.image_url || null };
      }
      return { ...item, image_url: null };
    }));

    return new Response(JSON.stringify({ order, items: enrichedItems }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to track order" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
