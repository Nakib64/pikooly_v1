// Migrate Supabase storage URLs in DB to Cloudinary (one-time admin tool)
// Processes ONE target per request so the UI can show per-target progress.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_HOST_MARKER = "supabase.co/storage/";

type Target = { table: string; column: string; isArr?: boolean; isSettings?: boolean };

const TARGETS: Target[] = [
  { table: "blogs", column: "image_url" },
  { table: "bouquet_colors", column: "image_url" },
  { table: "bouquet_flowers", column: "image_url" },
  { table: "bouquet_materials", column: "image_url" },
  { table: "categories", column: "image_url" },
  { table: "celebrations", column: "image_url" },
  { table: "delivery_modes", column: "icon" },
  { table: "event_categories", column: "icon" },
  { table: "event_categories", column: "image_url" },
  { table: "event_packages", column: "image_url" },
  { table: "event_packages", column: "images", isArr: true },
  { table: "gifting_stories", column: "thumbnail_url" },
  { table: "gifting_stories", column: "video_url" },
  { table: "home_living_gifts", column: "image_url" },
  { table: "loyalty_gift_items", column: "image_url" },
  { table: "loyalty_program_settings", column: "banner_image_url" },
  { table: "loyalty_winners", column: "confirmation_photo_url" },
  { table: "offer_banners", column: "bg_image_url" },
  { table: "offer_banners", column: "image_url" },
  { table: "offer_banners", column: "logo_url" },
  { table: "order_items", column: "custom_images", isArr: true },
  { table: "photo_portfolio", column: "media_url" },
  { table: "photo_portfolio", column: "thumbnail_url" },
  { table: "photo_services", column: "image_url" },
  { table: "popular_gifting", column: "image_url" },
  { table: "product_colors", column: "image_url" },
  { table: "products", column: "image_url" },
  { table: "products", column: "images", isArr: true },
  { table: "profiles", column: "avatar_url" },
  { table: "relationship_categories", column: "image_url" },
  { table: "sellers", column: "avatar_url" },
  { table: "sliders", column: "bg_image_url" },
  { table: "sliders", column: "image_url" },
  { table: "subcategories", column: "image_url" },
  { table: "site_settings", column: "value", isSettings: true },
];

async function uploadUrlToCloudinary(
  url: string, folder: string, cloudName: string, apiKey: string, apiSecret: string,
): Promise<{ url?: string; error?: string }> {
  try {
    const timestamp = Math.round(Date.now() / 1000).toString();
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(paramsToSign));
    const signature = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");

    const form = new FormData();
    form.append("file", url);
    form.append("api_key", apiKey);
    form.append("timestamp", timestamp);
    form.append("signature", signature);
    form.append("folder", folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) return { error: json.error?.message || `HTTP ${res.status}` };
    return { url: json.secure_url as string };
  } catch (e) {
    return { error: String((e as Error).message ?? e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Auth: must be admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));

    // Mode: list targets
    if (body.mode === "list") {
      return new Response(JSON.stringify({ ok: true, targets: TARGETS }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Mode: process a single target
    const dryRun: boolean = !!body.dryRun;
    const target = body.target as Target | undefined;
    if (!target) {
      return new Response(JSON.stringify({ error: "Missing target" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Read cloudinary creds
    const { data: settings } = await admin.from("site_settings").select("key, value")
      .in("key", ["cloudinary_cloud_name", "cloudinary_api_key", "cloudinary_api_secret"]);
    const s: Record<string, string> = {};
    settings?.forEach((x: any) => { if (x.value) s[x.key] = x.value; });
    const cloudName = s.cloudinary_cloud_name || Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const apiKey = s.cloudinary_api_key || Deno.env.get("CLOUDINARY_API_KEY");
    const apiSecret = s.cloudinary_api_secret || Deno.env.get("CLOUDINARY_API_SECRET");
    if (!cloudName || !apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: "Cloudinary credentials missing" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const result = { found: 0, migrated: 0, failed: 0, errors: [] as string[] };
    const { table, column, isArr, isSettings } = target;

    if (isSettings) {
      const { data: rows, error } = await admin.from("site_settings").select("key, value").ilike("value", `%${SUPABASE_HOST_MARKER}%`);
      if (error) {
        return new Response(JSON.stringify({ error: `select error: ${error.message}` }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
      }
      for (const r of rows ?? []) {
        const v = (r as any).value as string;
        if (!v?.includes(SUPABASE_HOST_MARKER)) continue;
        result.found++;
        if (dryRun) continue;
        const up = await uploadUrlToCloudinary(v, `migrated/settings`, cloudName, apiKey, apiSecret);
        if (up.url) {
          await admin.from("site_settings").update({ value: up.url }).eq("key", (r as any).key);
          result.migrated++;
        } else {
          result.failed++;
          result.errors.push(`${(r as any).key}: ${up.error}`);
        }
      }
    } else {
      const filter = isArr ? `${column}::text` : column;
      const { data: rows, error } = await admin.from(table).select(`id, ${column}`).ilike(filter, `%${SUPABASE_HOST_MARKER}%`);
      if (error) {
        return new Response(JSON.stringify({ error: `select error: ${error.message}` }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
      }
      const cache = new Map<string, string>();
      for (const row of (rows ?? []) as any[]) {
        const val = row[column];
        if (!val) continue;
        if (isArr) {
          const arr: string[] = Array.isArray(val) ? val : [];
          let changed = false;
          const next: string[] = [];
          for (const u of arr) {
            if (typeof u === "string" && u.includes(SUPABASE_HOST_MARKER)) {
              result.found++;
              if (dryRun) { next.push(u); continue; }
              let newUrl = cache.get(u);
              if (!newUrl) {
                const up = await uploadUrlToCloudinary(u, `migrated/${table}`, cloudName, apiKey, apiSecret);
                if (up.url) { newUrl = up.url; cache.set(u, newUrl); }
                else { result.failed++; result.errors.push(`row ${row.id}: ${up.error}`); next.push(u); continue; }
              }
              next.push(newUrl); changed = true; result.migrated++;
            } else {
              next.push(u);
            }
          }
          if (changed && !dryRun) {
            const { error: upErr } = await admin.from(table).update({ [column]: next }).eq("id", row.id);
            if (upErr) result.errors.push(`update row ${row.id}: ${upErr.message}`);
          }
        } else {
          if (typeof val !== "string" || !val.includes(SUPABASE_HOST_MARKER)) continue;
          result.found++;
          if (dryRun) continue;
          let newUrl = cache.get(val);
          if (!newUrl) {
            const up = await uploadUrlToCloudinary(val, `migrated/${table}`, cloudName, apiKey, apiSecret);
            if (up.url) { newUrl = up.url; cache.set(val, newUrl); }
            else { result.failed++; result.errors.push(`row ${row.id}: ${up.error}`); continue; }
          }
          const { error: upErr } = await admin.from(table).update({ [column]: newUrl }).eq("id", row.id);
          if (upErr) { result.failed++; result.errors.push(`update row ${row.id}: ${upErr.message}`); }
          else result.migrated++;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, dryRun, target, result }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
