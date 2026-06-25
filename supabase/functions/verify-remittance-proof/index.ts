// AI Remittance Proof Verifier
// Inspects an uploaded payment screenshot with a vision model and returns
// a structured verdict on whether the screenshot looks real or fake,
// and whether the visible amount/reference matches the order context.
//
// Provider: Lovable AI Gateway → google/gemini-2.5-flash (vision)

import { visionJson } from "../_shared/ai-image.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  imageUrl: string;
  mtcn: string;
  service: string;     // e.g. "Wise", "Western Union"
  method: string;      // e.g. "bKash (Personal)"
  amount: number;      // expected amount in BDT
  currency?: string;   // currency symbol shown to user (BDT / USD…)
  orderNumber?: string;
}

const SYSTEM = `You are a forensic fraud-detection analyst for an e-commerce store in Bangladesh that accepts payments via remittance services (Wise, Western Union, MoneyGram, Ria, TapTap Send, Remitly) and Bangladeshi mobile wallets (bKash, Nagad, Upay, Rocket) plus bank transfer.

You receive ONE image (a customer-submitted payment screenshot) and a small context blob describing what the merchant EXPECTS to see (service name, payment method, expected amount in BDT, claimed transaction/MTCN reference, order number).

Inspect the image meticulously and return ONLY a valid JSON object (no prose, no markdown) with this exact shape:

{
  "verdict": "likely_real" | "suspicious" | "likely_fake",
  "confidence": 0-100,
  "summary": "one short sentence in plain English",
  "detected": {
    "amount": "string or null (number with currency as visible in screenshot)",
    "reference": "string or null (transaction/MTCN/TrxID visible)",
    "sender": "string or null",
    "receiver": "string or null",
    "datetime": "string or null",
    "service": "string or null (which app/service the screenshot is from)"
  },
  "checks": {
    "amount_matches": true | false | null,
    "reference_matches": true | false | null,
    "service_matches": true | false | null,
    "looks_authentic_ui": true | false,
    "shows_tampering": true | false
  },
  "reasons": ["short bullet", "..."]
}

Rules:
- amount_matches = the visible amount equals the expected amount (allow ±1 unit rounding).
- reference_matches = the visible transaction/MTCN equals the claimed reference (case-insensitive, ignore spaces/dashes).
- service_matches = the screenshot is from the same service/wallet the customer claims to have used.
- looks_authentic_ui = the UI chrome (status bar, fonts, logo, layout) matches the genuine app of the claimed service.
- shows_tampering = any visible sign of editing: mismatched fonts, pixelation around amount/ref, photoshop halos, inconsistent shadows, duplicated digits, off-baseline text.
- Mark "likely_fake" if shows_tampering = true OR any *_matches is clearly false OR the screenshot is clearly from a different/unrelated app.
- Mark "suspicious" if you cannot confirm key fields or the image quality is too low.
- Mark "likely_real" only if at minimum the service matches, the UI looks authentic, no tampering is visible, AND either the amount or the reference can be matched.
- "reasons" must list the concrete evidence behind the verdict (2-5 bullets, English, plain language).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.imageUrl || !body?.mtcn) {
      return new Response(JSON.stringify({ error: "imageUrl and mtcn are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userText = `Context:
- Service the customer claims to have used: ${body.service}
- Receiver payment method (what merchant expects funds in): ${body.method}
- Expected amount (BDT): ৳${Number(body.amount).toLocaleString()}
- Customer-provided transaction / MTCN reference: ${body.mtcn}
- Order number: ${body.orderNumber || "N/A"}

Analyse the attached screenshot and return the JSON verdict.`;

    try {
      const parsed = await visionJson({ system: SYSTEM, userText, imageUrl: body.imageUrl });
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e: any) {
      const msg = e?.message || "AI verification failed";
      return new Response(JSON.stringify({ error: msg }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e: any) {
    console.error("verify-remittance-proof error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
