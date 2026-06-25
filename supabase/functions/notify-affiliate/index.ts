import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const buildContent = (
  event: string,
  payload: any,
  affName: string,
  code: string
): { subject: string; text: string } => {
  switch (event) {
    case "approved":
      return {
        subject: "Your affiliate application is approved 🎉",
        text: `Hi ${affName},\n\nGreat news! Your affiliate application has been approved. Your referral code is ${code}. Start sharing your link and earn commissions on every delivered order.\n\nThanks,\nPikooly`,
      };
    case "rejected":
      return {
        subject: "Affiliate application update",
        text: `Hi ${affName},\n\nUnfortunately, your affiliate application was not approved at this time.${payload.notes ? `\n\nReason: ${payload.notes}` : ""}\n\nThanks,\nPikooly`,
      };
    case "commission_credited":
      return {
        subject: `Bonus credited: ${payload.commission_amount} BDT`,
        text: `Hi ${affName},\n\nA commission of ${payload.commission_amount} BDT has been credited to your wallet for order ${payload.order_number}. Keep up the great work!\n\nThanks,\nPikooly`,
      };
    default:
      return { subject: "Affiliate notification", text: `Update for ${affName}` };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { event, affiliate_id } = body;
    if (!event || !affiliate_id) {
      return new Response(JSON.stringify({ error: "Missing event or affiliate_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: aff } = await supabase
      .from("affiliates")
      .select("full_name, email, phone, code")
      .eq("id", affiliate_id)
      .maybeSingle();
    if (!aff) {
      return new Response(JSON.stringify({ error: "Affiliate not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, text } = buildContent(event, body, aff.full_name || "there", aff.code);
    const results: any = { email: null, sms: null };

    if (aff.email) {
      try {
        const r = await supabase.functions.invoke("send-email", {
          body: { to: aff.email, subject, body: text, html: text.replace(/\n/g, "<br/>") },
        });
        results.email = r.error ? { error: r.error.message } : { ok: true };
      } catch (e: any) {
        results.email = { error: e.message };
      }
    }

    if (aff.phone) {
      try {
        const r = await supabase.functions.invoke("send-sms", {
          body: { to: aff.phone, message: text.split("\n\n")[1] || subject },
        });
        results.sms = r.error ? { error: r.error.message } : { ok: true };
      } catch (e: any) {
        results.sms = { error: e.message };
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("notify-affiliate error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
