import { useState, useMemo, useEffect, memo, useCallback } from "react";
import { Link } from "@/lib/router-adapter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Gift, ChevronRight } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import ProductCarousel from "@/components/home/ProductCarousel";
import { getOptimizedCloudinaryUrl } from "@/lib/imageUtils";

const cardWidthClass = "w-[44vw] sm:w-[180px] md:w-[200px] lg:w-[210px] xl:w-[220px]";

const TailoredOccasions = memo(() => {
  const [activeSlug, setActiveSlug] = useState("");
  const [animKey, setAnimKey] = useState(0);

  const handleTabChange = useCallback((slug: string) => {
    if (slug !== activeSlug) {
      setActiveSlug(slug);
      setAnimKey((k) => k + 1);
    }
  }, [activeSlug]);
  

  const { data: occasionCategories = [] } = useQuery({
    queryKey: ["homepage-occasion-categories"],
    queryFn: async () => {
      // Tailored section: include any category marked with "tailored" type,
      // regardless of "Show in Homepage" toggle (Tailored tick is itself the intent)
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, image_url, category_type, category_types")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data || []).filter((c: any) => {
        const types: string[] = (c.category_types && c.category_types.length > 0) ? c.category_types : [c.category_type].filter(Boolean);
        return types.includes("tailored");
      });
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: tailoredSubcategories = [] } = useQuery({
    queryKey: ["homepage-tailored-subcategories"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("subcategories")
        .select("id, name, slug, image_url, category_id, categories(slug)") as any)
        .eq("is_active", true)
        .eq("show_in_tailored", true)
        .order("display_order");
      if (error) throw error;
      return (data || []) as any[];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Unified tab list: categories + subcategories
  const occasionTabs = useMemo(() => {
    const catTabs = occasionCategories.map((c: any) => ({
      key: `cat-${c.slug}`, kind: "cat" as const, id: c.id, name: c.name, slug: c.slug, image_url: c.image_url,
    }));
    const subTabs = tailoredSubcategories.map((s: any) => ({
      key: `sub-${s.slug}`, kind: "sub" as const, id: s.id, name: s.name, slug: s.slug, image_url: s.image_url,
    }));
    return [...catTabs, ...subTabs];
  }, [occasionCategories, tailoredSubcategories]);

  const tailoredCatIds = useMemo(() => occasionCategories.map((c) => c.id), [occasionCategories]);
  const tailoredSubIds = useMemo(() => tailoredSubcategories.map((s: any) => s.id), [tailoredSubcategories]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["tailored-occasion-products", tailoredCatIds, tailoredSubIds],
    queryFn: async () => {
      if (!tailoredCatIds.length && !tailoredSubIds.length) return [];

      const productIdSet = new Set<string>();

      // Products linked to tailored categories (junction + direct)
      if (tailoredCatIds.length) {
        const [junctionRes, directRes] = await Promise.all([
          supabase.from("product_categories").select("product_id").in("category_id", tailoredCatIds),
          supabase.from("products").select("id").eq("is_active", true).in("category_id", tailoredCatIds),
        ]);
        (junctionRes.data || []).forEach((j: any) => productIdSet.add(j.product_id));
        (directRes.data || []).forEach((d: any) => productIdSet.add(d.id));
      }

      // Products linked to tailored subcategories (junction + direct)
      if (tailoredSubIds.length) {
        const [subJunctionRes, subDirectRes] = await Promise.all([
          supabase.from("product_subcategories").select("product_id").in("subcategory_id", tailoredSubIds),
          supabase.from("products").select("id").eq("is_active", true).in("subcategory_id", tailoredSubIds),
        ]);
        (subJunctionRes.data || []).forEach((j: any) => productIdSet.add(j.product_id));
        (subDirectRes.data || []).forEach((d: any) => productIdSet.add(d.id));
      }

      const productIds = Array.from(productIdSet);
      if (!productIds.length) return [];

      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name, slug), product_categories(category_id, categories(name, slug)), product_subcategories(subcategory_id, subcategories(slug))")
        .eq("is_active", true)
        .in("id", productIds)
        .order("created_at", { ascending: false })
        .limit(60);

      if (error) throw error;
      return data || [];
    },
    enabled: tailoredCatIds.length > 0 || tailoredSubIds.length > 0,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!occasionTabs.length) { setActiveSlug(""); return; }
    setActiveSlug((prev) =>
      prev && occasionTabs.some((t) => t.slug === prev) ? prev : occasionTabs[0].slug
    );
  }, [occasionTabs]);

  const activeTab = useMemo(() => occasionTabs.find((t) => t.slug === activeSlug), [occasionTabs, activeSlug]);

  const filteredProducts = useMemo(() => {
    if (!activeTab) return products;
    if (activeTab.kind === "cat") {
      return products.filter((p: any) => {
        if (p.categories?.slug === activeTab.slug) return true;
        if (p.product_categories?.some((pc: any) => pc.categories?.slug === activeTab.slug)) return true;
        return false;
      });
    }
    // subcategory tab
    return products.filter((p: any) => {
      if (p.product_subcategories?.some((ps: any) => ps.subcategories?.slug === activeTab.slug || ps.subcategory_id === activeTab.id)) return true;
      return false;
    });
  }, [activeTab, products]);

  const viewAllParentSlug = useMemo(() => {
    if (!activeTab || activeTab.kind !== "sub") return null;
    const sub: any = tailoredSubcategories.find((s: any) => s.id === activeTab.id);
    if (!sub) return null;
    return sub.categories?.slug || occasionCategories.find((c: any) => c.id === sub.category_id)?.slug || null;
  }, [activeTab, tailoredSubcategories, occasionCategories]);

  const viewAllLink = activeTab
    ? activeTab.kind === "cat"
      ? `/product-category/${activeTab.slug}`
      : viewAllParentSlug
        ? `/product-category/${viewAllParentSlug}/${activeTab.slug}`
        : `/all-gifts`
    : "/all-gifts";
  const viewAllText = activeTab ? `View All ${activeTab.name} Gifts` : "View All Gifts";

  if (occasionTabs.length === 0 && !isLoading) return null;

  return (
    <section className="bg-background pt-2 pb-6 sm:pt-3 sm:pb-8 md:pt-4 md:pb-10" aria-label="Tailored For Your Occasions">
      <div className="section-container">
        {/* Title - FNP style: bold, left-aligned, no eyebrow */}
        <div className="mb-3 sm:mb-4">
          <h2 className="font-bold text-foreground tracking-tight" style={{ fontSize: "clamp(1.25rem, 2.2vw + 0.5rem, 2rem)" }}>
            Tailored For Your Occasions
          </h2>
        </div>

        {/* FNP-style folder-tab strip */}
        {occasionTabs.length > 0 && (
          <div className="relative mb-4 sm:mb-5">
            {/* Bottom hairline that the active tab sits on */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-[hsl(var(--border))]" />
            <div className="flex overflow-x-auto scrollbar-hide gap-0 -mx-4 px-4 sm:mx-0 sm:px-0">
              {occasionTabs.map((tab) => {
                const isActive = activeSlug === tab.slug;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.slug)}
                    aria-pressed={isActive}
                    className={`group relative flex flex-col items-center justify-end gap-1.5 pt-3 pb-3 px-3 sm:px-4 shrink-0 w-[88px] sm:w-[110px] transition-colors duration-200 ${
                      isActive
                        ? "bg-[hsl(var(--ivory))] rounded-t-xl border-t-2 border-x border-[hsl(var(--primary))] border-b-0 -mb-px"
                        : "border-b border-transparent"
                    }`}
                  >
                    {/* Icon */}
                    <div className="flex items-center justify-center h-9 sm:h-10">
                      {tab.image_url ? (
                        <img
                          src={getOptimizedCloudinaryUrl(tab.image_url, 96)}
                          alt={tab.name}
                          className={`w-8 h-8 sm:w-9 sm:h-9 object-contain transition-opacity ${isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100"}`}
                          loading="lazy"
                          decoding="async"
                          width={36}
                          height={36}
                        />
                      ) : (
                        <Gift size={26} strokeWidth={1.5} className={isActive ? "text-[hsl(var(--primary))]" : "text-foreground/70"} />
                      )}
                    </div>
                    {/* Label */}
                    <span
                      className={`text-[12px] sm:text-[13px] leading-tight text-center line-clamp-1 transition-colors duration-200 ${
                        isActive ? "font-semibold text-[hsl(var(--primary))]" : "font-medium text-foreground/75 group-hover:text-foreground"
                      }`}
                    >
                      {tab.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Products */}
        {isLoading ? (
          <ProductCarousel>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`${cardWidthClass} shrink-0 snap-start bg-white rounded-xl overflow-hidden shadow-sm`}>
                <div className="aspect-square bg-muted animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </ProductCarousel>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Gift className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No products found for this occasion</p>
          </div>
        ) : (
          <div key={animKey} className="motion-safe:animate-fade-in-up">
            <ProductCarousel>
              {filteredProducts.map((product: any) => (
                <div key={product.id} className={`${cardWidthClass} shrink-0 snap-start`}>
                  <ProductCard product={product} />
                </div>
              ))}
            </ProductCarousel>
          </div>
        )}

        {/* CTA */}
        {filteredProducts.length > 0 && (
          <div className="mt-7 sm:mt-9 text-center">
            <Link
              to={viewAllLink}
              className="btn-luxe inline-flex items-center gap-2 text-xs sm:text-sm tracking-[0.16em] uppercase"
            >
              {viewAllText}
              <ChevronRight size={14} strokeWidth={2.5} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
});

TailoredOccasions.displayName = "TailoredOccasions";

export default TailoredOccasions;
