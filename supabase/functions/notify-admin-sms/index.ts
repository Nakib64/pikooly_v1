import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/sms-utils.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { event } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: rows } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["admin_sms_recipients", "admin_sms_new_order_enabled", "admin_sms_low_stock_enabled"]);

    const map: Record<string, string> = {};
    (rows ?? []).forEach((r: any) => { map[r.key] = r.value; });

    const recipients: string[] = (map["admin_sms_recipients"] || "")
      .split(",").map((s) => s.trim()).filter(Boolean);
    if (recipients.length === 0) return new Response(JSON.stringify({ ok: true, skipped: "no_recipients" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const newOrderOn = map["admin_sms_new_order_enabled"] === "true";
    const lowStockOn = map["admin_sms_low_stock_enabled"] === "true";

    let message = "";
    if (event === "new_order") {
      if (!newOrderOn) return new Response(JSON.stringify({ ok: true, skipped: "disabled" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      message = `Pikooly: New Order ${body.order_number}\nCustomer: ${body.customer_name ?? "—"}\nPhone: ${body.customer_phone ?? "—"}\nTotal: ৳${body.total ?? 0}`;
    } else if (event === "low_stock") {
      if (!lowStockOn) return new Response(JSON.stringify({ ok: true, skipped: "disabled" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      message = `Pikooly: LOW STOCK\n${body.product_name}\nStock: ${body.stock} (threshold ${body.threshold})`;
    } else if (event === "test") {
      message = "Pikooly: Test SMS alert. Your admin notifications are working ✅";
    } else {
      return new Response(JSON.stringify({ error: "Unknown event" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results = await Promise.allSettled(
      recipients.map((to) => supabase.functions.invoke("send-sms", { body: { to, message } }))
    );

    return new Response(JSON.stringify({
      ok: true, sent: results.filter((r) => r.status === "fulfilled").length, total: recipients.length,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
