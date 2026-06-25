import { memo, useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@/lib/router-adapter";
import { cn } from "@/lib/utils";
import { getOptimizedCloudinaryUrl } from "@/lib/imageUtils";

interface Slide {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link: string | null;
  cta_text: string | null;
  bg_color: string | null;
  bg_image_url: string | null;
  display_order: number;
}

const HeroSection = memo(() => {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(0);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ["homepage-sliders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sliders")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as Slide[];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Preload LCP image as early as possible (CDN-optimised, mobile-sized)
  useEffect(() => {
    if (slides.length > 0) {
      const rawImg = slides[0]?.bg_image_url || slides[0]?.image_url;
      if (rawImg) {
        const isMobile = window.innerWidth < 640;
        const optImg = getOptimizedCloudinaryUrl(rawImg, isMobile ? 720 : 1280);
        const existing = document.querySelector(`link[href="${optImg}"]`);
        if (!existing) {
          const link = document.createElement("link");
          link.rel = "preload";
          link.as = "image";
          link.href = optImg;
          (link as any).fetchPriority = "high";
          document.head.insertBefore(link, document.head.firstChild);
        }
      }
    }
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((p) => (p + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((p) => (p - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const next = useCallback(() => {
    setCurrent((p) => (p + 1) % slides.length);
  }, [slides.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
  };

  const slide = slides[current];
  const bgColor = slide?.bg_color || "hsl(152 20% 94%)";
  const bannerImage = slide?.bg_image_url || slide?.image_url || null;

  if (!slide) {
    return (
      <section className="section-container py-3 sm:py-5 lg:py-7" style={{ minHeight: "clamp(140px, 25vw, 280px)" }}>
        <div className="w-full aspect-[16/7] sm:aspect-[16/6] lg:aspect-[16/5.5] xl:aspect-[16/5] rounded-2xl sm:rounded-[24px] lg:rounded-[28px] bg-muted animate-pulse" />
      </section>
    );
  }

  return (
    <section className="section-container py-3 sm:py-5 lg:py-7" style={{ contain: "layout style", minHeight: "clamp(140px, 25vw, 280px)" }}>
      <div className="relative">
        <div
          className="luxe-card relative overflow-hidden rounded-2xl sm:rounded-[24px] lg:rounded-[28px] transition-colors duration-700 ease-luxe"
          style={{ backgroundColor: bgColor, boxShadow: "var(--shadow-luxe)" }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Gold corner ornaments */}
          <span aria-hidden className="pointer-events-none absolute top-3 left-3 w-5 h-5 sm:w-6 sm:h-6 border-l border-t border-[hsl(var(--gold)/0.55)] rounded-tl-md z-10" />
          <span aria-hidden className="pointer-events-none absolute top-3 right-3 w-5 h-5 sm:w-6 sm:h-6 border-r border-t border-[hsl(var(--gold)/0.55)] rounded-tr-md z-10" />
          <span aria-hidden className="pointer-events-none absolute bottom-3 left-3 w-5 h-5 sm:w-6 sm:h-6 border-l border-b border-[hsl(var(--gold)/0.55)] rounded-bl-md z-10" />
          <span aria-hidden className="pointer-events-none absolute bottom-3 right-3 w-5 h-5 sm:w-6 sm:h-6 border-r border-b border-[hsl(var(--gold)/0.55)] rounded-br-md z-10" />

          {bannerImage ? (
            <Link
              to={slide?.link || "/"}
              className="block premium-image relative w-full aspect-[16/7] sm:aspect-[16/6] lg:aspect-[16/5.5] xl:aspect-[16/5] cursor-pointer"
              aria-label={slide?.title || "Banner"}
            >
              <img
                src={getOptimizedCloudinaryUrl(bannerImage, typeof window !== "undefined" && window.innerWidth < 640 ? 720 : 1280)}
                alt={slide?.title || "Banner"}
                className="absolute inset-0 h-full w-full object-cover"
                fetchPriority="high"
                decoding="async"
                loading="eager"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 95vw, 1280px"
              />
            </Link>
          ) : (
            <div className="relative w-full aspect-[16/7] sm:aspect-[16/6] lg:aspect-[16/5.5] xl:aspect-[16/5] bg-muted/30" />
          )}

          {slides.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 z-20 min-w-11 min-h-11 w-11 h-11 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-full bg-card/80 backdrop-blur-md shadow-soft border border-[hsl(var(--gold)/0.30)] flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-card hover:border-[hsl(var(--gold)/0.6)] transition-all duration-500 ease-luxe"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={next}
                className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 z-20 min-w-11 min-h-11 w-11 h-11 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-full bg-card/80 backdrop-blur-md shadow-soft border border-[hsl(var(--gold)/0.30)] flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-card hover:border-[hsl(var(--gold)/0.6)] transition-all duration-500 ease-luxe"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4 sm:w-4 sm:h-4" />
              </button>
            </>
          )}
        </div>

        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-2.5 mt-3 sm:mt-4">
            <span className="text-[10px] text-muted-foreground/60 font-semibold tabular-nums tracking-widest">
              {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </span>
            <div className="flex items-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    "h-1 rounded-full transition-all duration-700 ease-luxe",
                    i === current
                      ? "bg-gradient-gold w-6"
                      : "bg-border w-1.5 hover:bg-muted-foreground/40"
                  )}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
});

HeroSection.displayName = "HeroSection";

export default HeroSection;
