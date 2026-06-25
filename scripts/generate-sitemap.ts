// Runs before `vite dev` and `vite build` (predev/prebuild hooks).
// Generates a FlowerAura-style sitemap INDEX with sub-sitemaps:
//   public/sitemap.xml              (sitemapindex pointing to children)
//   public/static-sitemap.xml       (canonical static pages)
//   public/product-sitemap.xml      (every active product)
//   public/category-sitemap.xml     (categories + subcategories)
//   public/blog-sitemap.xml         (every published blog)
//   public/event-sitemap.xml        (event categories)
// Alias URLs (/privacy, /terms, /return-policy) are excluded.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://pikooly429.lovable.app";
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://uizdqqyiqxkcjufkksrc.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpemRxcXlpcXhrY2p1Zmtrc3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0ODE1NjcsImV4cCI6MjA4NzA1NzU2N30.3k_qrziabE9FHHobTYZiDk4mw2CePvutxZzMrijgi4c";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Entry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
  image?: string;
}

const today = new Date().toISOString().split("T")[0];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

function buildUrlset(entries: Entry[], withImages = false) {
  const ns = withImages
    ? `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`
    : `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  const body = entries
    .map((e) => {
      const lines = [`  <url>`, `    <loc>${esc(e.loc)}</loc>`];
      if (e.lastmod) lines.push(`    <lastmod>${e.lastmod}</lastmod>`);
      if (e.changefreq) lines.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority) lines.push(`    <priority>${e.priority}</priority>`);
      if (e.image)
        lines.push(`    <image:image>`, `      <image:loc>${esc(e.image)}</image:loc>`, `    </image:image>`);
      lines.push(`  </url>`);
      return lines.join("\n");
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n${ns}\n${body}\n</urlset>\n`;
}

