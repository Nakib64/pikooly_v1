import { Metadata } from "next";
import { Suspense } from "react";
import Shop from "@/views/Shop";
import { supabase } from "@/integrations/supabase/client";

interface PageProps {
  params: Promise<{ catSlug: string; subSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { catSlug, subSlug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pikooly.com.bd";

  // First fetch the parent category
  const { data: category } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("slug", catSlug)
    .maybeSingle();

  if (!category) {
    return {
      title: "Subcategory | Pikooly",
    };
  }

  // Fetch the subcategory
  const { data: subcategory } = await supabase
    .from("subcategories")
    .select("name, seo_title, description, image_url, slug")
    .eq("slug", subSlug)
    .eq("category_id", category.id)
    .maybeSingle();

  if (!subcategory) {
    return {
      title: `${category.name} | Pikooly`,
    };
  }

  const title = subcategory.seo_title || `${subcategory.name} - ${category.name} | Pikooly`;
  const description = subcategory.description || `Shop ${subcategory.name} in ${category.name} category at Pikooly. Best price and fast delivery in Bangladesh.`;
  const canonical = `${baseUrl}/product-category/${category.slug}/${subcategory.slug}`;

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
      images: subcategory.image_url ? [subcategory.image_url] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: subcategory.image_url ? [subcategory.image_url] : [],
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
