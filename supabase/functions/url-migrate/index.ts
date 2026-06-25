// Import products & categories from ANY website by URL.
// Supports: Shopify (.json endpoint), WooCommerce Store API, generic JSON-LD Product schema, OG tags fallback.
// Also expands category/collection pages by extracting product links.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getR2ConfigFromSettings, uploadRemoteToR2, r2HasCreds, type R2Config } from "../_shared/r2-upload.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();
}

function abs(base: string, href: string): string {
  try { return new URL(href, base).toString(); } catch { return href; }
}

async function uploadToCloudinary(imageUrl: string, folder: string, cloudName: string, apiKey: string, apiSecret: string) {
  try {
    if (!imageUrl) return { ok: false as const, error: "empty url" };
    const timestamp = Math.round(Date.now() / 1000).toString();
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const hashBuffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(paramsToSign));
    const signature = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const fd = new FormData();
    fd.append("file", imageUrl);
    fd.append("api_key", apiKey);
    fd.append("timestamp", timestamp);
    fd.append("signature", signature);
    fd.append("folder", folder);
    const r = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
    const j = await r.json();
    if (r.ok && j.secure_url) return { ok: true as const, url: j.secure_url };
    return { ok: false as const, error: j?.error?.message || `HTTP ${r.status}` };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || String(e) };
  }
}

async function getCloudinaryCreds(supabase: any) {
  const { data } = await supabase.from("site_settings").select("key,value")
    .in("key", ["cloudinary_cloud_name", "cloudinary_api_key", "cloudinary_api_secret"]);
  const m: Record<string, string> = {};
  data?.forEach((s: any) => { if (s.value) m[s.key] = s.value; });
  return {
    cloudName: m["cloudinary_cloud_name"] || Deno.env.get("CLOUDINARY_CLOUD_NAME") || "",
    apiKey: m["cloudinary_api_key"] || Deno.env.get("CLOUDINARY_API_KEY") || "",
    apiSecret: m["cloudinary_api_secret"] || Deno.env.get("CLOUDINARY_API_SECRET") || "",
  };
}

// --------- Scrapers ---------

type ScrapedProduct = {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice: number | null;
  images: string[];
  sourceUrl: string;
};

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PikoolyBot/1.0; +https://pikooly.com)",
      "Accept": "text/html,application/json",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function extractJsonLd(html: string): any[] {
  const out: any[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) out.push(...parsed);
      else if (parsed["@graph"]) out.push(...parsed["@graph"]);
      else out.push(parsed);
    } catch { /* ignore */ }
  }
  return out;
}

function metaContent(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
  const m = html.match(re); return m ? m[1] : null;
}

