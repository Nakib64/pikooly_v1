// AI Bouquet Preview — generates a preview image of the custom bouquet
// using the user-uploaded design photo + selected flowers as guidance.
import { generateImageWithRefs } from "../_shared/ai-image.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { flowers, designImages } = await req.json() as {
      flowers: { name: string; qty: number }[];
      designImages: string[]; // base64 data URLs
    };

    if (!designImages?.length) {
      return new Response(JSON.stringify({ error: "At least one design image required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const flowerList = flowers?.length
      ? flowers.map((f) => `${f.qty}x ${f.name}`).join(", ")
      : "an assorted seasonal mix";

    const prompt = `Create a beautiful, professional, photorealistic preview of a hand-tied custom flower bouquet.

The bouquet contains: ${flowerList}.

Use the wrapping style, color palette, ribbon, and overall design aesthetic from the reference image(s) provided by the customer. Keep the design and wrap exactly as shown in the reference, but compose it as a finished bouquet using the flowers listed above.

Style: studio photography, soft natural lighting, clean neutral background, premium florist quality, centered composition, slight top-down angle. No text, no watermarks, no logos.`;

    try {
      const imgUrl = await generateImageWithRefs(prompt, designImages);
      return new Response(JSON.stringify({ previewUrl: imgUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e: any) {
      const status = e?.status === 429 ? 429 : e?.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({ error: e?.message || "Image generation failed" }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("ai-bouquet-preview error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
