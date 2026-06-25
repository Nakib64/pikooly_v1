import { useSiteSettings } from "@/hooks/useSiteSettings";
import SEOHead from "@/components/seo/SEOHead";

interface Props {
  prefix: "refundpage" | "privacypage" | "termspage";
  defaultTitle: string;
  defaultSubtitle: string;
  defaultContent: string;
  path: string;
}

const PolicyPage = ({ prefix, defaultTitle, defaultSubtitle, defaultContent, path }: Props) => {
  const { settings } = useSiteSettings();
  const title = settings[`${prefix}_title`] || defaultTitle;
  const subtitle = settings[`${prefix}_subtitle`] || defaultSubtitle;
  const content = settings[`${prefix}_content`] || defaultContent;

  return (
    <main className="pb-2 md:pb-4">
      <SEOHead
        title={`${title} — ${settings.site_title || "Pikooly"}`}
        description={subtitle}
        canonical={typeof window !== "undefined" ? `${window.location.origin}${path}` : undefined}
      />
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-primary/5 overflow-hidden">
        <div className="section-container page-section-hero">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground leading-tight mb-3">
              {title}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {subtitle}
            </p>
          </div>
        </div>
      </section>
      <section className="section-container page-section">
        <div className="max-w-4xl mx-auto bg-card border border-border rounded-2xl p-6 sm:p-8 md:p-10">
          <div
            className="rich-text-content text-sm sm:text-base text-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </section>
    </main>
  );
};

export default PolicyPage;
