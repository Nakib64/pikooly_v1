import { Metadata } from "next";
import { Suspense } from "react";
import ProductDetail from "@/views/ProductDetail";
import { supabase } from "@/integrations/supabase/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pikooly.com.bd";

  // Fetch product from Supabase on the server
  let { data: product } = await supabase
    .from("products")
    .select("name, seo_title, seo_description, image_url, slug, id")
    .eq("slug", id)
    .maybeSingle();

  if (!product) {
    ({ data: product } = await supabase
      .from("products")
      .select("name, seo_title, seo_description, image_url, slug, id")
      .eq("id", id)
      .maybeSingle());
  }

  if (!product) {
    return {
      title: "Product Not Found | Pikooly",
    };
  }

  const title = product.seo_title || `${product.name} | Pikooly`;
  const description = product.seo_description || `Order ${product.name} online at Pikooly. Best price and fast delivery in Bangladesh.`;
  const canonical = `${baseUrl}/product/${product.slug || product.id}`;

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
      images: product.image_url ? [product.image_url] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.image_url ? [product.image_url] : [],
    },
  };
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProductDetail />
    </Suspense>
  );
}
