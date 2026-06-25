// Creates a user via admin API (no Supabase email) and sends custom verification email
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SellerDetails {
  district_id: string;
  category_ids: string[];
  subcategory_ids?: string[];
  trade_license?: string | null;
}

interface Payload {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  role?: "customer" | "seller";
  redirect_base: string;
  metadata?: Record<string, unknown>;
  seller_details?: SellerDetails;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const body: Payload = await req.json();
    if (!body.email || !body.password) throw new Error("Missing email or password");

    // Check existing
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === body.email.toLowerCase());
    let userId: string | undefined = existing?.id;
    if (existing) {
      // Already exists — if not confirmed, just send new link
      if (existing.email_confirmed_at) throw new Error("An account with this email already exists. Please sign in.");
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: false,
        user_metadata: {
          full_name: body.name,
          phone: body.phone,
          role: body.role || "customer",
          ...(body.metadata || {}),
        },
      });
      if (createErr) throw createErr;
      userId = created.user?.id;
    }

    // For seller signups: create the seller row immediately (service role bypasses RLS)
    // so admins see the new seller even if the user never returns to the dashboard.
    if (body.role === "seller" && body.seller_details && userId) {
      const sd = body.seller_details;
      const { data: existingSeller } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!existingSeller) {
        const { data: newSeller, error: sellerErr } = await supabase
          .from("sellers")
          .insert({
            user_id: userId,
            name: body.name || body.email,
            email: body.email,
            phone: body.phone || "Not provided",
            district_id: sd.district_id,
            is_active: false,
            status: "pending",
            trade_license_number: sd.trade_license?.trim() || null,
          })
          .select("id")
          .single();
        if (sellerErr) {
          console.error("Failed to create seller row:", sellerErr.message);
        } else if (newSeller) {
          if (sd.category_ids?.length) {
            await supabase.from("seller_categories").insert(
              sd.category_ids.map((cid) => ({ seller_id: newSeller.id, category_id: cid }))
            );
          }
          if (sd.subcategory_ids?.length) {
            await supabase.from("seller_subcategories").insert(
              sd.subcategory_ids.map((sid) => ({ seller_id: newSeller.id, subcategory_id: sid }))
            );
          }
        }
      }
    }


    // Send custom verification email
    const purpose = body.role === "seller" ? "seller_verify" : "verify_signup";
    const sendRes = await supabase.functions.invoke("auth-send-verification", {
      body: {
        email: body.email,
        purpose,
        name: body.name,
        redirect_base: body.redirect_base,
        metadata: body.metadata,
      },
    });
    if (sendRes.error) throw new Error(sendRes.error.message);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("auth-custom-signup error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
