import { motion } from "framer-motion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Phone, Mail, MapPin, MessageCircle, Globe, Clock } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import SEOHead from "@/components/seo/SEOHead";

const SectionBlock = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { ref, isVisible } = useScrollAnimation();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const ContactUs = () => {
  const { settings } = useSiteSettings();
  const s = (key: string, fallback: string) => settings[key] || fallback;

  const heroTitle = s("contactpage_hero_title", "Contact Us");
  const heroSubtitle = s("contactpage_hero_subtitle", "Have a query? Need assistance? Simply reach out for answers. We love staying in touch with you!");
  const whatsappNumber = s("contactpage_whatsapp", "+8801410244421");
  const whatsappText = s("contactpage_whatsapp_text", "Fastest way to reach us.");
  const email = settings.contactpage_email || settings.store_email || "hello.pikooly@gmail.com";
  const phone1 = settings.contactpage_phone_1 || settings.store_phone || "+8801410244421";
  const phone2 = s("contactpage_phone_2", "");
  const phoneHours = s("contactpage_phone_hours", "9 AM to 10 PM throughout the week");
  const address = settings.contactpage_address || settings.store_address || "House 95, Road 06, Sector 9, Uttara, Dhaka 1230";
  const websiteUrl = settings.contactpage_website_url || settings.company_website || "https://pikooly.com.bd";
  const websiteLabel = settings.contactpage_website_label || settings.company_website?.replace(/^https?:\/\//, '') || "pikooly.com.bd";

  const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, "");

  const socialLinks = [
    { key: "facebook_url", icon: "facebook" },
    { key: "instagram_url", icon: "instagram" },
    { key: "youtube_url", icon: "youtube" },
    { key: "twitter_url", icon: "twitter" },
    { key: "linkedin_url", icon: "linkedin" },
    { key: "tiktok_url", icon: "tiktok" },
  ];

  const activeSocials = socialLinks.filter((s) => settings[s.key]);

  return (
    <main className="pb-2 md:pb-4">
      <SEOHead
        title={`Contact Us — ${s("site_title", "Pikooly")}`}
        description={heroSubtitle}
        canonical={typeof window !== "undefined" ? `${window.location.origin}/contact-us` : undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "Contact Pikooly",
          url: typeof window !== "undefined" ? `${window.location.origin}/contact-us` : "https://pikooly.com.bd/contact-us",
          description: heroSubtitle,
        }}
      />
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-primary/5 overflow-hidden">
        <div className="section-container page-section-hero">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <span className="inline-block text-xs sm:text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
              Get in Touch
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground leading-tight mb-4">
              {heroTitle}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {heroSubtitle}
            </p>
          </motion.div>
        </div>
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      </section>

      {/* Contact Cards */}
      <section className="section-container page-section">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* WhatsApp */}
          <SectionBlock>
            <a
              href={`https://wa.me/${cleanWhatsapp}?text=Hi%20Pikooly!%20I'd%20like%20to%20know%20more`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-card border-l-4 border-l-[hsl(142,70%,45%)] border border-border rounded-xl p-5 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[hsl(142,70%,45%)]/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-[hsl(142,70%,45%)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">
                    {whatsappText}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    WhatsApp us at <span className="font-medium text-foreground">{whatsappNumber}</span>
                  </p>
                </div>
              </div>
            </a>
          </SectionBlock>

          {/* Email */}
          <SectionBlock>
            <div className="bg-card border-l-4 border-l-primary border border-border rounded-xl p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">Email:</h3>
                  <a href={`mailto:${email}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {email}
                  </a>
                </div>
              </div>
            </div>
          </SectionBlock>

          {/* Phone */}
          <SectionBlock>
            <div className="bg-card border-l-4 border-l-primary border border-border rounded-xl p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">Phone:</h3>
                  <a href={`tel:${phone1}`} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                    {phone1}
                  </a>
                  {phone2 && (
                    <a href={`tel:${phone2}`} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                      {phone2}
                    </a>
                  )}
                  {phoneHours && (
                    <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ({phoneHours})
                    </p>
                  )}
                </div>
              </div>
            </div>
          </SectionBlock>

          {/* Address */}
          <SectionBlock>
            <div className="bg-card border-l-4 border-l-primary border border-border rounded-xl p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">Address:</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{address}</p>
                </div>
              </div>
            </div>
          </SectionBlock>

          {/* Website */}
          {websiteUrl && (
            <SectionBlock>
              <div className="bg-card border-l-4 border-l-primary border border-border rounded-xl p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">Website:</h3>
                    <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {websiteLabel}
                    </a>
                  </div>
                </div>
              </div>
            </SectionBlock>
          )}

          {/* Socials */}
          {activeSocials.length > 0 && (
            <SectionBlock>
              <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
                <h3 className="font-semibold text-sm sm:text-base text-foreground mb-3">Socials:</h3>
                <div className="flex items-center gap-3 flex-wrap">
                  {activeSocials.map((social) => (
                    <a
                      key={social.key}
                      href={settings[social.key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                      aria-label={social.icon}
                    >
                      <span className="text-xs font-medium capitalize">{social.icon.charAt(0).toUpperCase()}</span>
                    </a>
                  ))}
                </div>
              </div>
            </SectionBlock>
          )}
        </div>
      </section>

      {/* Service note */}
      <section className="bg-muted/30">
        <div className="section-container page-section-sm">
          <SectionBlock className="max-w-3xl mx-auto text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Service Type: Online Flower & Gift Delivery in Bangladesh
            </p>
          </SectionBlock>
        </div>
      </section>
    </main>
  );
};

export default ContactUs;
