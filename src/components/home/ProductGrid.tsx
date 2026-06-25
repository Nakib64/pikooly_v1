import { useMemo, memo } from "react";
import ProductCard from "@/components/product/ProductCard";
import ProductCarousel from "@/components/home/ProductCarousel";
import { Link } from "@/lib/router-adapter";
import { Gift, Heart, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const ProductGrid = memo(() => {
  const { settings } = useSiteSettings();

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["homepage-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, price, original_price, image_url, rating, stock, is_featured, delivery_time, category_id, categories(name, slug), product_categories(category_id, categories(name, slug)), product_subcategories(subcategory_id)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: tailoredSubcategories = [] } = useQuery({
    queryKey: ["homepage-subcategories-tailored"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("subcategories")
        .select("id, name, slug, image_url, category_id") as any)
        .eq("is_active", true)
        .eq("show_in_tailored", true)
        .order("display_order");
      if (error) throw error;
      return data as any[];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const allTrendingTabs = useMemo(() => {
    const forYouIcon = settings.trending_tab_foryou_icon || null;
    const bestSellerIcon = settings.trending_tab_bestseller_icon || null;
    const baseTabs = [
      { id: "for-you", label: "For You", icon: forYouIcon ? null : Heart, imageUrl: forYouIcon, type: "trending" as const },
      { id: "best", label: "Best Seller", icon: bestSellerIcon ? null : Zap, imageUrl: bestSellerIcon, type: "trending" as const },
    ];
    const subTabs = tailoredSubcategories.map((s: any) => ({
      id: `sub-${s.slug}`, label: s.name, icon: null, imageUrl: s.image_url || null, type: "sub" as const, subId: s.id, slug: s.slug,
    }));
    return [...baseTabs, ...subTabs];
  }, [tailoredSubcategories, settings]);

  const featured = products.filter((p: any) => p.is_featured);

  const trendingProducts = useMemo(() => {
    const tab = allTrendingTabs.find((t) => t.id === "for-you");
    if (!tab) return products.slice(0, 12);
    const featuredIds = new Set(featured.map((p: any) => p.id));
    const rest = products.filter((p: any) => !featuredIds.has(p.id));
    return [...featured, ...rest].slice(0, 12);
  }, [products, featured, allTrendingTabs]);

  const cardWidthClass = "w-[44vw] sm:w-[180px] md:w-[200px] lg:w-[210px] xl:w-[220px]";

  return (
    <section className="pt-3 pb-1 sm:pt-4 sm:pb-2 md:pt-6 md:pb-3 section-container" aria-label="Products" style={{ contain: "layout style" }}>
      <div className="flex items-end justify-between mb-3 sm:mb-5 gap-4">
        <div>
          <h2 className="display-heading text-foreground font-bold leading-tight" style={{ fontSize: "clamp(1.25rem, 2vw + 0.5rem, 1.75rem)" }}>
            Trending Now
          </h2>
          <div className="w-12 h-[2px] bg-gradient-gold mt-2 rounded-full" />
        </div>
        <Link to="/" className="btn-outline-luxe text-xs sm:text-sm shrink-0 px-4 sm:px-5 py-2 sm:py-2.5">
          View All
        </Link>
      </div>

      {productsLoading ? (
        <ProductCarousel>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`s-${i}`} className={`${cardWidthClass} shrink-0 snap-start`}>
              <div className="aspect-square rounded-xl bg-muted animate-pulse" />
              <div className="mt-2 h-3 w-3/4 rounded bg-muted animate-pulse" />
              <div className="mt-1.5 h-3 w-1/2 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </ProductCarousel>
      ) : trendingProducts.length === 0 ? (
        <div className="text-center py-16 px-4">
          <Gift className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">No products found in this category</p>
        </div>
      ) : (
        <ProductCarousel>
          {trendingProducts.map((product: any) => (
            <div key={product.id} className={`${cardWidthClass} shrink-0 snap-start`}>
              <ProductCard product={product} />
            </div>
          ))}
        </ProductCarousel>
      )}
    </section>
  );
});

ProductGrid.displayName = "ProductGrid";

export default ProductGrid;
