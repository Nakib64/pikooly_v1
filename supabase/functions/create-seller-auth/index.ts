// Admin-only: create or update an auth account for a seller, assign 'seller' role,
// and link the seller record by user_id. Requires the caller to have the 'admin' role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  seller_id: string;
  email: string;
  password: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    // Verify caller identity using their JWT
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Check that caller has admin role
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Admin role required" }, 403);

    const body = (await req.json()) as Payload;
    const { seller_id, email, password } = body || ({} as Payload);
    if (!seller_id || !email || !password || password.length < 6) {
      return json({ error: "seller_id, email and password (min 6 chars) required" }, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find existing user by email
    let targetUserId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => (u.email || "").toLowerCase() === normalizedEmail);

    if (existing) {
      targetUserId = existing.id;
      // Update password
      const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, { password });
      if (updErr) return json({ error: updErr.message }, 400);
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
      });
      if (createErr || !created.user) return json({ error: createErr?.message || "Failed to create user" }, 400);
      targetUserId = created.user.id;
    }

    // Assign 'seller' role (idempotent)
    await admin.from("user_roles").upsert(
      { user_id: targetUserId, role: "seller" },
      { onConflict: "user_id,role" }
    );

    // Link seller row
    const { error: linkErr } = await admin
      .from("sellers")
      .update({ user_id: targetUserId, email: normalizedEmail })
      .eq("id", seller_id);
    if (linkErr) return json({ error: linkErr.message }, 400);

    return json({ success: true, user_id: targetUserId });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
