import { Metadata } from "next";
import { Suspense } from "react";
import Shop from "@/views/Shop";
import { supabase } from "@/integrations/supabase/client";

interface PageProps {
  params: Promise<{ catSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { catSlug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pikooly.com.bd";

  const { data: category } = await supabase
    .from("categories")
    .select("name, seo_title, description, image_url, slug")
    .eq("slug", catSlug)
    .maybeSingle();

  if (!category) {
    return {
      title: "Category | Pikooly",
    };
  }

  const title = category.seo_title || `${category.name} | Pikooly`;
  const description = category.description || `Browse ${category.name} at Pikooly. Best price and fast delivery in Bangladesh.`;
  const canonical = `${baseUrl}/product-category/${category.slug}`;

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
      images: category.image_url ? [category.image_url] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: category.image_url ? [category.image_url] : [],
    },
  };
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Shop />
    </Suspense>
  );
}
