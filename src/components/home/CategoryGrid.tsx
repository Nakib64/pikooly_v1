import { memo, useMemo } from "react";
import { Link } from "@/lib/router-adapter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedCloudinaryUrl } from "@/lib/imageUtils";

type Category = {
  id: string;
  name: string;
  href: string;
  image_url: string | null;
  product_count?: number;
};

const CategoryGrid = memo(() => {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["homepage-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, image_url, category_type, category_types")
        .eq("is_active", true)
        .eq("show_in_homepage", true)
        .order("display_order");
      if (error) throw error;
      return (data || []).filter((c: any) => {
        const types: string[] = (c.category_types && c.category_types.length > 0) ? c.category_types : [c.category_type].filter(Boolean);
        return types.includes("category");
      });
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: shopSubcategories = [] } = useQuery({
    queryKey: ["homepage-shop-subcategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcategories")
        .select("id, name, slug, image_url, display_order, category:categories!subcategories_category_id_fkey(slug)")
        .eq("is_active", true)
        .eq("show_in_shop_by_category", true)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: productCounts = {} } = useQuery({
    queryKey: ["category-product-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, category_id, product_categories(category_id)")
        .eq("is_active", true);
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const p of data || []) {
        const countedCats = new Set<string>();
        if (p.category_id) countedCats.add(p.category_id);
        for (const pc of (p as any).product_categories || []) {
          if (pc.category_id) countedCats.add(pc.category_id);
        }
        for (const catId of countedCats) {
          counts[catId] = (counts[catId] || 0) + 1;
        }
      }
      return counts;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const items = useMemo(() => {
    const cats = categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      image_url: cat.image_url,
      href: `/product-category/${cat.slug}`,
      product_count: productCounts[cat.id] || 0,
    }));
    const subs = (shopSubcategories as any[]).map((sub) => ({
      id: `sub-${sub.id}`,
      name: sub.name,
      image_url: sub.image_url,
      href: sub.category?.slug ? `/product-category/${sub.category.slug}/${sub.slug}` : `/shop?subcategory=${sub.slug}`,
      product_count: 0,
    }));
    return [...cats, ...subs];
  }, [categories, shopSubcategories, productCounts]);

  if (isLoading) return (
    <section className="py-2 sm:py-3 lg:py-4" style={{ minHeight: "280px" }}>
      <div className="grid grid-cols-4 gap-3 px-4 md:hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-full aspect-square rounded-2xl bg-muted animate-pulse" />
            <div className="h-3 w-14 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      <div className="hidden md:flex justify-center gap-5 section-container lg:hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2.5 flex-1 max-w-[120px]">
            <div className="w-full aspect-square rounded-[20px] bg-muted animate-pulse" />
            <div className="h-3.5 w-14 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      <div className="hidden lg:flex justify-center gap-5 section-container">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2.5 flex-1 max-w-[130px]">
            <div className="w-full aspect-square rounded-[20px] bg-muted animate-pulse" />
            <div className="h-3.5 w-14 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );

  if (items.length === 0) return null;

  const mobileItems = items.slice(0, 8);
  const tabletItems = items.slice(0, 8);
  const desktopItems = items.slice(0, 9);

  return (
    <section className="py-2 sm:py-3 lg:py-4" aria-label="Shop by Category" style={{ contain: "layout style" }}>
      {/* Mobile: 2 rows x 4 columns */}
      <div className="grid grid-cols-4 gap-x-3 gap-y-4 px-4 md:hidden">
        {mobileItems.map((cat, idx) => (
          <CategoryItem key={cat.id} cat={cat} idx={idx} variant="mobile" />
        ))}
      </div>

      {/* Tablet: single row */}
      <div className="hidden md:flex lg:hidden justify-center gap-4 section-container">
        {tabletItems.map((cat, idx) => (
          <CategoryItem key={cat.id} cat={cat} idx={idx} variant="tablet" />
        ))}
      </div>

      {/* Desktop: single row */}
      <div className="hidden lg:flex justify-center gap-5 section-container">
        {desktopItems.map((cat, idx) => (
          <CategoryItem key={cat.id} cat={cat} idx={idx} variant="desktop" />
        ))}
      </div>
    </section>
  );
});

const CategoryItem = ({ cat, idx, variant }: { cat: Category; idx: number; variant: "mobile" | "tablet" | "desktop" }) => {
  const containerClass = variant === "mobile"
    ? "flex flex-col items-center gap-1.5 w-full"
    : "flex flex-col items-center gap-2.5 flex-1 max-w-[130px]";

  const iconBoxClass = variant === "mobile"
    ? "relative w-full aspect-square rounded-[20px] bg-gradient-to-br from-[hsl(var(--ivory))] to-[hsl(var(--gold-light))] flex items-center justify-center p-2 shadow-soft border border-border/50 transition-all duration-700 ease-luxe group-hover:border-[hsl(var(--gold)/0.5)] group-hover:shadow-luxe overflow-hidden"
    : "relative w-full aspect-square rounded-[22px] bg-gradient-to-br from-[hsl(var(--ivory))] to-[hsl(var(--gold-light))] flex items-center justify-center p-2.5 shadow-soft border border-border/50 transition-all duration-700 ease-luxe group-hover:border-[hsl(var(--gold)/0.5)] group-hover:shadow-luxe group-hover:-translate-y-0.5 overflow-hidden";

  const imgSize = variant === "mobile" ? 80 : 120;
  const cloudinaryWidth = variant === "mobile" ? 100 : 150;
  const imgMaxClass = variant === "mobile" ? "max-h-[85%] max-w-[85%]" : "max-h-[88%] max-w-[88%]";

  const textClass = variant === "mobile"
    ? "w-full text-center text-[11px] sm:text-xs font-medium leading-tight line-clamp-2 text-foreground/85 group-hover:text-primary transition-colors duration-500"
    : "w-full text-center text-[13px] font-medium leading-tight line-clamp-2 text-foreground/85 transition-colors duration-500 group-hover:text-primary";

  const countClass = variant === "mobile"
    ? "text-[10px] text-muted-foreground leading-none"
    : "text-[11px] text-muted-foreground leading-none";

  return (
    <Link to={cat.href} className={`group ${containerClass}`}>
      <div className={iconBoxClass}>
        {/* Decorative gold radial glow on hover */}
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-luxe" style={{ background: "radial-gradient(circle at center, hsl(var(--gold)/0.15) 0%, transparent 65%)" }} />
        <img
          src={getOptimizedCloudinaryUrl(cat.image_url || "/placeholder.svg", cloudinaryWidth)}
          alt={cat.name}
          width={imgSize}
          height={imgSize}
          decoding="async"
          className={`relative h-auto w-auto object-contain transition-transform duration-700 ease-luxe group-hover:scale-[1.08] ${imgMaxClass}`}
          loading={idx < 4 ? "eager" : "lazy"}
          fetchPriority={idx < 2 ? "high" : undefined}
        />
      </div>
      <span className={textClass}>{cat.name}</span>
    </Link>
  );
};

CategoryGrid.displayName = "CategoryGrid";

export default CategoryGrid;
