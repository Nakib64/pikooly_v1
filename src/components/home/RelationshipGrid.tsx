import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@/lib/router-adapter";

const RelationshipGrid = memo(() => {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["relationship-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relationship_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  if (isLoading && items.length === 0) {
    return (
      <section className="py-3 sm:py-4 md:py-5 section-container">
        <div className="h-6 w-48 mb-4 rounded bg-muted animate-pulse" />
        <div className="-mx-4 px-4">
          <div className="flex gap-2.5 sm:gap-4 overflow-hidden pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[24vw] min-w-[24vw] sm:w-[140px] sm:min-w-[140px] md:w-[160px] md:min-w-[160px] space-y-1.5">
                <div className="w-full aspect-square rounded-2xl bg-muted animate-pulse" />
                <div className="h-3 w-3/4 mx-auto rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="py-3 sm:py-4 md:py-5 section-container" style={{ contain: "layout style" }}>
      <div className="mb-3 sm:mb-4">
        <h2 className="font-bold text-foreground text-left" style={{ fontSize: "clamp(1.25rem, 2.5vw + 0.5rem, 2rem)" }}>
          For Every Relationship
        </h2>
      </div>

      {/* Horizontal scroll: 3 cards visible + 4th peek (FNP style) */}
      <div className="-mx-4 px-4">
        <div className="flex flex-nowrap gap-2.5 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
          {items.map((item: any) => (
            <Link
              key={item.id}
              to={item.link || `/product-category/${item.slug}`}
              className="flex flex-col gap-1.5 group snap-start shrink-0 w-[24vw] min-w-[24vw] sm:w-[140px] sm:min-w-[140px] md:w-[160px] md:min-w-[160px] lg:w-[180px] lg:min-w-[180px] max-w-[200px]"
            >
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted/40 transition-all duration-500 group-hover:shadow-md">
                <img
                  src={item.image_url ? getOptimizedImageUrl(item.image_url, { width: 240 }) : "/placeholder.svg"}
                  alt={item.name}
                  width={200}
                  height={200}
                  decoding="async"
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 ease-luxe group-hover:scale-105"
                />
              </div>
              <span className="w-full text-sm sm:text-base font-medium text-foreground/90 group-hover:text-primary transition-colors duration-300 text-center leading-tight line-clamp-1">
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
});

RelationshipGrid.displayName = "RelationshipGrid";
export default RelationshipGrid;
