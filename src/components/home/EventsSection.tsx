import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@/lib/router-adapter";
import { ArrowRight, Camera, CalendarDays, Clapperboard, Gift, PartyPopper, Sparkles, Users2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Lazy-load fallback images only when needed (not bundled into main chunk)
const photoEventImg = "/src/assets/photo-event.png";
const photoVideoImg = "/src/assets/photo-video.png";
const photoGiftImg = "/src/assets/photo-gift.png";

const PHOTO_FALLBACKS = [photoEventImg, photoVideoImg, photoGiftImg];

type EventShowcaseItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  imageUrl?: string | null;
  badge: string;
  icon: LucideIcon;
  panelClassName: string;
};

type PhotoShowcaseItem = {
  id: string;
  title: string;
  href: string;
  imageUrl?: string | null;
  badge: string;
  icon: LucideIcon;
  priceLabel?: string;
};

const EVENT_CARD_STYLES = [
  { badge: "Most Booked", icon: Sparkles, panelClassName: "from-primary/14 via-primary/5 to-background" },
  { badge: "Family Favorite", icon: Gift, panelClassName: "from-accent/14 via-accent/5 to-background" },
  { badge: "Corporate Ready", icon: Users2, panelClassName: "from-secondary via-muted to-background" },
  { badge: "Premium Setup", icon: CalendarDays, panelClassName: "from-primary/10 via-accent/5 to-background" },
] as const;

const EVENT_SERVICE_FALLBACKS = [
  { id: "event-birthday-setups", title: "Birthday Setups", description: "Theme décor, stage styling, lights and guest-ready arrangements.", href: "/events" },
  { id: "event-anniversary-surprises", title: "Anniversary & Surprise", description: "Romantic backdrops, entry moments and celebration flow handled beautifully.", href: "/events" },
  { id: "event-corporate-activations", title: "Corporate Activations", description: "Professional planning for launches, office events and brand experiences.", href: "/events" },
  { id: "event-wedding-engagement", title: "Wedding Functions", description: "Elegant venue coordination for holud, reception and intimate ceremonies.", href: "/events" },
] as const;

const PHOTO_SERVICE_FALLBACKS = [
  { id: "photo-product-showcase", title: "Product Photography", href: "/photography", imageUrl: photoGiftImg, badge: "Brand Ready", icon: Camera, priceLabel: "Studio Setup" },
  { id: "photo-food-storytelling", title: "Food Photography", href: "/photography", imageUrl: photoEventImg, badge: "Menu Hero", icon: Sparkles, priceLabel: "Styled Shots" },
  { id: "photo-event-coverage", title: "Event Coverage", href: "/photography", imageUrl: photoVideoImg, badge: "Live Moments", icon: PartyPopper, priceLabel: "On Location" },
  { id: "photo-video-reels", title: "Video & Reels", href: "/photography", imageUrl: photoVideoImg, badge: "Social Ready", icon: Clapperboard, priceLabel: "Short-form Edit" },
] as const;

