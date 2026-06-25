import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { memo } from "react";
import { Link } from "@/lib/router-adapter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Home, ArrowRight } from "lucide-react";

const HomeLivingGifts = memo(() => {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["home-living-gifts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_living_gifts")
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

  if (isLoading) {
    return (
      <section className="py-4 sm:py-6 lg:py-8">
        <div className="section-container">
          <div className="h-7 w-56 bg-muted animate-pulse rounded mb-5" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[160px] lg:flex-1">
                <div className="aspect-[5/4] rounded-2xl bg-muted animate-pulse" />
                <div className="h-4 w-20 bg-muted animate-pulse rounded mt-3 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="py-5 sm:py-7 lg:py-10" aria-label="Home & Living Gifts">
      <div className="section-container">
        {/* Header with view all */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
            Home & Living Gifts
          </h2>
          <Link
            to="/"
            className="flex items-center gap-1 text-xs sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Desktop: single row grid */}
        <div className="hidden lg:grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 6)}, 1fr)` }}>
          {items.slice(0, 6).map((item: any) => (
            <GiftCard key={item.id} item={item} />
          ))}
        </div>

        {/* Mobile/Tablet: horizontal scroll */}
        <div className="lg:hidden flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory -mx-4 px-4">
          {items.map((item: any) => (
            <div
              key={item.id}
              className="shrink-0 snap-start"
              style={{ width: "calc(38vw - 8px)", minWidth: "130px", maxWidth: "180px" }}
            >
              <GiftCard item={item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

interface GiftItem {
  id: string;
  title: string;
  image_url: string | null;
  link: string | null;
}

const GiftCard = ({ item }: { item: GiftItem }) => {
  const content = (
    <div className="flex flex-col items-center group cursor-pointer">
      <div className="w-full aspect-[5/4] rounded-[18px] overflow-hidden bg-gradient-to-br from-muted/60 to-muted/30 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.1)] group-hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.15)] transition-all duration-500">
        {item.image_url ? (
          <img
            src={getOptimizedImageUrl(item.image_url, { width: 400 })}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
            <Home className="w-10 h-10 text-primary/30" />
          </div>
        )}
      </div>
      <span className="mt-3 text-[11px] sm:text-[13px] font-semibold text-foreground/75 group-hover:text-foreground transition-colors duration-300 text-center line-clamp-1 tracking-wide">
        {item.title}
      </span>
    </div>
  );

  if (item.link) {
    return <Link to={item.link} className="block">{content}</Link>;
  }
  return content;
};

HomeLivingGifts.displayName = "HomeLivingGifts";
export default HomeLivingGifts;
