import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://pikooly429.lovable.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all data in parallel
    const [productsRes, categoriesRes, subcategoriesRes, blogsRes, eventCatsRes] = await Promise.all([
      supabase.from("products").select("slug, updated_at, image_url").eq("is_active", true),
      supabase.from("categories").select("slug, updated_at").eq("is_active", true),
      supabase.from("subcategories").select("slug, category_id, updated_at").eq("is_active", true),
      supabase.from("blogs").select("slug, updated_at, image_url, category").eq("is_published", true),
      supabase.from("event_categories").select("slug, updated_at, image_url").eq("is_active", true),
    ]);

    const products = productsRes.data || [];
    const categories = categoriesRes.data || [];
    const subcategories = subcategoriesRes.data || [];
    const blogs = blogsRes.data || [];
    const eventCategories = eventCatsRes.data || [];

    // Build category id -> slug map for subcategory URLs
    const catMap = new Map<string, string>();
    const allCats = (await supabase.from("categories").select("id, slug").eq("is_active", true)).data || [];
    allCats.forEach((c: any) => catMap.set(c.id, c.slug));

    const escapeXml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

    const slugify = (s: string) =>
      s
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const urlEntry = (loc: string, lastmod?: string, priority?: string, changefreq?: string, image?: string) => {
      let entry = `  <url>\n    <loc>${escapeXml(loc)}</loc>\n`;
      if (lastmod) entry += `    <lastmod>${new Date(lastmod).toISOString().split("T")[0]}</lastmod>\n`;
      if (changefreq) entry += `    <changefreq>${changefreq}</changefreq>\n`;
      if (priority) entry += `    <priority>${priority}</priority>\n`;
      if (image) entry += `    <image:image>\n      <image:loc>${escapeXml(image)}</image:loc>\n    </image:image>\n`;
      entry += `  </url>`;
      return entry;
    };

    const urls: string[] = [];

    // Static pages
    urls.push(urlEntry(`${SITE_URL}/`, new Date().toISOString(), "1.0", "daily"));
    urls.push(urlEntry(`${SITE_URL}/shop`, new Date().toISOString(), "0.9", "daily"));
    urls.push(urlEntry(`${SITE_URL}/blog`, new Date().toISOString(), "0.8", "daily"));
    urls.push(urlEntry(`${SITE_URL}/all-gifts`, new Date().toISOString(), "0.7", "weekly"));
    urls.push(urlEntry(`${SITE_URL}/about-us`, new Date().toISOString(), "0.5", "monthly"));
    urls.push(urlEntry(`${SITE_URL}/contact-us`, new Date().toISOString(), "0.5", "monthly"));
    urls.push(urlEntry(`${SITE_URL}/reviews`, new Date().toISOString(), "0.6", "weekly"));
    urls.push(urlEntry(`${SITE_URL}/custom-bouquet`, new Date().toISOString(), "0.6", "monthly"));
    urls.push(urlEntry(`${SITE_URL}/events`, new Date().toISOString(), "0.8", "daily"));
    urls.push(urlEntry(`${SITE_URL}/track-order`, new Date().toISOString(), "0.4", "monthly"));

    // Categories
    for (const cat of categories) {
      urls.push(urlEntry(`${SITE_URL}/product-category/${cat.slug}`, cat.updated_at, "0.8", "weekly"));
    }

    // Subcategories
    for (const sub of subcategories) {
      const parentSlug = catMap.get(sub.category_id);
      if (parentSlug) {
        urls.push(urlEntry(`${SITE_URL}/product-category/${sub.slug}`, sub.updated_at, "0.7", "weekly"));
      }
    }

    // Products
    for (const product of products) {
      urls.push(urlEntry(
        `${SITE_URL}/product/${product.slug}`,
        product.updated_at,
        "0.9",
        "weekly",
        product.image_url || undefined
      ));
    }

    // Blog categories
    const blogCategorySet = new Set<string>();
    for (const post of blogs) {
      if (post.category) blogCategorySet.add(post.category);
    }
    for (const cat of blogCategorySet) {
      urls.push(urlEntry(
        `${SITE_URL}/blog/category/${slugify(cat)}`,
        new Date().toISOString(),
        "0.7",
        "weekly"
      ));
    }

    // Blog posts
    for (const post of blogs) {
      urls.push(urlEntry(
        `${SITE_URL}/blog/${post.slug}`,
        post.updated_at,
        "0.7",
        "monthly",
        post.image_url || undefined
      ));
    }

    // Event categories
    for (const ec of eventCategories) {
      urls.push(urlEntry(
        `${SITE_URL}/events/${ec.slug}`,
        ec.updated_at,
        "0.7",
        "weekly",
        ec.image_url || undefined
      ));
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join("\n")}
</urlset>`;

    return new Response(sitemap, { headers: corsHeaders });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { headers: corsHeaders }
    );
  }
});
