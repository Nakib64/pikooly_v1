import { Link } from "@/lib/router-adapter";
import { useAdConsent } from "@/hooks/useAdConsent";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { isValidAdsensePublisherId } from "@/hooks/useAdConsent";
import { Cookie, X } from "lucide-react";

/**
 * GDPR-style consent banner shown when AdSense is enabled, the publisher ID
 * is valid, and the visitor has not made a choice yet. Ads only load after
 * the visitor clicks "Accept".
 */
const AdConsentBanner = () => {
  const { settings } = useSiteSettings();
  const { decided, accept, decline } = useAdConsent();

  const enabled = settings.adsense_enabled === "true";
  const validPub = isValidAdsensePublisherId(settings.adsense_publisher_id);

  if (!enabled || !validPub || decided) return null;

  const summary =
    settings.cookies_summary?.trim() ||
    "We use cookies to personalize content and ads, and to analyze traffic. Click Accept to allow advertising cookies (Google AdSense).";

  return (
    <div
      role="dialog"
      aria-label="Cookie & Ads consent"
      className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-md z-[100] rounded-xl border border-border bg-background/95 backdrop-blur shadow-2xl"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Cookie size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Your privacy choices</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {summary}{" "}
            <Link to="/privacy-policy" className="underline hover:text-primary">
              Learn more
            </Link>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={accept}
              className="px-4 h-9 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition"
            >
              Accept all
            </button>
            <button
              onClick={decline}
              className="px-4 h-9 rounded-md border border-border text-foreground text-xs font-semibold hover:bg-muted transition"
            >
              Reject
            </button>
          </div>
        </div>
        <button
          onClick={decline}
          aria-label="Dismiss"
          className="shrink-0 text-muted-foreground hover:text-foreground transition"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default AdConsentBanner;
