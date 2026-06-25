import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getAccessToken(baseUrl: string, clientId: string, secret: string) {
  const auth = btoa(`${clientId}:${secret}`);
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error_description || "PayPal auth failed");
  return json.access_token as string;
}

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
    const { action, order_id, paypal_order_id } = body;

    const { data: settingsData, error: settingsError } = await supabaseAdmin
      .from("site_settings")
      .select("key, value")
      .in("key", ["paypal_client_id", "paypal_client_secret", "paypal_mode", "paypal_status", "store_name"]);

    if (settingsError) throw new Error("Failed to fetch PayPal settings");

    const settings: Record<string, string> = {};
    (settingsData || []).forEach((s: any) => {
      settings[s.key] = s.value || "";
    });

    if (settings.paypal_status !== "enable") {
      return new Response(
        JSON.stringify({ error: "PayPal Payment Gateway is not enabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = settings.paypal_client_id;
    const clientSecret = settings.paypal_client_secret;
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "PayPal Client ID / Secret missing in Admin Settings" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl =
      settings.paypal_mode === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

    const accessToken = await getAccessToken(baseUrl, clientId, clientSecret);

    // ============ INITIALIZE ============
    if (action === "initialize") {
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", order_id)
        .maybeSingle();
      if (orderError || !order) throw new Error("Order not found");

      const origin =
        req.headers.get("origin") ||
        req.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
        "";

      // Get default currency (BDT base) and convert to USD for PayPal (PayPal does not support BDT)
      const { data: defaultCur } = await supabaseAdmin
        .from("currencies")
        .select("code, exchange_rate, is_default")
        .eq("is_default", true)
        .maybeSingle();

      const { data: usdCur } = await supabaseAdmin
        .from("currencies")
        .select("code, exchange_rate")
        .eq("code", "USD")
        .maybeSingle();

      // Order total stored in default currency (BDT). Convert -> USD.
      const usdRate = Number(usdCur?.exchange_rate) || 0.0085;
      const chargeAmount = Number(order.is_preorder ? (order.advance_amount || order.total) : order.total);
      const totalStr = (chargeAmount * usdRate).toFixed(2);
      const brandName = settings.store_name || "Pikooly";

      const createRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: order.order_number,
              amount: { currency_code: "USD", value: totalStr },
              custom_id: order.id,
            },
          ],
          application_context: {
            brand_name: brandName,
            user_action: "PAY_NOW",
            return_url: `${origin}/order-success/${order.order_number}?paypal=1&order_id=${order.id}`,
            cancel_url: `${origin}/checkout?cancelled=1`,
          },
        }),
      });

      const createJson = await createRes.json();
      if (!createRes.ok) {
        console.error("PayPal create error:", createJson);
        return new Response(
          JSON.stringify({ error: createJson?.message || "PayPal order creation failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const approveLink = (createJson.links || []).find((l: any) => l.rel === "approve");
      if (!approveLink) {
        return new Response(
          JSON.stringify({ error: "PayPal approval link missing" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ redirectUrl: approveLink.href, paypalOrderId: createJson.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ CAPTURE / VERIFY ============
    if (action === "capture") {
      if (!paypal_order_id) throw new Error("paypal_order_id required");

      const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${paypal_order_id}/capture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const captureJson = await captureRes.json();
      const completed = captureJson.status === "COMPLETED";
      const customId = captureJson?.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id ||
        captureJson?.purchase_units?.[0]?.reference_id;

      if (completed && order_id) {
        await supabaseAdmin
          .from("orders")
          .update({ payment_status: "paid", status: "confirmed" })
          .eq("id", order_id);

        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-sheets-sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ order_id }),
          });
        } catch (e) {
          console.error("Google Sheets sync failed:", e);
        }
      }

      return new Response(
        JSON.stringify({ paid: completed, status: captureJson.status, customId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("PayPal function error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
