import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { memo } from "react";
import { Link } from "@/lib/router-adapter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Clock, Truck, Sparkles, Plane } from "lucide-react";

/* Default items shown when DB is empty */
const defaultItems = [
  { id: "d1", title: "Corporate Gifts", icon: "gift", image_url: null, link: "/" },
  { id: "d2", title: "Get Today", icon: "clock", image_url: null, link: "/" },
  { id: "d3", title: "Midnight Delivery", icon: "truck", image_url: null, link: "/" },
  { id: "d4", title: "Just Launched", icon: "sparkles", image_url: null, link: "/" },
  { id: "d5", title: "Send Abroad", icon: "plane", image_url: null, link: "/" },
];

const iconMap: Record<string, React.ReactNode> = {
  gift: <Gift className="w-10 h-10 text-foreground/30" />,
  clock: <Clock className="w-10 h-10 text-foreground/30" />,
  truck: <Truck className="w-10 h-10 text-foreground/30" />,
  sparkles: <Sparkles className="w-10 h-10 text-foreground/30" />,
  plane: <Plane className="w-10 h-10 text-foreground/30" />,
};

const PopularGifting = memo(() => {
  const { data: dbItems = [], isLoading } = useQuery({
    queryKey: ["popular-gifting"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("popular_gifting")
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

  const items = dbItems.length > 0 ? dbItems : defaultItems;

  if (isLoading) {
    return (
      <section className="py-4 sm:py-6 lg:py-8">
        <div className="section-container">
          <div className="h-7 w-52 bg-muted animate-pulse rounded mb-5" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shrink-0 flex-1 min-w-[140px]">
                <div className="aspect-[4/3] rounded-2xl bg-muted animate-pulse" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded mt-3 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-4 sm:py-6 lg:py-8" aria-label="Popular in Gifting">
      <div className="section-container">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-4 italic">
          Popular In Gifting
        </h2>

        {/* Desktop: 5-col grid */}
        <div className="hidden lg:grid grid-cols-5 gap-4 xl:gap-5">
          {items.slice(0, 5).map((item: any) => (
            <GiftCard key={item.id} item={item} />
          ))}
        </div>

        {/* Mobile/Tablet: horizontal scroll */}
        <div className="lg:hidden flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory">
          {items.map((item: any) => (
            <div
              key={item.id}
              className="shrink-0 snap-start"
              style={{ width: "calc(40vw - 12px)", minWidth: "140px", maxWidth: "200px" }}
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
  icon?: string;
}

const GiftCard = ({ item }: { item: GiftItem }) => {
  const content = (
    <div className="flex flex-col items-center group cursor-pointer">
      <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#f5f0e8]">
        {item.image_url ? (
          <img
            src={getOptimizedImageUrl(item.image_url, { width: 360 })}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {item.icon && iconMap[item.icon] ? iconMap[item.icon] : (
              <Gift className="w-10 h-10 text-foreground/30" />
            )}
          </div>
        )}
      </div>
      <span className="mt-2.5 text-xs sm:text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors text-center line-clamp-1">
        {item.title}
      </span>
    </div>
  );

  if (item.link) {
    return <Link to={item.link} className="block">{content}</Link>;
  }
  return content;
};

PopularGifting.displayName = "PopularGifting";
export default PopularGifting;
