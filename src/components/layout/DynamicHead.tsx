import { useEffect, useRef } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const DynamicHead = () => {
  const { settings, isLoading } = useSiteSettings();
  const injectedRef = useRef<{ ga?: boolean; pixel?: boolean; gtm?: boolean; clarity?: boolean }>({});
  const prevSettingsRef = useRef<Record<string, string>>({});

  const isHomepage = typeof window !== "undefined" ? window.location.pathname === "/" : false;

  useEffect(() => {
    if (isLoading) return;

    // Always update favicon — remove all existing icon links to avoid
    // the static index.html /favicon.ico overriding the admin-uploaded one.
    const faviconUrl = settings.company_favicon?.trim();
    if (faviconUrl) {
      const existing = document.querySelectorAll(
        "link[rel='icon'], link[rel~='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']"
      );
      existing.forEach((el) => el.parentNode?.removeChild(el));

      const cacheBusted = faviconUrl.includes("?")
        ? faviconUrl
        : `${faviconUrl}?v=${Date.now()}`;

      const icon = document.createElement("link");
      icon.rel = "icon";
      icon.href = cacheBusted;
      document.head.appendChild(icon);

      const apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      apple.href = cacheBusted;
      document.head.appendChild(apple);
    }

    // Update title: always apply site_title on homepage or when no page-specific title is set
    const siteTitle = settings.site_title?.trim();
    if (siteTitle) {
      const currentTitle = document.title?.trim();
      const prevSiteTitle = prevSettingsRef.current.site_title?.trim();
      const isDefaultTitle = !currentTitle || currentTitle === "Pikooly";
      const settingsChanged = prevSiteTitle && prevSiteTitle !== siteTitle;

      if (isDefaultTitle || isHomepage || settingsChanged) {
        document.title = settings.homepage_seo_title?.trim() || siteTitle;
      }
    }

    // Update meta description
    const siteDescription = settings.homepage_meta_description?.trim();
    if (siteDescription) {
      let descMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!descMeta) {
        descMeta = document.createElement("meta");
        descMeta.name = "description";
        document.head.appendChild(descMeta);
      }
      const prevDesc = prevSettingsRef.current.homepage_meta_description?.trim();
      const isDefault = !descMeta.content || descMeta.content === "Fresh flowers, gifts, and cakes delivered across Bangladesh.";
      if (isDefault || isHomepage || (prevDesc && prevDesc !== siteDescription)) {
        descMeta.content = siteDescription.slice(0, 160);
      }
    }

    // Store current settings for next comparison
    prevSettingsRef.current = { ...settings };
  }, [settings, isLoading, isHomepage]);

  useEffect(() => {
    const gaId = settings.google_analytics_id;
    if (!gaId || injectedRef.current.ga) return;
    injectedRef.current.ga = true;

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);

    const inline = document.createElement("script");
    inline.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    `;
    document.head.appendChild(inline);
  }, [settings.google_analytics_id]);

  useEffect(() => {
    const pixelId = settings.facebook_pixel_id;
    if (!pixelId || injectedRef.current.pixel) return;
    injectedRef.current.pixel = true;

    const inline = document.createElement("script");
    inline.textContent = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(inline);
  }, [settings.facebook_pixel_id]);

  useEffect(() => {
    const gtmId = settings.google_tag_manager_id;
    if (!gtmId || injectedRef.current.gtm) return;
    injectedRef.current.gtm = true;

    const inline = document.createElement("script");
    inline.textContent = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${gtmId}');
    `;
    document.head.appendChild(inline);
  }, [settings.google_tag_manager_id]);

  useEffect(() => {
    const clarityId = settings.microsoft_clarity_id;
    if (!clarityId || injectedRef.current.clarity) return;
    injectedRef.current.clarity = true;

    const inline = document.createElement("script");
    inline.textContent = `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/${clarityId}";
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${clarityId}");
    `;
    document.head.appendChild(inline);
  }, [settings.microsoft_clarity_id]);

  return null;
};

export default DynamicHead;
