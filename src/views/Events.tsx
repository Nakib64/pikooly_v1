"use client";
import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "@/lib/router-adapter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMultiCurrency } from "@/contexts/CurrencyContext";
import SEOHead from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Users, MapPin, Phone, Mail, Star, Check, ArrowRight, Sparkles, PartyPopper, Heart, Briefcase, Gift, CalendarDays, MessageCircle, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import PageBottomSEO from "@/components/seo/PageBottomSEO";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  birthday: PartyPopper,
  wedding: Heart,
  corporate: Briefcase,
  anniversary: Gift,
};

const CATEGORY_GRADIENTS = [
  "from-primary/15 via-primary/5 to-transparent",
  "from-pink-500/15 via-pink-500/5 to-transparent",
  "from-blue-500/15 via-blue-500/5 to-transparent",
  "from-amber-500/15 via-amber-500/5 to-transparent",
];

const CATEGORY_BADGES = ["Most Booked", "Elegant Choice", "Corporate Ready", "Premium"];

const Events = () => {
  const { user } = useAuth();
  const { formatPrice } = useMultiCurrency();
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<{ name: string; pkgName: string; date: string } | null>(null);
  const { settings } = useSiteSettings();
  const [submitting, setSubmitting] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const TIME_SLOTS = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00"];
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    event_date: "",
    event_time: "",
    venue_address: "",
    guest_count: "",
    special_requests: "",
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["event-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["event-packages", selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("event_packages")
        .select("*, event_categories(name, slug)")
        .eq("is_active", true)
        .order("display_order");
      if (selectedCategory) query = query.eq("category_id", selectedCategory);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Auto-open booking form when coming from category detail page
  useEffect(() => {
    const bookPkgId = searchParams.get("book");
    if (bookPkgId && packages.length > 0) {
      const pkg = packages.find((p: any) => p.id === bookPkgId);
      if (pkg) {
        setSelectedPackage(bookPkgId);
        setSelectedCategory(pkg.category_id);
        setShowBookingForm(true);
        setTimeout(() => document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth" }), 300);
      }
    }
  }, [searchParams, packages]);

  const handleBookNow = (pkgId: string) => {
    setSelectedPackage(pkgId);
    setShowBookingForm(true);
    setTimeout(() => document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name || !formData.customer_phone || !formData.event_date || !formData.venue_address) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const pkg = packages.find((p: any) => p.id === selectedPackage);
      const { error } = await supabase.from("event_bookings").insert({
        booking_number: "temp",
        user_id: user?.id || null,
        package_id: selectedPackage,
        category_id: pkg?.category_id || selectedCategory || categories[0]?.id,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email || null,
        customer_phone: formData.customer_phone,
        event_date: formData.event_date,
        event_time: formData.event_time || null,
        venue_address: formData.venue_address,
        guest_count: formData.guest_count ? parseInt(formData.guest_count) : null,
        special_requests: formData.special_requests || null,
        total: pkg?.price || 0,
      });
      if (error) throw error;
      toast.success("Booking confirmed! We will contact you shortly.");
      setBookingSuccess({ name: formData.customer_name, pkgName: pkg?.name || "Event", date: formData.event_date });
      setShowBookingForm(false);

      // Send notifications (fire & forget)
      const catName = categories.find((c: any) => c.id === (pkg?.category_id || selectedCategory))?.name;
      const emailData = {
        customerName: formData.customer_name,
        customerPhone: formData.customer_phone,
        customerEmail: formData.customer_email || undefined,
        eventDate: formData.event_date,
        eventTime: formData.event_time || undefined,
        venueAddress: formData.venue_address,
        guestCount: formData.guest_count ? parseInt(formData.guest_count) : undefined,
        specialRequests: formData.special_requests || undefined,
        packageName: pkg?.name,
        categoryName: catName,
        total: pkg?.price || 0,
      };

      import("@/lib/emailTemplates").then(({ buildAdminEventBookingEmail, buildCustomerEventBookingEmail }) => {
        // Admin email
        const adminEmail = settings.admin_notification_email || settings.store_email;
        if (adminEmail) {
          supabase.functions.invoke("send-email", {
            body: { to: adminEmail, subject: `🎉 New Event Booking - ${pkg?.name || "Event"} | Pikooly`, html: buildAdminEventBookingEmail(emailData) },
          }).catch(console.error);
        }
        // Customer confirmation email
        if (formData.customer_email) {
          supabase.functions.invoke("send-email", {
            body: { to: formData.customer_email, subject: `✅ Booking Confirmed - ${pkg?.name || "Event"} | Pikooly`, html: buildCustomerEventBookingEmail(emailData) },
          }).catch(console.error);
        }
      });

      // Admin WhatsApp notification
      const whatsappNumber = (settings.whatsapp_number || "").replace(/[^0-9]/g, "");
      if (whatsappNumber) {
        const waMsg = encodeURIComponent(
          `🎉 New Event Booking!\n\n👤 ${formData.customer_name}\n📞 ${formData.customer_phone}\n📅 ${formData.event_date}\n📍 ${formData.venue_address}\n📦 ${pkg?.name || "Event"}\n💰 ৳${(pkg?.price || 0).toLocaleString()}`
        );
        window.open(`https://wa.me/${whatsappNumber}?text=${waMsg}`, "_blank");
      }

      setFormData({ customer_name: "", customer_email: "", customer_phone: "", event_date: "", event_time: "", venue_address: "", guest_count: "", special_requests: "" });
    } catch (err: any) {
      toast.error("Failed to submit booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getIconForCategory = (slug: string, index: number): LucideIcon => {
    const key = Object.keys(CATEGORY_ICONS).find(k => slug?.toLowerCase().includes(k));
    if (key) return CATEGORY_ICONS[key];
    const fallbackIcons: LucideIcon[] = [PartyPopper, Heart, Briefcase, Gift];
    return fallbackIcons[index % fallbackIcons.length];
  };

  const jsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "EventPlanning",
    name: "Pikooly Event Management",
    description: "Professional event management services in Bangladesh - Wedding, Birthday, Corporate events",
    url: typeof window !== "undefined" ? `${window.location.origin}/events` : "https://pikooly.com.bd/events",
    areaServed: { "@type": "Country", name: "Bangladesh" },
    serviceType: categories.map((c: any) => c.name),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Event Packages",
      itemListElement: packages.slice(0, 4).map((pkg: any, i: number) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: pkg.name,
          description: pkg.description,
        },
        price: pkg.price,
        priceCurrency: "BDT",
        position: i + 1,
      })),
    },
  }), [categories, packages]);

  const faqJsonLd = useMemo(() => {
    const allFaqs = categories
      .filter((c: any) => c.name)
      .map((c: any) => ({
        "@type": "Question",
        name: `What does ${c.name} service include?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: c.short_description || c.description || `Professional ${c.name} event planning with décor, coordination and on-ground execution.`,
        },
      }));
    if (allFaqs.length === 0) return undefined;
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: allFaqs,
    };
  }, [categories]);

  const breadcrumbJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: typeof window !== "undefined" ? window.location.origin : "https://pikooly.com.bd" },
      { "@type": "ListItem", position: 2, name: "Events", item: typeof window !== "undefined" ? `${window.location.origin}/events` : "https://pikooly.com.bd/events" },
    ],
  }), []);

  const seoTitle = settings.events_seo_title || "Event Management Services | Wedding, Birthday, Corporate Events | Pikooly";
  const seoDescription = settings.events_seo_description || "Professional event management services in Bangladesh. Wedding decoration, birthday parties, corporate events & anniversary surprises. Book your dream event today!";
  const heroTitle = settings.events_hero_title || "Make Your Special Moments <span class='text-primary'>Unforgettable</span>";
  const heroSubtitle = settings.events_hero_subtitle || "Wedding, birthday, corporate events — complete event management services tailored for you";

  return (
    <main>
      <SEOHead
        title={seoTitle.slice(0, 60)}
        description={seoDescription.slice(0, 160)}
        canonical={typeof window !== "undefined" ? `${window.location.origin}/events` : undefined}
        jsonLd={jsonLd}
        ogImage={settings.events_og_image}
      />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 page-section-hero overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="section-container text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" /> Event Management
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight" dangerouslySetInnerHTML={{ __html: heroTitle }} />
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{heroSubtitle}</p>
          </motion.div>
        </div>
      </section>

      {/* Categories — 4-card premium grid */}
      {categories.length > 0 && (
        <section className="page-section bg-background">
          <div className="section-container">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-5 md:mb-7">Our Services</h2>

            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {categories.map((cat: any, i: number) => {
                const badge = CATEGORY_BADGES[i % CATEGORY_BADGES.length];
                return (
                  <Link
                    key={cat.id}
                    to={`/events/${cat.slug}`}
                    className="group flex-shrink-0 snap-start w-[200px] sm:w-[220px] md:w-[calc(25%-12px)] rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted/40">
                      <img
                        src={cat.image_url || "/placeholder.svg"}
                        alt={cat.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        width={300}
                        height={225}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent" />
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-background/85 backdrop-blur-sm px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground border border-border/50">
                        {badge}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-foreground line-clamp-1">{cat.name}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {cat.short_description || "Event planning"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Packages */}
      <section className="page-section bg-muted/30">
        <div className="section-container">
          <div className="text-center mb-8">
            <span className="text-primary text-xs font-semibold tracking-wider uppercase">Choose Your Plan</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-1">Event Packages</h2>
            <p className="text-muted-foreground mt-2">Select a package that fits your budget and requirements</p>
          </div>

          {packages.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No packages available for this category yet</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg: any, i: number) => {
                const features = Array.isArray(pkg.features) ? pkg.features : [];
                const discount = pkg.original_price ? Math.round(((pkg.original_price - pkg.price) / pkg.original_price) * 100) : 0;
                return (
                  <motion.div
                    key={pkg.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className={`group relative bg-card rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_-12px_hsl(var(--primary)/0.25)] ${
                      pkg.is_featured ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border/60"
                    }`}
                  >
                    {/* Image with gradient overlay */}
                    <div className="relative h-52 overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10">
                      {pkg.image_url ? (
                        <>
                          <img src={pkg.image_url} alt={pkg.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                          <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-foreground/10 to-transparent" />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="h-10 w-10 text-primary/30" />
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                        {pkg.is_featured && (
                          <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg">
                            <Star className="w-3 h-3" /> Most Popular
                          </span>
                        )}
                        {discount > 0 && (
                          <span className="inline-flex items-center bg-destructive text-destructive-foreground text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                            {discount}% OFF
                          </span>
                        )}
                      </div>

                      {/* Category badge bottom-right */}
                      <span className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm text-foreground text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border border-border/40 z-10">
                        {(pkg as any).event_categories?.name}
                      </span>
                    </div>

                    <div className="p-5">
                      <h3 className="text-lg font-bold text-foreground mb-1.5">{pkg.name}</h3>
                      {pkg.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{pkg.description}</p>}

                      {/* Price */}
                      <div className="flex items-baseline gap-2 mb-4 pb-4 border-b border-border/40">
                        <span className="text-2xl font-bold text-primary">{formatPrice(pkg.price)}</span>
                        {pkg.original_price && (
                          <span className="text-sm text-muted-foreground line-through">{formatPrice(pkg.original_price)}</span>
                        )}
                      </div>

                      {/* Features */}
                      {features.length > 0 && (
                        <ul className="space-y-2.5 mb-5">
                          {features.map((f: any, fi: number) => (
                            <li key={fi} className="flex items-start gap-2.5 text-sm text-foreground">
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <Check className="w-3 h-3 text-primary" />
                              </span>
                              <span>{typeof f === "string" ? f : f.text || f.name}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <Button onClick={() => handleBookNow(pkg.id)} className="w-full gap-2 shadow-md hover:shadow-lg transition-shadow">
                        Book Now <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Booking Form */}
      {showBookingForm && (
        <section id="booking-form" className="page-section bg-background">
          <div className="section-container max-w-2xl">
            <div className="text-center mb-6">
              <span className="text-primary text-xs font-semibold tracking-wider uppercase">Almost There</span>
              <h2 className="text-2xl font-bold text-foreground mt-1">Event Booking Form</h2>
            </div>
            <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Your Name *</label>
                  <Input value={formData.customer_name} onChange={e => setFormData(p => ({ ...p, customer_name: e.target.value }))} placeholder="Full Name" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-9" value={formData.customer_phone} onChange={e => setFormData(p => ({ ...p, customer_phone: e.target.value }))} placeholder="+880XXXXXXXXXX" required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-9" type="email" value={formData.customer_email} onChange={e => setFormData(p => ({ ...p, customer_email: e.target.value }))} placeholder="email@example.com" />
                  </div>
                </div>
                <div className="sm:col-span-2 rounded-2xl border border-border/60 bg-muted/30 p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">Schedule Your Event</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Event Date *</label>
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen} modal>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full h-12 justify-start text-left font-normal text-[16px] sm:text-sm",
                              !formData.event_date && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4 shrink-0" />
                            {formData.event_date
                              ? format(new Date(formData.event_date), "EEE, MMM d, yyyy")
                              : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0 max-w-[calc(100vw-2rem)]"
                          align="start"
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <CalendarUI
                            mode="single"
                            selected={formData.event_date ? new Date(formData.event_date) : undefined}
                            onSelect={(d) => {
                              if (d) {
                                setFormData(p => ({ ...p, event_date: format(d, "yyyy-MM-dd") }));
                                setDatePickerOpen(false);
                              }
                            }}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Event Time</label>
                      <Select value={formData.event_time || undefined} onValueChange={(v) => setFormData(p => ({ ...p, event_time: v }))}>
                        <SelectTrigger className="h-12 text-[16px] sm:text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                            <SelectValue placeholder="Select time" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-[280px]">
                          {TIME_SLOTS.map(t => (
                            <SelectItem key={t} value={t} className="text-[15px] sm:text-sm">
                              {format(new Date(`2000-01-01T${t}`), "h:mm a")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {formData.event_date && formData.event_time && (
                    <div className="mt-3 text-xs text-primary bg-primary/5 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      <span>{format(new Date(formData.event_date), "EEE, MMM d")} at {format(new Date(`2000-01-01T${formData.event_time}`), "h:mm a")}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Guest Count</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input className="pl-9" type="number" value={formData.guest_count} onChange={e => setFormData(p => ({ ...p, guest_count: e.target.value }))} placeholder="100" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Venue Address *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Textarea className="pl-9" value={formData.venue_address} onChange={e => setFormData(p => ({ ...p, venue_address: e.target.value }))} placeholder="Event venue address" required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Special Requests</label>
                <Textarea value={formData.special_requests} onChange={e => setFormData(p => ({ ...p, special_requests: e.target.value }))} placeholder="Any special requirements or requests..." />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? "Submitting..." : "Confirm Booking"}
              </Button>
            </form>
          </div>
        </section>
      )}

      {/* Booking Success */}
      {bookingSuccess && (
        <section className="page-section bg-background">
          <div className="section-container max-w-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-2xl border border-primary/20 p-8 text-center shadow-lg"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Booking Confirmed! 🎉</h2>
              <p className="text-muted-foreground mb-1">
                Thank you, <span className="font-semibold text-foreground">{bookingSuccess.name}</span>!
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Your <span className="font-medium text-foreground">{bookingSuccess.pkgName}</span> booking for{" "}
                <span className="font-medium text-foreground">{bookingSuccess.date}</span> has been received. We'll contact you shortly.
              </p>
              {(() => {
                const whatsappNumber = (settings.whatsapp_number || "").replace(/[^0-9]/g, "");
                if (!whatsappNumber) return null;
                const msg = encodeURIComponent(
                  `Hi Pikooly! I just booked "${bookingSuccess.pkgName}" for ${bookingSuccess.date}. My name is ${bookingSuccess.name}. Please confirm my booking.`
                );
                return (
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${msg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white font-medium px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Confirm via WhatsApp
                  </a>
                );
              })()}
              <div className="mt-4">
                <Button variant="outline" onClick={() => setBookingSuccess(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      <PageBottomSEO prefix="events" defaultTitle="Event Management Services in Bangladesh" />
    </main>
  );
};

export default Events;
