// Generate a blog cover image and upload to Cloudinary.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateImageB64 } from "../_shared/ai-image.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { topic, title, style } = await req.json();
    const subject = (title || topic || "").toString().trim();
    if (!subject) {
      return new Response(JSON.stringify({ error: "Topic or title required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Editorial blog cover image for a Bangladesh flower, cake & gift e-commerce brand "Pikooly". Topic: "${subject}". ${style || "Soft natural lighting, warm premium look, beautiful flowers/cakes/gifts as fits topic, clean uncluttered background, no text, no watermark, no logo, photorealistic, 16:9 composition"}.`;

    let b64: string;
    try {
      b64 = await generateImageB64(prompt);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e?.message || "Image generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to Cloudinary
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: settings } = await admin
      .from("site_settings")
      .select("key, value")
      .in("key", ["cloudinary_cloud_name", "cloudinary_api_key", "cloudinary_api_secret"]);
    const m: Record<string, string> = {};
    settings?.forEach((s: any) => { if (s.value) m[s.key] = s.value; });
    const cloudName = m.cloudinary_cloud_name || Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const apiKey = m.cloudinary_api_key || Deno.env.get("CLOUDINARY_API_KEY");
    const apiSecret = m.cloudinary_api_secret || Deno.env.get("CLOUDINARY_API_SECRET");

    if (!cloudName || !apiKey || !apiSecret) {
      // Fallback: return raw data URL so the user still gets the image
      return new Response(JSON.stringify({
        url: `data:image/png;base64,${b64}`,
        warning: "Cloudinary not configured — returned inline image. Configure Cloudinary in Admin → Settings for hosted URLs.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const folder = "blog";
    const timestamp = Math.round(Date.now() / 1000).toString();
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const hashBuffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(paramsToSign));
    const signature = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    const uploadForm = new FormData();
    uploadForm.append("file", `data:image/png;base64,${b64}`);
    uploadForm.append("api_key", apiKey);
    uploadForm.append("timestamp", timestamp);
    uploadForm.append("signature", signature);
    uploadForm.append("folder", folder);

    const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST", body: uploadForm,
    });
    const upJson = await upRes.json();
    if (!upRes.ok) {
      return new Response(JSON.stringify({
        url: `data:image/png;base64,${b64}`,
        warning: `Cloudinary upload failed (${upJson?.error?.message || "unknown"}). Returned inline image.`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ url: upJson.secure_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
