import { useEffect, useRef } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAdConsent, isValidAdsensePublisherId } from "@/hooks/useAdConsent";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

const SCRIPT_ID = "google-adsense-script";

/** Detect preview / local dev domains where real AdSense won't load */
const isPreviewDomain = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host.startsWith("127.") ||
    host.startsWith("192.168.") ||
    host.includes(".vercel.app")
  );
};

const trackAdEvent = (
  event_type: "impression" | "click",
  placement: string,
  slot_id: string,
) => {
  // Best-effort fire-and-forget; never block render
  try {
    const page_path =
      typeof window !== "undefined" ? window.location.pathname.slice(0, 500) : null;
    supabase
      .from("ad_events")
      .insert({
        event_type,
        placement: placement.slice(0, 80),
        page_path,
        slot_id: slot_id ? slot_id.slice(0, 40) : null,
      })
      .then(() => {}, () => {});
  } catch {
    // ignore
  }
};

/**
 * Injects the AdSense loader script once, when enabled in admin settings,
 * publisher ID is valid, and the visitor has accepted cookies/ads consent.
 */
export const AdSenseScript = () => {
  const { settings } = useSiteSettings();
  const { accepted } = useAdConsent();
  const enabled = settings.adsense_enabled === "true";
  const pubId = (settings.adsense_publisher_id || "").trim();
  const validPub = isValidAdsensePublisherId(pubId);
  const autoAds = settings.adsense_auto_ads_enabled === "true";

  useEffect(() => {
    if (!enabled || !validPub || !accepted) return;
    if (document.getElementById(SCRIPT_ID)) return;

    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(pubId)}`;
    s.setAttribute("data-ad-client", pubId);
    document.head.appendChild(s);

    if (autoAds) {
      s.onload = () => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({
            google_ad_client: pubId,
            enable_page_level_ads: true,
          });
        } catch {}
      };
    }
  }, [enabled, validPub, pubId, autoAds, accepted]);

  return null;
};

type AdSizeVariant = "leaderboard-box"; // 728x90 desktop / 300x250 mobile

type AdSlotProps = {
  /** Logical name for analytics (e.g. "blog_list_top", "blog_detail_inarticle") */
  placement?: string;
  /** AdSense slot ID (data-ad-slot). If empty, nothing renders. */
  slot?: string;
  format?: string;
  responsive?: boolean;
  layout?: string;
  layoutKey?: string;
  className?: string;
  style?: React.CSSProperties;
  /**
   * When set, renders a fixed-size responsive ad unit:
 *  - "leaderboard-box" → 728x90 on desktop (md+) and short full-width banner on mobile.
   * Overrides `format` / `responsive` / `layout`.
   */
  sizeVariant?: AdSizeVariant;
};

/**
 * Renders one AdSense ad unit. Hidden when AdSense is disabled, the
 * publisher ID is invalid, no slot is configured, or consent has not
 * been accepted. Tracks impression + click events.
 * In preview/development domains, shows a placeholder so layout can be verified.
 */
export const AdSlot = ({
  placement = "unknown",
  slot,
  format = "auto",
  responsive = true,
  layout,
  layoutKey,
  className,
  style,
  sizeVariant,
}: AdSlotProps) => {
  const { settings } = useSiteSettings();
  const { accepted } = useAdConsent();
  const pushedRef = useRef(false);
  const impressionRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const enabled = settings.adsense_enabled === "true";
  const pubId = (settings.adsense_publisher_id || "").trim();
  const validPub = isValidAdsensePublisherId(pubId);
  const canShowRealAd = enabled && validPub && accepted && !!slot;

  // Lazy-load: defer ad push until slot is near viewport (improves LCP / CLS)
  useEffect(() => {
    if (!canShowRealAd || !containerRef.current) return;
    if (pushedRef.current && impressionRef.current) return;

    const el = containerRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            // Push ad request only when nearing viewport
            if (!pushedRef.current) {
              const attempt = () => {
                try {
                  (window.adsbygoogle = window.adsbygoogle || []).push({});
                  pushedRef.current = true;
                } catch {
                  setTimeout(attempt, 600);
                }
              };
              attempt();
            }
            // Track impression
            if (!impressionRef.current) {
              impressionRef.current = true;
              trackAdEvent("impression", placement, slot || "");
            }
            io.disconnect();
          }
        }
      },
      { rootMargin: "200px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [canShowRealAd, placement, slot]);

  // Responsive fixed variant: short full-width banner on mobile, 728x90 on desktop (md+)
  const isFixedVariant = sizeVariant === "leaderboard-box";

  // Real ad
  if (canShowRealAd) {
    const handleClick = () => {
      trackAdEvent("click", placement, slot || "");
    };

    if (isFixedVariant) {
      return (
        <div
          ref={containerRef}
          onClickCapture={handleClick}
          className={className}
          style={{ textAlign: "center", margin: "0.5rem 0", maxWidth: "100%", overflow: "hidden", ...style }}
          data-ad-placement={placement}
        >
          <ins
            className="adsbygoogle block w-full h-[90px]"
            style={{ display: "inline-block" }}
            data-ad-client={pubId}
            data-ad-slot={slot}
            data-full-width-responsive="false"
            data-loading="lazy"
          />
        </div>
      );
    }


    return (
      <div
        ref={containerRef}
        onClickCapture={handleClick}
        className={className}
        style={{ textAlign: "center", margin: "0.5rem 0", maxWidth: "100%", overflow: "hidden", ...style }}
        data-ad-placement={placement}
      >
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", maxWidth: "100%" }}
          data-ad-client={pubId}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? "true" : "false"}
          data-loading="lazy"
          {...(layout ? { "data-ad-layout": layout } : {})}
          {...(layoutKey ? { "data-ad-layout-key": layoutKey } : {})}
        />
      </div>
    );
  }

  // Honor the admin Enable/Disable toggle: when AdSense is disabled,
  // render nothing — no placeholder, no script — so the toggle visibly works.
  if (!enabled) return null;

  // Preview placeholder: visible only on dev/preview domains so layout can be tested
  if (isPreviewDomain()) {
    const reasons: string[] = [];
    if (!validPub) reasons.push(`Invalid/missing Publisher ID${pubId ? ` "${pubId}"` : ""}`);
    if (!accepted) reasons.push("Consent not accepted");
    if (!slot) reasons.push("No ad slot ID configured");

    if (isFixedVariant) {
      return (
        <div
          ref={containerRef}
          className={className}
          style={{ textAlign: "center", margin: "0.5rem 0", maxWidth: "100%", overflow: "hidden", ...style }}
          data-ad-placement={placement}
        >
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/40 px-4 w-full h-[90px]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
              Ad Placeholder · Responsive 90px
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">{placement}</p>
            <p className="text-[10px] text-destructive/60 mt-1 leading-relaxed">
              {reasons.join(" · ")}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          textAlign: "center",
          margin: "0.5rem 0",
          maxWidth: "100%",
          overflow: "hidden",
          ...style,
        }}
        data-ad-placement={placement}
      >
        <div
          className="mx-auto rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/40 px-4 py-6"
          style={{
            width: "100%",
            maxWidth: "100%",
            minHeight: format === "fluid" || layout === "in-article" ? 120 : 90,
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Ad Placeholder
          </p>
          <p className="text-[10px] text-muted-foreground/50 mt-1">
            {placement}
          </p>
          <p className="text-[10px] text-destructive/60 mt-1.5 leading-relaxed">
            {reasons.join(" · ")}
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default AdSlot;