const EventsSection = () => {
  const { data: categories = [] } = useQuery({
    queryKey: ["home-event-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("event_categories").select("*").eq("is_active", true).order("display_order").limit(4);
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: photoServices = [] } = useQuery({
    queryKey: ["home-photo-services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("photo_services").select("*").eq("is_active", true).eq("is_featured", true).order("display_order").limit(4);
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const eventCards: EventShowcaseItem[] = [
    ...categories.slice(0, 4).map((cat: any, index: number) => {
      const style = EVENT_CARD_STYLES[index % EVENT_CARD_STYLES.length];
      return {
        id: cat.id, title: cat.name,
        description: cat.short_description || cat.description || EVENT_SERVICE_FALLBACKS[index]?.description || "Thoughtful event planning.",
        href: `/events/${cat.slug}`, imageUrl: cat.image_url,
        badge: style.badge, icon: style.icon, panelClassName: style.panelClassName,
      };
    }),
    ...EVENT_SERVICE_FALLBACKS.slice(Math.min(categories.length, 4), 4).map((item, offset) => {
      const style = EVENT_CARD_STYLES[(categories.length + offset) % EVENT_CARD_STYLES.length];
      return { id: item.id, title: item.title, description: item.description, href: item.href, imageUrl: null, badge: style.badge, icon: style.icon, panelClassName: style.panelClassName };
    }),
  ].slice(0, 4);

  const photoCards: PhotoShowcaseItem[] = [
    ...photoServices.slice(0, 4).map((svc: any, index: number) => ({
      id: svc.id, title: svc.title, href: "/photography",
      imageUrl: svc.image_url || PHOTO_SERVICE_FALLBACKS[index]?.imageUrl || PHOTO_FALLBACKS[index % PHOTO_FALLBACKS.length],
      badge: PHOTO_SERVICE_FALLBACKS[index]?.badge || "Featured",
      icon: PHOTO_SERVICE_FALLBACKS[index]?.icon || Camera,
      priceLabel: svc.starting_price > 0 ? `৳${svc.starting_price.toLocaleString()}+` : PHOTO_SERVICE_FALLBACKS[index]?.priceLabel,
    })),
    ...PHOTO_SERVICE_FALLBACKS.slice(Math.min(photoServices.length, 4), 4),
  ].slice(0, 4);

  if (eventCards.length === 0 && photoCards.length === 0) return null;

  const eventCardW = "w-[41vw] sm:w-[31vw] md:w-[23vw] lg:w-auto lg:min-w-0";
  const photoCardW = "w-[42vw] sm:w-[32vw] md:w-[24vw] lg:w-auto lg:min-w-0";

  return (
    <section className="py-4 sm:py-6 md:py-8 lg:py-10">
      <div className="section-container space-y-6 md:space-y-8">
        {eventCards.length > 0 && (
          <div>
            <div className="mb-2.5 flex items-center justify-between gap-2 sm:mb-3">
              <h2 className="section-heading font-display font-bold text-foreground">Event Services</h2>
              <div className="flex items-center gap-2">
                <Link to="/events">
                  <Button variant="outline" size="sm" className="h-8 gap-1 rounded-full border-border/60 px-3 text-xs font-medium shadow-sm hover:bg-accent/40">
                    View All <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide sm:gap-3.5 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:px-0">
              {eventCards.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    className={`${eventCardW} group shrink-0 snap-start overflow-hidden rounded-[24px] border border-border/40 bg-card shadow-[0_10px_28px_-22px_hsl(var(--foreground)/0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-22px_hsl(var(--foreground)/0.28)]`}
                  >
                    <div className="relative h-[108px] overflow-hidden sm:h-[122px] md:h-[138px]">
                      <div className="absolute left-2 top-2 z-10 inline-flex max-w-[calc(100%-16px)] items-center gap-1 rounded-full border border-background/70 bg-background/95 px-2 py-1 text-[9px] font-semibold text-foreground shadow-sm backdrop-blur-sm sm:text-[10px]">
                        <Icon className="h-3 w-3 text-primary" />
                        <span className="truncate">{item.badge}</span>
                      </div>
                      {item.imageUrl ? (
                        <img
                          src={getOptimizedImageUrl(item.imageUrl, { width: 320 })}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          width={280}
                          height={180}
                        />
                      ) : (
                        <div className={`flex h-full items-center justify-center bg-gradient-to-br ${item.panelClassName}`}>
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-background/70 bg-background/90 text-primary shadow-sm">
                            <Icon className="h-5 w-5" />
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="px-2.5 pb-3 pt-2 text-center sm:px-3">
                      <p className="text-[11px] font-semibold leading-snug text-foreground line-clamp-2 sm:text-[13px]">{item.title}</p>
                      <p className="mt-1 text-[10px] leading-5 text-muted-foreground line-clamp-2">{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {photoCards.length > 0 && (
          <div>
            <div className="mb-2.5 flex items-center justify-between gap-2 sm:mb-3">
              <h2 className="section-heading font-display font-bold text-foreground">Photography</h2>
              <div className="flex items-center gap-2">
                <Link to="/photography">
                  <Button variant="outline" size="sm" className="h-8 gap-1 rounded-full border-border/60 px-3 text-xs font-medium shadow-sm hover:bg-accent/40">
                    View All <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide sm:gap-3.5 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:px-0">
              {photoCards.map((svc, i) => {
                const Icon = svc.icon;
                return (
                  <Link
                    key={svc.id}
                    to={svc.href}
                    className={`${photoCardW} group shrink-0 snap-start rounded-[26px] border border-border/40 bg-card p-3 shadow-[0_10px_28px_-22px_hsl(var(--foreground)/0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-22px_hsl(var(--foreground)/0.28)]`}
                  >
                    <div className="mb-2 inline-flex max-w-full items-center gap-1 rounded-full border border-border/50 bg-background px-2 py-1 text-[9px] font-semibold text-foreground shadow-sm sm:text-[10px]">
                      <Icon className="h-3 w-3 text-primary" />
                      <span className="truncate">{svc.badge}</span>
                    </div>

                    <div className="relative overflow-hidden rounded-[18px] bg-muted/20">
                      <img
                        src={getOptimizedImageUrl(svc.imageUrl || PHOTO_FALLBACKS[i % PHOTO_FALLBACKS.length], { width: 320 })}
                        alt={svc.title}
                        className="h-[104px] w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-[118px] md:h-[132px]"
                        loading="lazy"
                        width={260}
                        height={170}
                      />
                      {svc.priceLabel && (
                        <span className="absolute bottom-2 left-2 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow-sm">
                          {svc.priceLabel}
                        </span>
                      )}
                    </div>

                    <div className="pt-3 text-center">
                      <p className="text-[11px] font-semibold leading-snug text-foreground line-clamp-2 sm:text-[13px]">{svc.title}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default EventsSection;
