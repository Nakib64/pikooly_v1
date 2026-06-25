import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, order_id, session_id } = body;

    // Fetch Stripe settings
    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from("site_settings")
      .select("key, value")
      .in("key", ["stripe_secret_key", "stripe_public_key", "stripe_status"]);

    if (settingsError) throw new Error("Failed to fetch Stripe settings");

    const settings: Record<string, string> = {};
    (settingsData || []).forEach((s: any) => {
      settings[s.key] = s.value || "";
    });

    if (settings.stripe_status !== "enable") {
      return new Response(
        JSON.stringify({ error: "Stripe Payment Gateway is not enabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secretKey = settings.stripe_secret_key;
    if (!secretKey || !secretKey.startsWith("sk_")) {
      return new Response(
        JSON.stringify({ error: "Invalid Stripe secret key. Use sk_test_ or sk_live_ from Admin Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ INITIALIZE ============
    if (action === "initialize") {
      // Load order
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", order_id)
        .maybeSingle();
      if (orderError || !order) throw new Error("Order not found");

      const { data: itemsData } = await supabaseAdmin
        .from("order_items")
        .select("product_name, quantity, price")
        .eq("order_id", order_id);

      // Determine checkout currency. Order totals are stored in the default currency (BDT).
      // Stripe does NOT support BDT card payments, so if default is BDT we convert to USD.
      const { data: defaultCur } = await supabaseAdmin
        .from("currencies")
        .select("code, exchange_rate")
        .eq("is_default", true)
        .maybeSingle();

      const stripeSupported = ["usd","eur","gbp","aed","aud","cad","sgd","jpy","inr","myr","thb","hkd","nzd","chf","sek","nok","dkk"];
      const defaultCode = (defaultCur?.code || "BDT").toLowerCase();

      let checkoutCurrency = defaultCode;
      let conversionRate = 1; // multiply BDT amount to get checkoutCurrency amount

      if (!stripeSupported.includes(defaultCode)) {
        // Default currency unsupported by Stripe → fall back to USD using stored USD rate
        const { data: usdCur } = await supabaseAdmin
          .from("currencies")
          .select("exchange_rate")
          .eq("code", "USD")
          .maybeSingle();
        checkoutCurrency = "usd";
        conversionRate = Number(usdCur?.exchange_rate) || 0.0085;
      }

      const origin = req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0, 3).join("/") || "";

      // Build line_items
      const params = new URLSearchParams();
      params.append("mode", "payment");
      params.append("success_url", `${origin}/order-success/${order.order_number}?stripe_session={CHECKOUT_SESSION_ID}&order_id=${order.id}`);
      params.append("cancel_url", `${origin}/checkout?cancelled=1`);
      params.append("payment_method_types[]", "card");
      if (order.customer_email) params.append("customer_email", order.customer_email);
      params.append("metadata[order_id]", order.id);
      params.append("metadata[order_number]", order.order_number);

      // For pre-orders, charge only the advance amount as a single line item
      let idx = 0;
      if (order.is_preorder && Number(order.advance_amount) > 0) {
        const advanceConverted = Number(order.advance_amount) * conversionRate;
        params.append(`line_items[${idx}][price_data][currency]`, checkoutCurrency);
        params.append(`line_items[${idx}][price_data][product_data][name]`, `Pre-order Advance (Order ${order.order_number})`);
        params.append(`line_items[${idx}][price_data][unit_amount]`, String(Math.max(50, Math.round(advanceConverted * 100))));
        params.append(`line_items[${idx}][quantity]`, "1");
        idx++;
      } else {
        // Stripe minimum charge ~$0.50 USD equivalent → smallest unit 50
        (itemsData || []).forEach((it: any) => {
          const converted = Number(it.price) * conversionRate;
          params.append(`line_items[${idx}][price_data][currency]`, checkoutCurrency);
          params.append(`line_items[${idx}][price_data][product_data][name]`, it.product_name);
          params.append(`line_items[${idx}][price_data][unit_amount]`, String(Math.max(50, Math.round(converted * 100))));
          params.append(`line_items[${idx}][quantity]`, String(it.quantity));
          idx++;
        });

        if (Number(order.delivery_fee) > 0) {
          const convertedFee = Number(order.delivery_fee) * conversionRate;
          params.append(`line_items[${idx}][price_data][currency]`, checkoutCurrency);
          params.append(`line_items[${idx}][price_data][product_data][name]`, "Delivery Fee");
          params.append(`line_items[${idx}][price_data][unit_amount]`, String(Math.round(convertedFee * 100)));
          params.append(`line_items[${idx}][quantity]`, "1");
          idx++;
        }
      }

      const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const stripeJson = await stripeRes.json();
      if (!stripeRes.ok) {
        console.error("Stripe error:", stripeJson);
        return new Response(
          JSON.stringify({ error: stripeJson?.error?.message || "Stripe checkout creation failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ redirectUrl: stripeJson.url, sessionId: stripeJson.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ VERIFY ============
    if (action === "verify") {
      if (!session_id) throw new Error("session_id required");
      const verifyRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session_id}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const verifyJson = await verifyRes.json();
      const paid = verifyJson.payment_status === "paid";
      const orderId = verifyJson?.metadata?.order_id;

      if (paid && orderId) {
        await supabaseAdmin
          .from("orders")
          .update({ payment_status: "paid", status: "confirmed" })
          .eq("id", orderId);

        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-sheets-sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ order_id: orderId }),
          });
        } catch (e) {
          console.error("Google Sheets sync failed:", e);
        }
      }

      return new Response(
        JSON.stringify({ paid, status: verifyJson.payment_status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Stripe function error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
