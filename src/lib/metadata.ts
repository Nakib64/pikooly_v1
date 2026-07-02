import { Metadata } from "next";
import { supabase } from "@/integrations/supabase/client";

export async function getSiteMetadata(
  pageTitle?: string,
  pageDescription?: string,
  relativePath?: string
): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const { data } = await supabase.from("site_settings").select("key, value");

    const settings: Record<string, string> = {};
    if (data) {
      data.forEach((s) => {
        settings[s.key] = s.value || "";
      });
    }

    const siteTitle = settings.store_name || settings.site_title || "Pikooly";
    const defaultTitle = settings.homepage_seo_title || `${siteTitle} | Online Flower Shop in Bangladesh`;
    const defaultDesc = settings.homepage_meta_description || "Order fresh flowers, beautiful gifts, and delicious cakes online in Bangladesh.";

    const title = pageTitle ? `${pageTitle} | ${siteTitle}` : defaultTitle;
    const description = pageDescription || defaultDesc;
    const canonical = relativePath ? `${baseUrl}${relativePath.startsWith("/") ? relativePath : `/${relativePath}`}` : baseUrl;

    return {
      title,
      description,
      alternates: {
        canonical,
      },
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
        images: settings.company_favicon ? [settings.company_favicon] : ["/placeholder.svg"],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: settings.company_favicon ? [settings.company_favicon] : ["/placeholder.svg"],
      },
    };
  } catch (error) {
    console.error("Error fetching site settings for metadata:", error);
    const title = pageTitle ? `${pageTitle} | Pikooly` : "Pikooly";
    const canonical = relativePath ? `${baseUrl}${relativePath.startsWith("/") ? relativePath : `/${relativePath}`}` : baseUrl;
    return {
      title,
      description: pageDescription || "Order fresh flowers, beautiful gifts, and delicious cakes online in Bangladesh.",
      alternates: {
        canonical,
      },
    };
  }
}
