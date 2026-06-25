import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { memo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";

const getEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;

  if (url.includes("facebook.com") || url.includes("fb.watch")) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&autoplay=true`;
  }

  const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (ttMatch) return `https://www.tiktok.com/embed/v2/${ttMatch[1]}`;

  const igMatch = url.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/);
  if (igMatch) return `https://www.instagram.com/p/${igMatch[1]}/embed/`;

  return null;
};

const GiftingStories = memo(() => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["gifting-stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gifting_stories")
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

  if (isLoading && stories.length === 0) {
    return (
      <section className="py-4 sm:py-6 md:py-8 section-container">
        <div className="h-6 w-44 mb-4 rounded bg-muted animate-pulse" />
        <div className="flex gap-3 overflow-hidden pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[110px] sm:w-[130px] aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (stories.length === 0) return null;

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  const handleClick = (s: any) => {
    if (!s.video_url) return;
    const embed = getEmbedUrl(s.video_url);
    if (embed) {
      setActiveId(activeId === s.id ? null : s.id);
    } else {
      window.open(s.video_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section className="py-4 sm:py-6 md:py-8 section-container" style={{ contain: "layout style" }}>
      <div className="flex items-center gap-2 mb-4 md:mb-6">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Play size={16} className="text-primary fill-primary ml-0.5" />
        </div>
        <h2 className="display-heading text-foreground" style={{ fontSize: "clamp(1.25rem, 2.4vw + 0.5rem, 2rem)" }}>
          Shop Reel
        </h2>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-2.5 sm:gap-3 md:gap-4 overflow-x-auto scrollbar-hide scroll-smooth-ios pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory"
        >
          {stories.map((s: any) => {
            const isActive = activeId === s.id;
            const embedUrl = s.video_url ? getEmbedUrl(s.video_url) : null;

            return (
              <div
                key={s.id}
                className="relative min-w-[130px] w-[35vw] max-w-[200px] sm:min-w-[160px] md:min-w-[180px] md:w-[180px] aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden flex-shrink-0 shadow-[0_1px_4px_0_hsl(var(--foreground)/0.06)] border border-border/30 hover:shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.2)] hover:border-primary/30 transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] snap-start"
              >
                {isActive && embedUrl ? (
                  <>
                    <iframe
                      src={embedUrl}
                      className="w-full h-full border-0"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      title={s.title}
                    />
                    <button
                      onClick={() => setActiveId(null)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleClick(s)}
                    className="w-full h-full text-left group"
                  >
                    <img
                      src={s.thumbnail_url ? getOptimizedImageUrl(s.thumbnail_url, { width: 240 }) : "/placeholder.svg"}
                      alt={s.title}
                      width={200}
                      height={267}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width: 640px) 160px, (max-width: 768px) 180px, 200px"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {s.video_url && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/35 transition-colors border border-white/30">
                          <Play size={20} className="text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm sm:text-base font-semibold truncate flex items-center gap-1.5">
                        {s.label || s.title}
                        <ChevronRight size={14} className="text-white/80 flex-shrink-0" />
                      </p>
                    </div>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {stories.length > 2 && (
          <>
            <button onClick={() => scroll(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/3 w-8 h-8 rounded-full bg-card/90 shadow-md flex items-center justify-center hover:bg-muted transition-colors z-10 hidden sm:flex">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => scroll(1)} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 w-8 h-8 rounded-full bg-card/90 shadow-md flex items-center justify-center hover:bg-muted transition-colors z-10 hidden sm:flex">
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>
    </section>
  );
});

GiftingStories.displayName = "GiftingStories";
export default GiftingStories;
