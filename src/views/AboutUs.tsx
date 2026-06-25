"use client";
import { motion } from "framer-motion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Phone, Globe, Heart, Truck, ShieldCheck, Leaf, Star, Users, Target, Gift } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import SEOHead from "@/components/seo/SEOHead";
import founderImgDefault from "@/assets/founder-ripon.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

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

const valueIcons = [Leaf, ShieldCheck, Truck, Heart];

const AboutUs = () => {
  const { settings } = useSiteSettings();

  const s = (key: string, fallback: string) => settings[key] || fallback;

  const heroTitle = s("aboutpage_hero_title", "Your Trusted Online Flower Shop in Bangladesh");
  const heroSubtitle = s("aboutpage_hero_subtitle", "Fresh flowers, beautiful bouquets, and reliable same-day delivery across Dhaka and Bangladesh.");
  const welcomeText = s("aboutpage_welcome_text", "Pikooly is an online flower, cake, and gift delivery platform serving customers across the country. We help people share love, care, and emotions through fresh flowers and thoughtful gifts. Our service focuses on quality, freshness, clear pricing, and reliable delivery to make every moment simple and meaningful.");
  const tagline = s("aboutpage_tagline", "Pikooly – Bringing Blooms, Spreading Smiles.");
  const founderName = s("aboutpage_founder_name", "Md Ripon");
  const founderTitle = s("aboutpage_founder_title", "Founder & CEO");
  const founderDesc = s("aboutpage_founder_desc", "Pikooly was founded by Md Ripon, an entrepreneur from Bangladesh with a strong interest in digital business and customer-focused service. The idea behind Pikooly was simple: create a trusted online platform where people can send flowers and gifts without confusion or stress.");
  const founderImg = settings.aboutpage_founder_image || founderImgDefault;
  const whoWeAre1 = s("aboutpage_whoweare_1", "Pikooly is built in Bangladesh and serves customers across Dhaka and other major cities. We work with local flower suppliers and trusted partners to ensure that every bouquet and gift is prepared with care.");
  const whoWeAre2 = s("aboutpage_whoweare_2", "We believe that flowers are not just products. They are messages. A lily bouquet can express respect. A rose can show love. A simple gift can brighten someone's day. That belief guides everything we do.");

  const values = [
    { icon: valueIcons[0], title: s("aboutpage_value_1_title", "Freshness First"), desc: s("aboutpage_value_1_desc", "Every flower is hand-picked and arranged fresh for your order.") },
    { icon: valueIcons[1], title: s("aboutpage_value_2_title", "Price Transparency"), desc: s("aboutpage_value_2_desc", "Clear, honest pricing with no hidden charges ever.") },
    { icon: valueIcons[2], title: s("aboutpage_value_3_title", "Reliable Delivery"), desc: s("aboutpage_value_3_desc", "Same-day delivery across Dhaka with careful handling.") },
    { icon: valueIcons[3], title: s("aboutpage_value_4_title", "Customer Trust"), desc: s("aboutpage_value_4_desc", "We value long-term relationships over short-term sales.") },
  ];

  const missionIntro = s("aboutpage_mission_intro", "Our mission is to help people in Bangladesh express feelings in a simple and dependable way. We aim to:");
  const missionItems = [
    s("aboutpage_mission_item_1", "Deliver fresh flowers on time"),
    s("aboutpage_mission_item_2", "Offer clear and fair pricing"),
    s("aboutpage_mission_item_3", "Keep the ordering process easy"),
    s("aboutpage_mission_item_4", "Maintain trust with every customer"),
  ].filter(Boolean);
  const missionClosing = s("aboutpage_mission_closing", "Whether it is a birthday, anniversary, apology, or a quiet personal moment, Pikooly is here to help you send the right message.");

  const offerings = [
    s("aboutpage_offering_1", "Fresh flower bouquets (Rose, Lily, Tulip, Mixed)"),
    s("aboutpage_offering_2", "Same-day flower delivery in Dhaka"),
    s("aboutpage_offering_3", "Next-day flower delivery across Bangladesh"),
    s("aboutpage_offering_4", "Cakes and desserts from trusted bakeries"),
    s("aboutpage_offering_5", "Gift hampers and combo packages"),
    s("aboutpage_offering_6", "Occasion-based gifts for birthdays & anniversaries"),
  ].filter(Boolean);

  const processSteps = [
    { icon: Leaf, label: "Flowers selected fresh" },
    { icon: Star, label: "Bouquets arranged neatly" },
    { icon: Gift, label: "Orders packed safely" },
    { icon: Truck, label: "Delivered with care" },
  ];

  const servingText = s("aboutpage_serving_text", "Pikooly primarily serves Dhaka and selected cities across Bangladesh. We continue to improve our delivery coverage and service standards to reach more customers reliably.");
  const contactPhone = s("aboutpage_contact_phone", "+8801410244421");
  const contactWebsite = s("aboutpage_contact_website", "https://pikooly.com.bd");
  const contactWebsiteLabel = s("aboutpage_contact_website_label", "pikooly.com.bd");

  return (
    <main className="pb-2 md:pb-4">
      <SEOHead
        title={`About Us — ${s("site_title", "Pikooly")}`}
        description={heroSubtitle}
        canonical={typeof window !== "undefined" ? `${window.location.origin}/about-us` : undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About Pikooly",
          url: typeof window !== "undefined" ? `${window.location.origin}/about-us` : "https://pikooly.com.bd/about-us",
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
              About Pikooly
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
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      </section>

      {/* Welcome */}
      <section className="section-container page-section">
        <SectionBlock className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 md:p-10 space-y-4">
            <h2 className="text-[16px] leading-[24px] md:text-[24px] md:leading-[36px] font-display font-semibold text-foreground">
              Welcome to Pikooly
            </h2>
            <div className="text-sm sm:text-base text-muted-foreground leading-relaxed rich-text-content" dangerouslySetInnerHTML={{ __html: welcomeText }} />
            <p className="text-sm sm:text-base font-medium text-primary italic">
              {tagline}
            </p>
          </div>
        </SectionBlock>
      </section>

      {/* Founder */}
      <section className="bg-muted/30">
        <div className="section-container page-section">
          <SectionBlock className="max-w-4xl mx-auto">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8 p-6 sm:p-8 md:p-10">
                <div className="shrink-0">
                  <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-2xl overflow-hidden border-4 border-primary/20 shadow-lg">
                    <img
                      src={typeof founderImg === "string" ? founderImg : founderImg.src}
                      alt={`${founderName} – ${founderTitle} of Pikooly`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
                <div className="text-center md:text-left space-y-3">
                  <span className="inline-block text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {founderTitle}
                  </span>
                  <h2 className="text-[16px] leading-[24px] md:text-[24px] md:leading-[36px] font-display font-semibold text-foreground">
                    {founderName}
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {founderDesc}
                  </p>
                </div>
              </div>
            </div>
          </SectionBlock>
        </div>
      </section>

      {/* Who We Are */}
      <section className="section-container page-section">
        <SectionBlock className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-primary" />
            <h2 className="text-[16px] leading-[24px] md:text-[24px] md:leading-[36px] font-display font-semibold text-foreground">
              Who We Are
            </h2>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{whoWeAre1}</p>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{whoWeAre2}</p>
        </SectionBlock>
      </section>

      {/* Core Values */}
      <section className="bg-muted/30">
        <div className="section-container page-section">
          <SectionBlock className="text-center mb-8">
            <h2 className="text-[16px] leading-[24px] md:text-[24px] md:leading-[36px] font-display font-semibold text-foreground">
              Why Customers Choose Pikooly
            </h2>
          </SectionBlock>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-5xl mx-auto">
            {values.map((item, i) => (
              <motion.div
                key={item.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-card border border-border rounded-xl p-5 sm:p-6 text-center hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1.5">{item.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="section-container page-section">
        <SectionBlock className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-primary" />
            <h2 className="text-[16px] leading-[24px] md:text-[24px] md:leading-[36px] font-display font-semibold text-foreground">
              Our Mission
            </h2>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">{missionIntro}</p>
          <ul className="space-y-2.5">
            {missionItems.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm sm:text-base text-muted-foreground">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mt-4">{missionClosing}</p>
        </SectionBlock>
      </section>

      {/* What We Offer */}
      <section className="bg-muted/30">
        <div className="section-container page-section">
          <SectionBlock className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-6 h-6 text-primary" />
              <h2 className="text-[16px] leading-[24px] md:text-[24px] md:leading-[36px] font-display font-semibold text-foreground">
                What We Offer
              </h2>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
              Pikooly provides a wide range of gifting options, including:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {offerings.map((item) => (
                <div key={item} className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3">
                  <Star className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm sm:text-base text-foreground">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mt-4">
              We regularly update our collections and price guides so customers can make informed choices.
            </p>
          </SectionBlock>
        </div>
      </section>

      {/* How We Work */}
      <section className="section-container page-section">
        <SectionBlock className="max-w-4xl mx-auto text-center">
          <h2 className="text-[16px] leading-[24px] md:text-[24px] md:leading-[36px] font-display font-semibold text-foreground mb-6">
            How We Work
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {processSteps.map((step, i) => (
              <motion.div
                key={step.label}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center relative">
                  <step.icon className="w-6 h-6 text-primary" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-medium text-foreground text-center">{step.label}</span>
              </motion.div>
            ))}
          </div>
        </SectionBlock>
      </section>

      {/* Serving Bangladesh */}
      <section className="bg-muted/30">
        <div className="section-container page-section">
          <SectionBlock className="max-w-4xl mx-auto text-center space-y-3">
            <h2 className="text-[16px] leading-[24px] md:text-[24px] md:leading-[36px] font-display font-semibold text-foreground">
              Serving Bangladesh
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">{servingText}</p>
          </SectionBlock>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="section-container page-section">
        <SectionBlock className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 sm:p-8 md:p-10 text-center space-y-5">
            <h2 className="text-[16px] leading-[24px] md:text-[24px] md:leading-[36px] font-display font-semibold text-foreground">
              Get in Touch
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              If you have questions about our services, pricing, or delivery, we are always happy to help.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <a
                href={`tel:${contactPhone}`}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                <Phone className="w-4 h-4" />
                {contactPhone}
              </a>
              <a
                href={contactWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-muted transition-colors"
              >
                <Globe className="w-4 h-4" />
                {contactWebsiteLabel}
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              Service Type: Online Flower & Gift Delivery in Bangladesh
            </p>
          </div>
        </SectionBlock>
      </section>
    </main>
  );
};

export default AboutUs;