function decodeHtml(s: string): string {
  return (s || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

async function scrapeShopify(url: string): Promise<ScrapedProduct | null> {
  // Shopify: append .json to product URL
  try {
    const u = new URL(url);
    if (!u.pathname.includes("/products/")) return null;
    const jsonUrl = url.split("?")[0].replace(/\/$/, "") + ".json";
    const r = await fetch(jsonUrl, { headers: { "Accept": "application/json" } });
    if (!r.ok) return null;
    const j = await r.json();
    const p = j.product;
    if (!p) return null;
    const variant = p.variants?.[0] || {};
    const price = parseFloat(variant.price || "0");
    const compare = variant.compare_at_price ? parseFloat(variant.compare_at_price) : null;
    return {
      name: p.title,
      slug: p.handle || slugify(p.title),
      description: p.body_html || "",
      shortDescription: (p.body_html || "").replace(/<[^>]+>/g, "").slice(0, 200),
      price,
      originalPrice: compare && compare > price ? compare : null,
      images: (p.images || []).map((i: any) => i.src),
      sourceUrl: url,
    };
  } catch { return null; }
}

async function scrapeWoo(url: string): Promise<ScrapedProduct | null> {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    const idx = segments.indexOf("product");
    if (idx === -1) return null;
    const slug = segments[idx + 1];
    if (!slug) return null;
    const apiUrl = `${u.origin}/wp-json/wc/store/v1/products?slug=${slug}`;
    const r = await fetch(apiUrl);
    if (!r.ok) return null;
    const arr = await r.json();
    const p = Array.isArray(arr) ? arr[0] : null;
    if (!p) return null;
    const minor = p.prices?.currency_minor_unit || 0;
    const price = p.prices ? parseFloat(p.prices.price) / Math.pow(10, minor) : 0;
    const reg = p.prices ? parseFloat(p.prices.regular_price) / Math.pow(10, minor) : null;
    return {
      name: p.name,
      slug: p.slug || slug,
      description: p.description || "",
      shortDescription: (p.short_description || "").replace(/<[^>]+>/g, "").slice(0, 200),
      price,
      originalPrice: reg && reg > price ? reg : null,
      images: (p.images || []).map((i: any) => i.src || i.thumbnail).filter(Boolean),
      sourceUrl: url,
    };
  } catch { return null; }
}

// Filter out obvious logos / icons / sprites / placeholders / tracking pixels / watermarked previews
function isJunkImage(u: string): boolean {
  if (!u) return true;
  const low = u.toLowerCase();
  if (/(^|[/_\-.])(logo|brandmark|wordmark|favicon|sprite|icon|placeholder|blank|loader|loading|spinner|pixel|1x1|transparent|default[-_]?image|no[-_]?image|noimage|og[-_]?tag|og[-_]?image[-_]?default|watermark|watermarked|wm[-_]?img|stamp|preview[-_]?wm)([/_\-.]|$)/i.test(low)) return true;
  if (/[?&](watermark|wm)=/i.test(low)) return true;
  if (/\.svg($|\?)/.test(low)) return true; // most product imgs are jpg/webp/png
  if (/data:image\/.*base64/.test(low)) return true;
  return false;
}

function extractImgTags(html: string, base: string): string[] {
  const out: string[] = [];
  const re = /<img\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    // collect candidate URLs from src, data-src, data-original, data-lazy, srcset
    const attrs = [
      /\bsrc=["']([^"']+)["']/i,
      /\bdata-src=["']([^"']+)["']/i,
      /\bdata-original=["']([^"']+)["']/i,
      /\bdata-lazy(?:-src)?=["']([^"']+)["']/i,
      /\bdata-zoom-image=["']([^"']+)["']/i,
    ];
    for (const r of attrs) {
      const mm = tag.match(r);
      if (mm) out.push(mm[1]);
    }
    const ss = tag.match(/\bsrcset=["']([^"']+)["']/i);
    if (ss) {
      ss[1].split(",").forEach((part) => {
        const u = part.trim().split(/\s+/)[0];
        if (u) out.push(u);
      });
    }
  }
  // preload <link rel="preload" as="image" href="...">
  const pre = /<link[^>]+rel=["']preload["'][^>]+as=["']image["'][^>]+href=["']([^"']+)["']/gi;
  while ((m = pre.exec(html))) out.push(m[1]);
  return out.map((u) => abs(base, u)).filter((u) => /^https?:\/\//i.test(u));
}

async function scrapeGeneric(url: string, html?: string): Promise<ScrapedProduct | null> {
  try {
    const page = html || await fetchHtml(url);
    const ld = extractJsonLd(page);
    const product = ld.find((x) => {
      const t = x?.["@type"];
      return t === "Product" || (Array.isArray(t) && t.includes("Product"));
    });

    let name = "", description = "", price = 0, originalPrice: number | null = null;
    const images: string[] = [];

    if (product) {
      name = product.name || "";
      description = product.description || "";
      const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
      if (offers) {
        price = parseFloat(offers.price || offers.lowPrice || "0") || 0;
        const high = parseFloat(offers.highPrice || "0");
        if (high && high > price) originalPrice = high;
      }
      const img = product.image;
      if (Array.isArray(img)) images.push(...img.map((i: any) => typeof i === "string" ? i : i.url).filter(Boolean));
      else if (typeof img === "string") images.push(img);
      else if (img?.url) images.push(img.url);
    }

    // Fallback to OG tags for name/desc/price
    if (!name) name = decodeHtml(metaContent(page, "og:title") || metaContent(page, "twitter:title") || "");
    if (!description) description = decodeHtml(metaContent(page, "og:description") || metaContent(page, "description") || "");
    if (!price) {
      const p = metaContent(page, "product:price:amount") || metaContent(page, "og:price:amount");
      if (p) price = parseFloat(p) || 0;
    }

    // Always also scan HTML for real product images, then filter junk
    const htmlImgs = extractImgTags(page, url);
    const ogImg = metaContent(page, "og:image");
    const twImg = metaContent(page, "twitter:image");
    const candidates = [...images, ...htmlImgs, ogImg, twImg]
      .filter((u): u is string => !!u)
      .map((u) => abs(url, u));

    // Dedupe + filter junk; prefer non-logo product images
    const seen = new Set<string>();
    const clean: string[] = [];
    for (const u of candidates) {
      const key = u.split("?")[0];
      if (seen.has(key)) continue;
      seen.add(key);
      if (isJunkImage(u)) continue;
      clean.push(u);
    }

    // If nothing survived filtering, fall back to og/twitter as last resort
    let finalImages = clean;
    if (finalImages.length === 0) {
      const fallback = [ogImg, twImg].filter((u): u is string => !!u).map((u) => abs(url, u));
      finalImages = fallback;
    }

    if (!name) return null;

    return {
      name,
      slug: slugify(name),
      description,
      shortDescription: description.replace(/<[^>]+>/g, "").slice(0, 200),
      price,
      originalPrice,
      images: finalImages,
      sourceUrl: url,
    };
  } catch { return null; }
}

async function scrapeProduct(url: string): Promise<ScrapedProduct | null> {
  return (await scrapeShopify(url))
      || (await scrapeWoo(url))
      || (await scrapeGeneric(url));
}

async function extractProductLinks(url: string): Promise<string[]> {
  // Try Shopify collection .json
  try {
    const u = new URL(url);
    if (u.pathname.includes("/collections/")) {
      const jsonUrl = url.split("?")[0].replace(/\/$/, "") + "/products.json?limit=250";
      const r = await fetch(jsonUrl);
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j.products)) {
          return j.products.map((p: any) => `${u.origin}/products/${p.handle}`);
        }
      }
    }
  } catch { /* ignore */ }

  // Generic: extract anchors
  try {
    const html = await fetchHtml(url);
    const re = /<a[^>]+href=["']([^"']+)["']/gi;
    const links = new Set<string>();
    let m;
    while ((m = re.exec(html))) {
      const href = m[1];
      if (/\/(product|products|p)\//i.test(href)) {
        links.add(abs(url, href).split("?")[0].split("#")[0]);
      }
    }
    return Array.from(links).slice(0, 200);
  } catch { return []; }
}

