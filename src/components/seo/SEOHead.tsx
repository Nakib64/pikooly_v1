import { useEffect } from "react";

interface HreflangAlt {
  hreflang: string; // e.g. "en", "en-bd", "x-default"
  href: string;
}

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, any>;
  noindex?: boolean;
  /** Optional hreflang alternates. If omitted and canonical is set, defaults to en + x-default → canonical. */
  hreflang?: HreflangAlt[];
}

const SEOHead = ({ title, description, canonical, ogImage, ogType = "website", jsonLd, noindex, hreflang }: SEOHeadProps) => {
  useEffect(() => {
    document.title = title;

    const setMeta = (name: string, content: string, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setMeta("description", description.slice(0, 160));
    if (noindex) setMeta("robots", "noindex, nofollow");

    // Open Graph
    setMeta("og:title", title, "property");
    setMeta("og:description", description.slice(0, 160), "property");
    setMeta("og:type", ogType, "property");
    if (ogImage) setMeta("og:image", ogImage, "property");
    if (canonical) {
      setMeta("og:url", canonical, "property");
    } else {
      setMeta("og:url", window.location.href, "property");
    }

    // Twitter
    setMeta("twitter:card", ogImage ? "summary_large_image" : "summary", "name");
    setMeta("twitter:title", title, "name");
    setMeta("twitter:description", description.slice(0, 160), "name");
    if (ogImage) setMeta("twitter:image", ogImage, "name");

    // Canonical
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    // hreflang alternates (manage as a group keyed by data attribute)
    document.querySelectorAll('link[rel="alternate"][data-seo-hreflang]').forEach(el => el.remove());
    const alts: HreflangAlt[] = hreflang && hreflang.length > 0
      ? hreflang
      : (canonical ? [{ hreflang: "en", href: canonical }, { hreflang: "x-default", href: canonical }] : []);
    alts.forEach(a => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = a.hreflang;
      link.href = a.href;
      link.setAttribute("data-seo-hreflang", "1");
      document.head.appendChild(link);
    });

    // JSON-LD
    const jsonLdId = "seo-jsonld";
    let script = document.getElementById(jsonLdId) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!script) {
        script = document.createElement("script");
        script.id = jsonLdId;
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    }

    return () => {
      const el = document.getElementById(jsonLdId);
      if (el) el.remove();
      document.querySelectorAll('link[rel="alternate"][data-seo-hreflang]').forEach(node => node.remove());
    };
  }, [title, description, canonical, ogImage, ogType, jsonLd, noindex, hreflang]);

  return null;
};

export default SEOHead;
