"use client";
import { useEffect, lazy, Suspense, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import HeroSection from "@/components/home/HeroSection";
import HomepageBanner from "@/components/home/HomepageBanner";
import CategoryGrid from "@/components/home/CategoryGrid";
import ProductGrid from "@/components/home/ProductGrid";
import TailoredOccasions from "@/components/home/TailoredOccasions";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import SEOHead from "@/components/seo/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import sameDayDeliveryBanner from "@/assets/same-day-delivery-banner.png";
import LazyMount from "@/components/layout/LazyMount";

// Lazy load all below-fold sections
const OfferBanners = lazy(() => import("@/components/home/OfferBanners"));
const AISmartSearch = lazy(() => import("@/components/shop/AISmartSearch"));
const PopularGifting = lazy(() => import("@/components/home/PopularGifting"));
const RelationshipGrid = lazy(() => import("@/components/home/RelationshipGrid"));
const CelebrationsCalendar = lazy(() => import("@/components/home/CelebrationsCalendar"));
const GiftingStories = lazy(() => import("@/components/home/GiftingStories"));
const HomeLivingGifts = lazy(() => import("@/components/home/HomeLivingGifts"));
const EventsSection = lazy(() => import("@/components/home/EventsSection"));
const BlogSection = lazy(() => import("@/components/home/BlogSection"));
const CustomerReviewSection = lazy(() => import("@/components/home/CustomerReviewSection"));
const AboutSection = lazy(() => import("@/components/home/AboutSection"));
const LoyaltyProgramSection = lazy(() => import("@/components/home/LoyaltyProgramSection"));
const FAQSection = lazy(() => import("@/components/home/FAQSection"));

const LazyFallback = () => <div className="min-h-[100px]" />;

const Index = () => {
  const queryClient = useQueryClient();
  const { settings } = useSiteSettings();

  // Prefetch shop data so it's cached when user navigates to Shop page
  useEffect(() => {
    const prefetchShop = () => {
      queryClient.prefetchQuery({
        queryKey: ["shop-products"],
        queryFn: async () => {
          const { data } = await supabase
            .from("products")
            .select("id, name, slug, price, original_price, image_url, rating, review_count, stock, is_featured, is_active, delivery_time, short_description, tags, category_id, subcategory_id, created_at, categories(name, slug), subcategories(name, slug), product_categories(category_id, categories(name, slug)), product_subcategories(subcategory_id, subcategories(name, slug))")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(300);
          return data;
        },
      });
    };

    if ("requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(prefetchShop, { timeout: 8000 });
      return () => (window as any).cancelIdleCallback(id);
    }
    const id = globalThis.setTimeout(prefetchShop, 6000);
    return () => globalThis.clearTimeout(id);
  }, [queryClient]);

  const seoTitle = settings.homepage_seo_title || settings.site_title || "Pikooly";
  const seoDesc = settings.homepage_meta_description || "Fresh flowers, gifts, and cakes delivered across Bangladesh.";
  const siteName = settings.store_name || settings.site_title || "Pikooly";
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://pikooly.com.bd";

  const combinedJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: siteName,
        url: siteUrl,
        description: seoDesc,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        name: siteName,
        url: siteUrl,
        logo: settings.company_logo || "",
        contactPoint: {
          "@type": "ContactPoint",
          telephone: settings.contact_phone || "",
          contactType: "customer service",
        },
        sameAs: [
          settings.social_facebook || "",
          settings.social_instagram || "",
        ].filter(Boolean),
      },
    ],
  }), [siteName, siteUrl, seoDesc, settings]);

  return (
    <main>
      <SEOHead
        title={seoTitle}
        description={seoDesc}
        canonical={siteUrl}
        ogImage={settings.og_image || ""}
        jsonLd={combinedJsonLd}
      />
      <HeroSection />
      {settings.homepage_banner_enabled === "true" && (
        <section className="section-container py-3 sm:py-4 lg:py-5">
          <HomepageBanner
            image={settings.homepage_banner_image || sameDayDeliveryBanner.src}
            link={settings.homepage_banner_link || null}
          />
        </section>
      )}
      <CategoryGrid />
      <LazyMount minHeight={300}>
        <Suspense fallback={<LazyFallback />}>
          <OfferBanners />
        </Suspense>
      </LazyMount>
      <LazyMount minHeight={300}>
        <Suspense fallback={<LazyFallback />}>
          <RelationshipGrid />
        </Suspense>
      </LazyMount>
      <ProductGrid />
      <TailoredOccasions />
      <LazyMount minHeight={300}>
        <Suspense fallback={<LazyFallback />}>
          <CelebrationsCalendar />
        </Suspense>
      </LazyMount>
      <LazyMount minHeight={400}>
        <Suspense fallback={<LazyFallback />}>
          <PopularGifting />
        </Suspense>
      </LazyMount>
      <LazyMount minHeight={400}>
        <Suspense fallback={<LazyFallback />}>
          <HomeLivingGifts />
        </Suspense>
      </LazyMount>
      <LazyMount minHeight={400}>
        <Suspense fallback={<LazyFallback />}>
          <GiftingStories />
        </Suspense>
      </LazyMount>
      <LazyMount minHeight={400}>
        <Suspense fallback={<LazyFallback />}>
          <EventsSection />
        </Suspense>
      </LazyMount>
      <LazyMount minHeight={400}>
        <Suspense fallback={<LazyFallback />}>
          <BlogSection />
        </Suspense>
      </LazyMount>
      <LazyMount minHeight={400}>
        <Suspense fallback={<LazyFallback />}>
          <CustomerReviewSection />
        </Suspense>
      </LazyMount>
      <LazyMount minHeight={300}>
        <Suspense fallback={<LazyFallback />}>
          <AboutSection />
        </Suspense>
      </LazyMount>
      <LazyMount minHeight={300}>
        <Suspense fallback={<LazyFallback />}>
          <FAQSection />
        </Suspense>
      </LazyMount>
    </main>
  );
};

export default Index;
