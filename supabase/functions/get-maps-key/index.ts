import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let key = "";
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey);
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "google_maps_api_key")
        .maybeSingle();
      if (data?.value) key = String(data.value).trim();
    }
  } catch (e) {
    console.error("site_settings lookup failed:", e);
  }

  if (!key) key = (Deno.env.get("GOOGLE_MAPS_API_KEY") || "").trim();

  return new Response(JSON.stringify({ key }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
