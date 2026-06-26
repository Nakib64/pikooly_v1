import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getR2ConfigFromSettings, uploadBytesToR2, r2HasCreds, type R2Config } from "../_shared/r2-upload.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Create admin client to read site_settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get configuration
    const cfg = await getR2ConfigFromSettings(adminClient);
    if (!r2HasCreds(cfg)) {
      return new Response(
        JSON.stringify({ error: "Cloudflare R2 credentials not configured. Go to Admin Settings → Cloudflare R2." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string || "uploads";

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read file bytes
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const contentType = file.type || "application/octet-stream";
    const filename = file.name || "upload";

    // Upload to R2
    const res = await uploadBytesToR2(cfg, bytes, folder, filename, contentType);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: res.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        url: res.url,
        name: filename,
        contentType,
        size: bytes.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
