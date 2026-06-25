import { memo, useState, useRef, useEffect } from "react";

import { Link, useLocation } from "@/lib/router-adapter";
import { Facebook, Instagram, Twitter, Youtube, Linkedin, Send, Plus, Minus, Heart } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface FooterCat { name: string; slug: string }

const Footer = memo(() => {
  const { settings } = useSiteSettings();
  const { t } = useLanguage();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggleSection = (s: string) => setOpenSection(prev => (prev === s ? null : s));

  const col1Ref = useRef<HTMLUListElement>(null);
  const col2Ref = useRef<HTMLUListElement>(null);
  const [heights, setHeights] = useState({ c1: 0, c2: 0 });

  if (location.pathname === "/cart") return null;

  const storeName = settings.store_name || "Pikooly";
  const rawCopyright = settings.site_copyright || `Copyright © ${new Date().getFullYear()} ${storeName} All Rights Reserved.`;
  const copyright = rawCopyright.replace(/\s*\blogo\b\s*/gi, " ").replace(/\s+/g, " ").trim();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("newsletter_subscribers").insert({ email: email.trim().toLowerCase() });
      if (error) {
        if (error.code === "23505") toast.info("You're already subscribed!");
        else throw error;
      } else {
        toast.success("Successfully subscribed!");
        setEmail("");
      }
    } catch {
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Links — fixed 7 links per spec
  const quickLinks = [
    { label: "About Us", url: "/about-us" },
    { label: "Contact Us", url: "/contact-us" },
    { label: "Affiliate Program", url: "/affiliate" },
    { label: "Sitemap", url: "/sitemap.html" },
    { label: "Refund & Return", url: "/refund-policy" },
    { label: "Privacy Policy", url: "/privacy-policy" },
    { label: "Terms & Conditions", url: "/terms-conditions" },
  ];
  const toLocalUrl = (u: string) => {
    if (!u) return "#";
    try {
      const parsed = new URL(u, window.location.origin);
      return parsed.origin === window.location.origin || u.startsWith("http")
        ? (parsed.origin === window.location.origin ? parsed.pathname + parsed.search + parsed.hash : u)
        : u;
    } catch { return u; }
  };
  let categoryLinks: { label: string; url: string }[] = [];
  try {
    const raw = settings.footer_categories;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        categoryLinks = parsed
          .map((i: any) => ({ label: String(i?.label || ""), url: toLocalUrl(String(i?.url || "")) }))
          .filter((l) => l.label && l.url && l.url !== "#");
      }
    }
  } catch { /* ignore */ }
  if (categoryLinks.length === 0) {
    categoryLinks = [1, 2, 3, 4]
      .map((i) => ({
        label: settings[`footer_category_${i}_label`] || "",
        url: toLocalUrl(settings[`footer_category_${i}_url`] || ""),
      }))
      .filter((l) => l.label && l.url && l.url !== "#");
  }

  const socialLinks = [
    { icon: Facebook, url: settings.facebook_url, label: "Facebook", color: "#1877F2" },
    { icon: Twitter, url: settings.twitter_url, label: "Twitter", color: "#000000" },
    { icon: Youtube, url: settings.youtube_url, label: "YouTube", color: "#FF0000" },
    { icon: Instagram, url: settings.instagram_url, label: "Instagram", color: "#E4405F" },
    { icon: Linkedin, url: settings.linkedin_url, label: "LinkedIn", color: "#0A66C2" },
  ].filter((s) => s.url);

  const paymentImages: string[] = (() => {
    try {
      const parsed = settings.footer_payment_images ? JSON.parse(settings.footer_payment_images) : [];
      return Array.isArray(parsed) ? parsed.filter((u: any) => typeof u === "string" && u) : [];
    } catch {
      return [];
    }
  })();
  const showPaymentStrip = paymentImages.length > 0;

  const renderCol = (
    id: string,
    label: string,
    refEl: React.RefObject<HTMLUListElement>,
    items: { label: string; url: string }[],
    h: number,
  ) => (
    <div className="border-b border-foreground/10 sm:border-0 last:border-0 first:pt-1 sm:first:pt-0">
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between py-3.5 sm:py-0 sm:mb-4 sm:cursor-default sm:pointer-events-none"
        aria-expanded={openSection === id}
      >
        <span className="text-[15px] font-semibold text-foreground">{label}</span>
        <span className="sm:hidden text-foreground/60" aria-hidden="true">
          {openSection === id ? <Minus size={16} /> : <Plus size={16} />}
        </span>
      </button>
      <ul
        ref={refEl}
        className={`space-y-3 sm:space-y-4 sm:!block sm:pb-0 ${openSection === id ? "block pb-4" : "hidden"}`}
      >
        {items.map((link, i) => (
          <li key={i}>
            <Link
              to={link.url || "#"}
              className="text-[15px] text-foreground/80 hover:text-[hsl(var(--gold))] transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className="relative pb-[72px] md:pb-0" style={{ contain: "layout style" }}>
      {/* Main Footer — Light card (FNP style) */}

      <div className="bg-muted/40">
        <div className="section-container pt-2 pb-6 sm:py-10">
          <div className="rounded-2xl bg-muted/60 border border-foreground/5 p-4 sm:p-6 lg:p-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-0 sm:gap-8 lg:gap-10">
              {renderCol("c1", "Quick Links", col1Ref, quickLinks, heights.c1)}
              {renderCol("c2", "Categories", col2Ref, categoryLinks, heights.c2)}

              {/* App + Social */}
              <div className="flex flex-col items-center lg:items-start text-center lg:text-left pt-4 sm:pt-0 border-t border-foreground/10 sm:border-0">
                <p className="text-[15px] font-semibold text-foreground mb-3">
                  {settings.footer_app_text || "Simplify your gifting experience with our app."}
                </p>
                <div className="flex items-center gap-2 mb-6 flex-wrap justify-center lg:justify-start">
                  <a
                    href={settings.footer_app_play_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Get it on Google Play"
                    className="hover:opacity-80 transition-opacity"
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                      alt="Get it on Google Play"
                      width={108}
                      height={32}
                      className="h-8 w-auto"
                      loading="lazy"
                    />
                  </a>
                  <a
                    href={settings.footer_app_store_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download on the App Store"
                    className="hover:opacity-80 transition-opacity"
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                      alt="Download on the App Store"
                      width={96}
                      height={32}
                      className="h-8 w-auto"
                      loading="lazy"
                    />
                  </a>
                </div>

                {/* Newsletter Subscribe */}
                <form onSubmit={handleSubscribe} className="w-full max-w-sm mb-6">
                  <p className="text-[15px] font-semibold text-foreground mb-2">Subscribe & Get 10% Off</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="flex-1 h-10 px-3 rounded-md border border-foreground/15 bg-background text-[15px] text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]/40"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      aria-label="Subscribe"
                      className="h-10 px-3 rounded-md bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </form>

                {socialLinks.length > 0 && (
                  <>
                    <p className="text-[15px] font-semibold text-foreground mb-4">Spread The Love On Social Media</p>
                    <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                      {socialLinks.map(({ icon: Icon, url, label, color }, i) => (
                        <a
                          key={i}
                          href={url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={label}
                          className="w-11 h-11 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                        >
                          <Icon size={18} />
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar — Inline Copyright with Logo + Payments */}
        <div className="section-container pb-6 sm:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-2 items-center">
            <div className="hidden lg:block" />
            <div className="text-center text-xs sm:text-sm text-foreground/70 leading-6">
              <span className="inline-flex items-center align-middle whitespace-nowrap">
                <span>Copyright © {new Date().getFullYear()}</span>
                {(settings.footer_logo || settings.company_logo) ? (
                  <img
                    src={settings.footer_logo || settings.company_logo}
                    alt={storeName}
                    className="h-5 sm:h-6 w-auto object-contain inline-block align-middle mx-1"
                    loading="lazy"
                  />
                ) : (
                  <span className="font-display font-semibold text-foreground mx-1">{storeName}</span>
                )}
                <span>All rights reserved.</span>
              </span>
            </div>
            {showPaymentStrip && (
              <div className="flex flex-wrap justify-center lg:justify-end items-center gap-2">
                {paymentImages.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Payment method ${idx + 1}`}
                    className="h-7 sm:h-8 w-auto object-contain"
                    loading="lazy"
                  />
                ))}
              </div>
            )}
          </div>
        </div>



      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