function buildSitemapIndex(files: { loc: string; lastmod: string }[]) {
  const body = files
    .map((f) => `  <sitemap>\n    <loc>${esc(f.loc)}</loc>\n    <lastmod>${f.lastmod}</lastmod>\n  </sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

function write(name: string, xml: string) {
  writeFileSync(resolve("public", name), xml);
  console.log(`  wrote public/${name}`);
}

async function main() {
  console.log("Generating sitemaps…");

  // --- Static pages (canonical only) ---
  const staticEntries: Entry[] = [
    { loc: `${BASE_URL}/`, changefreq: "daily", priority: "1.0", lastmod: today },
    { loc: `${BASE_URL}/shop`, changefreq: "daily", priority: "0.9", lastmod: today },
    { loc: `${BASE_URL}/all-gifts`, changefreq: "daily", priority: "0.9", lastmod: today },
    { loc: `${BASE_URL}/blog`, changefreq: "weekly", priority: "0.8", lastmod: today },
    { loc: `${BASE_URL}/events`, changefreq: "weekly", priority: "0.8", lastmod: today },
    { loc: `${BASE_URL}/custom-bouquet`, changefreq: "monthly", priority: "0.7", lastmod: today },
    { loc: `${BASE_URL}/photography`, changefreq: "monthly", priority: "0.7", lastmod: today },
    { loc: `${BASE_URL}/reviews`, changefreq: "weekly", priority: "0.7", lastmod: today },
    { loc: `${BASE_URL}/track-order`, changefreq: "monthly", priority: "0.6", lastmod: today },
    { loc: `${BASE_URL}/about-us`, changefreq: "monthly", priority: "0.6", lastmod: today },
    { loc: `${BASE_URL}/contact-us`, changefreq: "monthly", priority: "0.6", lastmod: today },
    { loc: `${BASE_URL}/affiliate`, changefreq: "monthly", priority: "0.6", lastmod: today },
    { loc: `${BASE_URL}/install`, changefreq: "yearly", priority: "0.4", lastmod: today },
    { loc: `${BASE_URL}/refund-policy`, changefreq: "yearly", priority: "0.3", lastmod: today },
    { loc: `${BASE_URL}/privacy-policy`, changefreq: "yearly", priority: "0.3", lastmod: today },
    { loc: `${BASE_URL}/terms-conditions`, changefreq: "yearly", priority: "0.3", lastmod: today },
  ];

  // --- Fetch dynamic data in parallel ---
  const [productsRes, catsRes, subsRes, blogsRes, eventsRes] = await Promise.all([
    supabase.from("products").select("slug, updated_at, image_url").eq("is_active", true),
    supabase.from("categories").select("slug, updated_at").eq("is_active", true),
    supabase.from("subcategories").select("slug, updated_at").eq("is_active", true),
    supabase.from("blogs").select("slug, updated_at, image_url, category").eq("is_published", true),
    supabase.from("event_categories").select("slug, updated_at, image_url").eq("is_active", true),
  ]);

  const products = productsRes.data || [];
  const cats = catsRes.data || [];
  const subs = subsRes.data || [];
  const blogs = blogsRes.data || [];
  const events = eventsRes.data || [];

  const productEntries: Entry[] = products.map((p: any) => ({
    loc: `${BASE_URL}/product/${p.slug}`,
    lastmod: p.updated_at ? new Date(p.updated_at).toISOString().split("T")[0] : today,
    changefreq: "weekly",
    priority: "0.9",
    image: p.image_url || undefined,
  }));

  const categoryEntries: Entry[] = [
    ...cats.map((c: any) => ({
      loc: `${BASE_URL}/product-category/${c.slug}`,
      lastmod: c.updated_at ? new Date(c.updated_at).toISOString().split("T")[0] : today,
      changefreq: "weekly",
      priority: "0.8",
    })),
    ...subs.map((s: any) => ({
      loc: `${BASE_URL}/product-category/${s.slug}`,
      lastmod: s.updated_at ? new Date(s.updated_at).toISOString().split("T")[0] : today,
      changefreq: "weekly",
      priority: "0.7",
    })),
  ];

  const blogCategorySet = new Set<string>();
  blogs.forEach((b: any) => {
    if (b.category) blogCategorySet.add(b.category);
  });
  const blogEntries: Entry[] = [
    ...Array.from(blogCategorySet).map((cat) => ({
      loc: `${BASE_URL}/blog/category/${slugify(cat)}`,
      lastmod: today,
      changefreq: "weekly",
      priority: "0.7",
    })),
    ...blogs.map((b: any) => ({
      loc: `${BASE_URL}/blog/${b.slug}`,
      lastmod: b.updated_at ? new Date(b.updated_at).toISOString().split("T")[0] : today,
      changefreq: "monthly",
      priority: "0.7",
      image: b.image_url || undefined,
    })),
  ];

  const eventEntries: Entry[] = events.map((e: any) => ({
    loc: `${BASE_URL}/events/${e.slug}`,
    lastmod: e.updated_at ? new Date(e.updated_at).toISOString().split("T")[0] : today,
    changefreq: "weekly",
    priority: "0.7",
    image: e.image_url || undefined,
  }));

  // --- Write sub-sitemaps ---
  write("static-sitemap.xml", buildUrlset(staticEntries));
  write("product-sitemap.xml", buildUrlset(productEntries, true));
  write("category-sitemap.xml", buildUrlset(categoryEntries));
  write("blog-sitemap.xml", buildUrlset(blogEntries, true));
  write("event-sitemap.xml", buildUrlset(eventEntries, true));

  // --- Write sitemap index ---
  const index = buildSitemapIndex([
    { loc: `${BASE_URL}/static-sitemap.xml`, lastmod: today },
    { loc: `${BASE_URL}/product-sitemap.xml`, lastmod: today },
    { loc: `${BASE_URL}/category-sitemap.xml`, lastmod: today },
    { loc: `${BASE_URL}/blog-sitemap.xml`, lastmod: today },
    { loc: `${BASE_URL}/event-sitemap.xml`, lastmod: today },
  ]);
  write("sitemap.xml", index);

  console.log(
    `Done. static=${staticEntries.length} products=${productEntries.length} categories=${categoryEntries.length} blogs=${blogEntries.length} events=${eventEntries.length}`,
  );
}

main().catch((err) => {
  console.error("Sitemap generation failed:", err);
  process.exit(0); // don't block build
});
