import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getR2ConfigFromSettings, validateR2, type R2Config } from "../_shared/r2-upload.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let cfg: R2Config;
    if (body?.config && typeof body.config === "object") {
      const c = body.config;
      cfg = {
        accountId: (c.r2_account_id || "").trim(),
        accessKeyId: (c.r2_access_key_id || "").trim(),
        secretAccessKey: (c.r2_secret_access_key || "").trim(),
        bucket: (c.r2_bucket_name || "").trim(),
        publicUrl: (c.r2_public_url || "").trim(),
        endpoint: ((c.r2_endpoint || (c.r2_account_id ? `https://${c.r2_account_id}.r2.cloudflarestorage.com` : ""))).trim(),
      };
    } else {
      cfg = await getR2ConfigFromSettings(supabase);
    }

    const result = await validateR2(cfg);
    return new Response(JSON.stringify({
      ok: result.ok,
      message: result.message,
      endpoint: cfg.endpoint,
      bucket: cfg.bucket,
      hasPublicUrl: !!cfg.publicUrl,
    }), {
      status: result.ok ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