// --------- Main ---------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const mode: string = body.mode || "import";

    // ---- PREVIEW MODE: scrape and return image candidates without saving ----
    if (mode === "preview") {
      const list: string[] = Array.isArray(body.urls) ? body.urls : String(body.urls || "").split(/\s+/).filter(Boolean);
      if (!list.length) return new Response(JSON.stringify({ error: "No URLs provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const expanded: string[] = [];
      for (const url of list) {
        const isCategory = /\/(collections|category|category-product|product-category|shop|c)\//i.test(url) && !/\/(product|products|p)\//i.test(url);
        if (isCategory) expanded.push(...(await extractProductLinks(url)));
        else expanded.push(url);
      }
      const uniq = Array.from(new Set(expanded));
      const items: any[] = [];
      for (const url of uniq.slice(0, 50)) {
        const sc = await scrapeProduct(url);
        if (sc) items.push({ ...sc, images: sc.images.slice(0, 20) });
      }
      return new Response(JSON.stringify({ items }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- SAVE MODE: save a single chosen product with chosen image + storage ----
    if (mode === "save") {
      const { product, imageUrl, target, categoryId } = body as { product: ScrapedProduct; imageUrl: string; target: "cloudinary" | "r2" | "source"; categoryId?: string | null };
      if (!product?.name) return new Response(JSON.stringify({ error: "Missing product" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      let stored = imageUrl;
      let usedTarget: "cloudinary" | "r2" | "source" = "source";
      let uploadError: string | null = null;
      if (imageUrl && target === "cloudinary") {
        const cloud = await getCloudinaryCreds(supabase);
        if (!cloud.cloudName) return new Response(JSON.stringify({ error: "Cloudinary not configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const r = await uploadToCloudinary(imageUrl, "products", cloud.cloudName, cloud.apiKey, cloud.apiSecret);
        if (r.ok) { stored = r.url; usedTarget = "cloudinary"; } else { uploadError = r.error; }
      } else if (imageUrl && target === "r2") {
        const r2 = await getR2ConfigFromSettings(supabase);
        if (!r2HasCreds(r2)) return new Response(JSON.stringify({ error: "Cloudflare R2 not configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const r: any = await uploadRemoteToR2(r2, imageUrl, "products");
        if (r.ok) { stored = r.url; usedTarget = "r2"; } else { uploadError = r.error; }
      }
      let slug = product.slug || slugify(product.name);
      const { data: existing } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
      if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: inserted, error } = await supabase.from("products").insert({
        name: product.name,
        slug,
        description: product.description || "",
        short_description: product.shortDescription || "",
        price: product.price || 0,
        original_price: product.originalPrice || null,
        image_url: stored || null,
        images: stored ? [stored] : [],
        category_id: categoryId || null,
        is_active: true,
        is_featured: false,
        stock: 100,
        rating: 0,
        review_count: 0,
      }).select("id, slug").maybeSingle();
      if (error) return new Response(JSON.stringify({ error: error.message, uploadError }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ ok: true, product: inserted, storedUrl: stored, target: usedTarget, uploadError }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { urls, uploadToCloud, uploadToR2, preferStorage, categoryId } = body;
    const list: string[] = Array.isArray(urls) ? urls : String(urls || "").split(/\s+/).filter(Boolean);
    if (!list.length) {
      return new Response(JSON.stringify({ error: "No URLs provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const shouldCloud = uploadToCloud === true;
    const shouldR2 = uploadToR2 === true;
    const preferred: "cloudinary" | "r2" = preferStorage === "r2" ? "r2" : "cloudinary";

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

        try {
          let cloud = { cloudName: "", apiKey: "", apiSecret: "" };
          if (shouldCloud) {
            cloud = await getCloudinaryCreds(supabase);
            if (!cloud.cloudName) { send({ type: "error", message: "Cloudinary not configured" }); controller.close(); return; }
          }
          let r2: R2Config = { accountId: "", accessKeyId: "", secretAccessKey: "", bucket: "" };
          if (shouldR2) {
            r2 = await getR2ConfigFromSettings(supabase);
            if (!r2HasCreds(r2)) { send({ type: "error", message: "Cloudflare R2 not configured" }); controller.close(); return; }
          }

          async function maybeUpload(srcUrl: string, folder: string): Promise<string> {
            if (!srcUrl) return srcUrl;
            if (!shouldCloud && !shouldR2) return srcUrl;
            const file = srcUrl.split("/").pop()?.split("?")[0] || "image";
            const tasks: Promise<void>[] = [];
            let cRes: any = null, rRes: any = null;
            if (shouldCloud) tasks.push((async () => { cRes = await uploadToCloudinary(srcUrl, folder, cloud.cloudName, cloud.apiKey, cloud.apiSecret); })());
            if (shouldR2) tasks.push((async () => { rRes = await uploadRemoteToR2(r2, srcUrl, folder); })());
            await Promise.all(tasks);
            const okC = cRes?.ok === true, okR = rRes?.ok === true;
            let final = srcUrl, target: "cloudinary" | "r2" | "source" = "source";
            if (okC && okR) { if (preferred === "r2") { final = rRes.url; target = "r2"; } else { final = cRes.url; target = "cloudinary"; } }
            else if (okC) { final = cRes.url; target = "cloudinary"; }
            else if (okR) { final = rRes.url; target = "r2"; }
            send({ type: "image", file, target, storedUrl: final,
              cloudinary: cRes ? { ok: cRes.ok, error: cRes.ok ? null : cRes.error, url: cRes.ok ? cRes.url : null } : null,
              r2: rRes ? { ok: rRes.ok, error: rRes.ok ? null : rRes.error, url: rRes.ok ? rRes.url : null } : null,
              fellBack: (okC || okR) && target !== "source" && final !== srcUrl ? false : false,
            });
            return final;
          }

          // Expand URLs: separate product URLs from category URLs
          const expanded: string[] = [];
          for (const url of list) {
            const isCategory = /\/(collections|category|category-product|product-category|shop|c)\//i.test(url) && !/\/(product|products|p)\//i.test(url);
            if (isCategory) {
              send({ type: "progress", step: `Scanning category: ${url}`, percent: 0 });
              const links = await extractProductLinks(url);
              send({ type: "progress", step: `Found ${links.length} products in category`, percent: 0 });
              expanded.push(...links);
            } else {
              expanded.push(url);
            }
          }

          const uniq = Array.from(new Set(expanded));
          let inserted = 0, skipped = 0, failed = 0;
          const errors: { url: string; reason: string }[] = [];

          for (let i = 0; i < uniq.length; i++) {
            const url = uniq[i];
            const pct = Math.round(((i + 1) / uniq.length) * 100);
            send({ type: "progress", step: `Importing ${i + 1}/${uniq.length}: ${url.slice(0, 80)}`, percent: pct });

            const scraped = await scrapeProduct(url);
            if (!scraped) { failed++; errors.push({ url, reason: "Could not extract product data" }); send({ type: "item", ok: false, url, reason: "scrape failed" }); continue; }

            // Ensure unique slug
            let slug = scraped.slug;
            const { data: existing } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
            if (existing) {
              slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
            }

            let mainImage: string | null = null;
            const uploadedImages: string[] = [];
            for (const img of scraped.images.slice(0, 8)) {
              const u = await maybeUpload(img, "products");
              if (u) {
                if (!mainImage) mainImage = u;
                uploadedImages.push(u);
              }
            }

            const { error } = await supabase.from("products").insert({
              name: scraped.name,
              slug,
              description: scraped.description,
              short_description: scraped.shortDescription,
              price: scraped.price,
              original_price: scraped.originalPrice,
              image_url: mainImage,
              images: uploadedImages,
              category_id: categoryId || null,
              is_active: true,
              is_featured: false,
              stock: 100,
              rating: 0,
              review_count: 0,
            });

            if (error) { failed++; errors.push({ url, reason: error.message }); send({ type: "item", ok: false, url, reason: error.message }); }
            else { inserted++; send({ type: "item", ok: true, url, name: scraped.name, slug }); }
          }

          send({ type: "done", results: { total: uniq.length, inserted, skipped, failed, errors } });
        } catch (e: any) {
          send({ type: "error", message: e?.message || String(e) });
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
