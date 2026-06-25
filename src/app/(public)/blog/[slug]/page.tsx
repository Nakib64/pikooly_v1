import { Metadata } from "next";
import { Suspense } from "react";
import BlogDetail from "@/views/BlogDetail";
import { supabase } from "@/integrations/supabase/client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pikooly.com.bd";

  const { data: blog } = await supabase
    .from("blogs")
    .select("title, seo_title, seo_description, excerpt, image_url, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!blog) {
    return {
      title: "Blog Post | Pikooly",
    };
  }

  const title = blog.seo_title || `${blog.title} | Pikooly`;
  const description = blog.seo_description || blog.excerpt || `Read our latest article: ${blog.title} on Pikooly.`;
  const canonical = `${baseUrl}/blog/${blog.slug}`;

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
      type: "article",
      images: blog.image_url ? [blog.image_url] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: blog.image_url ? [blog.image_url] : [],
    },
  };
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BlogDetail />
    </Suspense>
  );
}
