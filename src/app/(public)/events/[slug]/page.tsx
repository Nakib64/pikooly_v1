import { Metadata } from "next";
import { Suspense } from "react";
import EventCategoryDetail from "@/views/EventCategoryDetail";
import { supabase } from "@/integrations/supabase/client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pikooly.com.bd";

  const { data: eventCat } = await supabase
    .from("event_categories")
    .select("name, seo_title, seo_description, description, short_description, image_url, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!eventCat) {
    return {
      title: "Event Details | Pikooly",
    };
  }

  const title = eventCat.seo_title || `${eventCat.name} | Pikooly`;
  const description = eventCat.seo_description || eventCat.short_description || eventCat.description || `Celebrate with Pikooly ${eventCat.name} services. Order online in Bangladesh.`;
  const canonical = `${baseUrl}/events/${eventCat.slug}`;

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
      images: eventCat.image_url ? [eventCat.image_url] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: eventCat.image_url ? [eventCat.image_url] : [],
    },
  };
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EventCategoryDetail />
    </Suspense>
  );
}
