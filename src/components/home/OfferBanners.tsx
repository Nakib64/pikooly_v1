import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { memo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/lib/router-adapter";

const OfferBanners = memo(() => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["offer-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_banners")
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

  if (isLoading && banners.length === 0) {
    return (
      <section className="py-3 sm:py-5 md:py-7 section-container">
        <div className="h-6 w-40 mb-4 rounded bg-muted animate-pulse" />
        <div className="flex gap-3 sm:gap-4 md:gap-5 overflow-hidden pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="min-w-[280px] w-[80vw] sm:w-[340px] md:flex-1 h-[90px] sm:h-[100px] md:h-[110px] rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (banners.length === 0) return null;

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  return (
    <section className="py-3 sm:py-5 md:py-7 section-container" style={{ contain: "layout style" }}>
      <div className="mb-3 sm:mb-4">
        <h2 className="display-heading text-foreground font-bold leading-tight" style={{ fontSize: "clamp(1.25rem, 2vw + 0.5rem, 1.75rem)" }}>
          Exclusive Offers
        </h2>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 md:gap-5 overflow-x-auto scrollbar-hide scroll-smooth-ios pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory"
        >
          {banners.map((b: any) => {
            const bgColor = b.bg_color || "#f5f0d0";
            const hasContent = (b.title && b.title.trim()) || (b.subtitle && b.subtitle.trim()) || b.logo_url;
            const itemClassName = banners.length === 1
              ? "w-full md:max-w-[640px] md:mx-auto flex-shrink-0 snap-start"
              : banners.length === 2
              ? "min-w-[280px] w-[80vw] sm:w-[340px] md:min-w-0 md:w-[calc((100%-1.25rem)/2)] flex-shrink-0 snap-start"
              : "min-w-[280px] w-[80vw] sm:w-[340px] md:min-w-0 md:w-[calc((100%-2.5rem)/3)] flex-shrink-0 snap-start";

            const card = (
              <div
                key={b.id}
                className="w-full"
              >
                {/* Full-image mode when only bg_image_url is set with no text content */}
                {!hasContent && b.bg_image_url ? (
                  <div className="relative rounded-2xl overflow-hidden h-[90px] sm:h-[100px] md:h-[110px] shadow-[0_1px_4px_0_hsl(var(--foreground)/0.06)] border border-border/30 hover:shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.15)] transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]">
                    <img
                      src={getOptimizedImageUrl(b.bg_image_url, { width: 720 })}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ) : (
                   <div
                    className="relative rounded-2xl overflow-hidden h-[90px] sm:h-[100px] md:h-[110px] shadow-[0_1px_4px_0_hsl(var(--foreground)/0.06)] border border-border/30 hover:shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.15)] transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
                    style={{
                      background: b.bg_image_url
                        ? `url(${b.bg_image_url}) center/cover no-repeat`
                        : bgColor,
                    }}
                  >
                    {b.bg_image_url && (
                      <div className="absolute inset-0" style={{ background: `${bgColor}cc` }} />
                    )}

                    <div className="absolute inset-0 flex">
                      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between relative z-10" style={{ maxWidth: "65%" }}>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {b.logo_url && (
                              <img
                                src={getOptimizedImageUrl(b.logo_url, { width: 200 })}
                                alt=""
                                className="h-5 sm:h-6 md:h-7 w-auto object-contain max-w-[100px]"
                                loading="lazy"
                                decoding="async"
                              />
                            )}
                            {b.subtitle && !b.logo_url && (
                              <span className="text-[10px] sm:text-xs font-bold text-foreground/60 uppercase tracking-wider">
                                {b.subtitle}
                              </span>
                            )}
                          </div>
                          {b.subtitle && b.logo_url && (
                            <p className="text-[10px] sm:text-xs font-semibold text-foreground/60 uppercase tracking-wider mt-1.5">
                              {b.subtitle}
                            </p>
                          )}
                          {b.title && (
                            <h3 className="text-lg sm:text-xl md:text-2xl font-display font-extrabold text-foreground leading-tight mt-1">
                              {b.title}
                            </h3>
                          )}
                        </div>

                        <div>
                          {b.description && (
                            <p className="text-[8px] sm:text-[9px] md:text-[10px] text-foreground/50 font-medium line-clamp-2 mb-1.5">
                              {b.description}
                            </p>
                          )}
                          {b.cta_text && (
                            <span className="inline-block px-3 py-1 text-[10px] sm:text-[11px] font-bold rounded-full bg-foreground/90 text-background tracking-wide">
                              {b.cta_text}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="relative flex items-center">
                        <div className="w-px h-[70%] border-r-2 border-dashed border-foreground/10" />
                      </div>

                      <div className="relative overflow-hidden flex items-center justify-center" style={{ width: "35%" }}>
                        {b.image_url ? (
                          <img
                            src={getOptimizedImageUrl(b.image_url, { width: 400 })}
                            alt=""
                            className="w-full h-full object-cover absolute inset-0"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span
                            className="text-[80px] sm:text-[100px] font-black select-none pointer-events-none leading-none"
                            style={{ color: "rgba(0,0,0,0.06)" }}
                          >
                            %
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className="absolute -top-3 w-6 h-6 rounded-full bg-background z-20"
                      style={{ left: "63%" }}
                    />
                    <div
                      className="absolute -bottom-3 w-6 h-6 rounded-full bg-background z-20"
                      style={{ left: "63%" }}
                    />
                  </div>
                )}
              </div>
            );

            return b.link ? (
              <Link
                key={b.id}
                to={b.link}
                className={`${itemClassName} hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200`}
              >
                {card}
              </Link>
            ) : (
              <div key={b.id} className={itemClassName}>
                {card}
              </div>
            );
          })}
        </div>

        {banners.length > 2 && (
          <>
            <button
              onClick={() => scroll(-1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/3 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-card/95 shadow-lg items-center justify-center hover:bg-muted active:scale-95 transition-all z-10 border border-border/30 hidden sm:flex"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll(1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-card/95 shadow-lg items-center justify-center hover:bg-muted active:scale-95 transition-all z-10 border border-border/30 hidden sm:flex"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>
    </section>
  );
});

OfferBanners.displayName = "OfferBanners";
export default OfferBanners;
