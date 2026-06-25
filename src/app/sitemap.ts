import { MetadataRoute } from "next";
import { supabase } from "@/integrations/supabase/client";

export const revalidate = 86400; // Revalidate sitemap cache once per day (86400 seconds)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pikooly.com.bd";

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Helper function to safely build absolute URL
  const getAbsoluteUrl = (path: string) => {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  };

  // 1. Base / Home entry
  sitemapEntries.push({
    url: baseUrl,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1.0,
  });

  try {
    // 2. Fetch sitemap_links configured in the admin dashboard
    const { data: sitemapLinks } = await supabase
      .from("sitemap_links")
      .select("url, updated_at")
      .eq("is_active", true);

    if (sitemapLinks) {
      sitemapLinks.forEach((link) => {
        if (link.url === "/" || link.url === "") return;
        sitemapEntries.push({
          url: getAbsoluteUrl(link.url),
          lastModified: link.updated_at ? new Date(link.updated_at) : new Date(),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      });
    }

    // 3. Fetch products
    const { data: products } = await supabase
      .from("products")
      .select("slug, id, updated_at")
      .eq("is_active", true);

    if (products) {
      products.forEach((prod) => {
        const idOrSlug = prod.slug || prod.id;
        sitemapEntries.push({
          url: getAbsoluteUrl(`/product/${idOrSlug}`),
          lastModified: prod.updated_at ? new Date(prod.updated_at) : new Date(),
          changeFrequency: "daily",
          priority: 0.9,
        });
      });
    }

    // 4. Fetch categories
    const { data: categories } = await supabase
      .from("categories")
      .select("id, slug, is_active, updated_at");

    const categoryMap = new Map<string, { slug: string; is_active: boolean }>();

    if (categories) {
      categories.forEach((cat) => {
        categoryMap.set(cat.id, { slug: cat.slug, is_active: cat.is_active });
        if (cat.is_active) {
          sitemapEntries.push({
            url: getAbsoluteUrl(`/product-category/${cat.slug}`),
            lastModified: cat.updated_at ? new Date(cat.updated_at) : new Date(),
            changeFrequency: "daily",
            priority: 0.8,
          });
        }
      });
    }

    // 5. Fetch subcategories and resolve their category slugs
    const { data: subcategories } = await supabase
      .from("subcategories")
      .select("slug, category_id, updated_at")
      .eq("is_active", true);

    if (subcategories) {
      subcategories.forEach((sub) => {
        const parent = categoryMap.get(sub.category_id);
        if (parent && parent.is_active) {
          sitemapEntries.push({
            url: getAbsoluteUrl(`/product-category/${parent.slug}/${sub.slug}`),
            lastModified: sub.updated_at ? new Date(sub.updated_at) : new Date(),
            changeFrequency: "daily",
            priority: 0.7,
          });
        }
      });
    }

    // 6. Fetch published blogs
    const { data: blogs } = await supabase
      .from("blogs")
      .select("slug, updated_at")
      .eq("is_published", true);

    if (blogs) {
      blogs.forEach((blog) => {
        sitemapEntries.push({
          url: getAbsoluteUrl(`/blog/${blog.slug}`),
          lastModified: blog.updated_at ? new Date(blog.updated_at) : new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        });
      });
    }

    // 7. Fetch active events
    const { data: events } = await supabase
      .from("event_categories")
      .select("slug, updated_at")
      .eq("is_active", true);

    if (events) {
      events.forEach((evt) => {
        sitemapEntries.push({
          url: getAbsoluteUrl(`/events/${evt.slug}`),
          lastModified: evt.updated_at ? new Date(evt.updated_at) : new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        });
      });
    }
  } catch (error) {
    console.error("Error generating dynamic sitemap:", error);
  }

  return sitemapEntries;
}
