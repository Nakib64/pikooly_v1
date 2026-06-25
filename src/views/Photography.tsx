import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMultiCurrency } from "@/contexts/CurrencyContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import SEOHead from "@/components/seo/SEOHead";
import PageBottomSEO from "@/components/seo/PageBottomSEO";
import { Camera, Video, Gift, MapPin, Calendar, Package, User, ChevronRight, ChevronLeft, Play, Sparkles, Clock, CheckCircle2, Star, ArrowRight, Phone, Heart, Award, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const serviceIcons = [Camera, Video, Gift];

const timeSlots = [
  "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
  "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM",
];

const Photography = () => {
  const { user } = useAuth();
  const { formatPrice: formatCurrency } = useMultiCurrency();
  const { settings } = useSiteSettings();
  const [selectedService, setSelectedService] = useState<any>(null);
  const [locationType, setLocationType] = useState("dhaka");
  const [district, setDistrict] = useState("");
  const [eventDate, setEventDate] = useState<Date>();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [eventTime, setEventTime] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [portfolioFilter, setPortfolioFilter] = useState("all");

  const { data: services } = useQuery({
    queryKey: ["photo-services"],
    queryFn: async () => {
      const { data } = await supabase.from("photo_services").select("*").eq("is_active", true).order("display_order");
      return data || [];
    },
  });

  const { data: packages } = useQuery({
    queryKey: ["photo-packages"],
    queryFn: async () => {
      const { data } = await supabase.from("photo_packages").select("*").eq("is_active", true).order("display_order");
      return data || [];
    },
  });

  const { data: portfolio } = useQuery({
    queryKey: ["photo-portfolio"],
    queryFn: async () => {
      const { data } = await supabase.from("photo_portfolio").select("*").eq("is_active", true).order("display_order");
      return data || [];
    },
  });

  const { data: travelFees } = useQuery({
    queryKey: ["photo-travel-fees"],
    queryFn: async () => {
      const { data } = await supabase.from("photo_travel_fees").select("*").order("district");
      return data || [];
    },
  });

  const filteredPortfolio = useMemo(() => {
    if (!portfolio) return [];
    if (portfolioFilter === "all") return portfolio;
    return portfolio.filter((p: any) => p.media_type === portfolioFilter);
  }, [portfolio, portfolioFilter]);

  const currentTravelFee = useMemo(() => {
    if (locationType === "dhaka") return 0;
    const found = travelFees?.find((t: any) => t.district === district);
    return found?.fee || 0;
  }, [locationType, district, travelFees]);

  const totalPrice = useMemo(() => {
    return (selectedPackage?.price || 0) + currentTravelFee;
  }, [selectedPackage, currentTravelFee]);

  const openBooking = (service: any) => {
    setSelectedService(service);
    setSelectedPackage(null);
    setTimeout(() => {
      document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleSubmit = async () => {
    if (!name || !phone || !address) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("photo_bookings").insert({
        booking_number: "temp",
        service_id: selectedService?.id,
        package_id: selectedPackage?.id,
        customer_name: name,
        customer_phone: phone,
        customer_email: email || null,
        event_address: address,
        event_date: eventDate ? format(eventDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        event_time: eventTime || null,
        location_type: locationType,
        district: locationType === "outside_dhaka" ? district : "Dhaka",
        travel_fee: currentTravelFee,
        total: totalPrice,
        user_id: user?.id || null,
      });
      if (error) throw error;

      if (locationType === "outside_dhaka" && district) {
        await supabase.from("photo_travel_fees").update({ request_count: (travelFees?.find((t: any) => t.district === district)?.request_count || 0) + 1 }).eq("district", district);
      }

      toast.success("Booking submitted successfully! We'll contact you shortly.");
      resetForm();
    } catch {
      toast.error("Failed to submit booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedService(null);
    setLocationType("dhaka");
    setDistrict("");
    setEventDate(undefined);
    setEventTime("");
    setSelectedPackage(null);
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
  };

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://pikooly.com.bd";
  const seoTitle = settings.photo_seo_title || "Photography & Videography Services — Pikooly";
  const seoDescription = settings.photo_seo_description || "Professional photography, cinematic videography, and surprise gift combos in Bangladesh. Book now starting from ৳2,000.";
  const heroTitle = settings.photo_hero_title || "Capture Your <span class='text-primary'>Moments</span>";
  const heroSubtitle = settings.photo_hero_subtitle || "Professional photography, cinematic videography & surprise gift combos — starting from ৳2,000";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: seoTitle,
        provider: { "@type": "LocalBusiness", name: "Pikooly", url: siteUrl },
        areaServed: { "@type": "Country", name: "Bangladesh" },
        description: seoDescription,
      },
      {
        "@type": "LocalBusiness",
        name: "Pikooly Photography",
        url: `${siteUrl}/photography`,
        address: { "@type": "PostalAddress", addressCountry: "BD", addressLocality: "Dhaka" },
      },
    ],
  };

  

  return (
    <main>
      <SEOHead
        title={seoTitle.slice(0, 60)}
        description={seoDescription.slice(0, 160)}
        canonical={`${siteUrl}/photography`}
        jsonLd={jsonLd}
        ogImage={settings.photo_og_image}
      />

      {/* Hero Section — Cinematic */}
      <section className="relative overflow-hidden bg-gradient-to-b from-foreground/[0.03] via-background to-background page-section-hero">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-primary/3 blur-[80px]" />
        </div>
        <div className="section-container text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-5 animate-fade-in">
            <Camera className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Professional Services</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-3 sm:mb-4 leading-tight font-display" dangerouslySetInnerHTML={{ __html: heroTitle }} />
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xl mx-auto mb-6 sm:mb-8 leading-relaxed">
            {heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="rounded-full px-8 h-11 sm:h-12 text-sm font-semibold w-full sm:w-auto" onClick={() => document.getElementById("services-section")?.scrollIntoView({ behavior: "smooth" })}>
              Explore Services <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8 h-11 sm:h-12 text-sm font-semibold w-full sm:w-auto" onClick={() => document.getElementById("portfolio-section")?.scrollIntoView({ behavior: "smooth" })}>
              View Portfolio
            </Button>
          </div>

          {/* Trust Indicators — Card Style */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-8 sm:mt-12 max-w-md mx-auto">
            {[
              { icon: Users, value: "500+", label: "Events" },
              { icon: Star, value: "4.9★", label: "Rating" },
              { icon: Heart, value: "50+", label: "Happy Clients" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                <stat.icon className="h-4 w-4 text-primary mx-auto mb-1.5" />
                <p className="text-base sm:text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section — Premium Cards */}
      <section id="services-section" className="page-section-hero">
        <div className="section-container">
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-1.5">What We Offer</p>
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-foreground font-display">Our Services</h2>
          </div>

          {/* Mobile: Horizontal Scroll / Desktop: Grid */}
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:overflow-visible md:max-w-5xl md:mx-auto">
            {services?.map((service: any, idx: number) => {
              const Icon = serviceIcons[idx] || Camera;
              return (
                <div
                  key={service.id}
                  className="min-w-[75vw] sm:min-w-[60vw] md:min-w-0 snap-start group rounded-2xl border border-border/40 bg-card overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1"
                >
                  {service.image_url ? (
                    <div className="h-44 sm:h-48 md:h-56 overflow-hidden relative">
                      <img src={service.image_url} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-foreground/10 to-transparent" />
                      <Badge className="absolute top-3 left-3 bg-background/90 text-foreground backdrop-blur-sm text-[10px] font-semibold rounded-lg border-0 shadow-sm">
                        <Icon className="h-3 w-3 mr-1 text-primary" />
                        {service.title}
                      </Badge>
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-primary-foreground text-lg font-bold drop-shadow-md">
                          {formatCurrency(service.starting_price)}
                          <span className="text-xs font-normal ml-1 opacity-80">starting</span>
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight">{service.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-0.5">{service.short_description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2.5 mb-3">
                      <span className="text-xs text-muted-foreground">Starting from</span>
                      <span className="text-base font-bold text-primary">{formatCurrency(service.starting_price)}</span>
                    </div>
                    <Button className="w-full rounded-xl h-10 text-sm font-semibold" onClick={() => openBooking(service)}>
                      Book Now <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works — Clean Timeline */}
      <section className="page-section bg-muted/20">
        <div className="section-container">
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-1.5">Simple Process</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground font-display">How It Works</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {[
              { icon: MapPin, title: "Choose Location", desc: "Select Dhaka or outside" },
              { icon: Calendar, title: "Pick a Date", desc: "Choose your preferred date" },
              { icon: Package, title: "Select Package", desc: "Basic, Standard or Premium" },
              { icon: CheckCircle2, title: "Confirm Booking", desc: "We'll reach out to you" },
            ].map((item, i) => (
              <div key={i} className="text-center group bg-card rounded-2xl border border-border/40 p-4 sm:p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <div className="relative mx-auto mb-3">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <item.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-sm">{i + 1}</span>
                </div>
                <h3 className="font-semibold text-xs sm:text-sm text-foreground mb-0.5">{item.title}</h3>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Section — Masonry */}
      <section id="portfolio-section" className="page-section-hero">
        <div className="section-container">
          <div className="text-center mb-6 sm:mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-1.5">Gallery</p>
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-foreground font-display mb-2">Our Best Shoots</h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">Browse our portfolio of stunning photography and videography work</p>
          </div>

          {/* Filters — Pill Style */}
          <div className="flex justify-center gap-2 mb-6 sm:mb-8">
            {[
              { key: "all", label: "All", icon: Sparkles },
              { key: "photo", label: "Photos", icon: Camera },
              { key: "video", label: "Videos", icon: Video },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setPortfolioFilter(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300",
                  portfolioFilter === f.key
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "bg-card border border-border/50 text-muted-foreground hover:bg-muted/50 hover:border-primary/30"
                )}
              >
                <f.icon className="h-3.5 w-3.5" />
                {f.label}
              </button>
            ))}
          </div>

          {filteredPortfolio.length > 0 ? (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-4 max-w-6xl mx-auto">
              {filteredPortfolio.map((item: any) => (
                <div key={item.id} className="mb-3 md:mb-4 break-inside-avoid rounded-2xl overflow-hidden group relative">
                  {item.media_type === "photo" ? (
                    <img src={item.media_url} alt={item.title} className="w-full rounded-2xl group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                  ) : (
                    <div className="relative aspect-video bg-muted rounded-2xl flex items-center justify-center overflow-hidden">
                      {item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover rounded-2xl" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-muted/50 rounded-2xl flex items-center justify-center">
                          <Video className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      {item.video_embed_url && (
                        <a href={item.video_embed_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center bg-foreground/20 group-hover:bg-foreground/30 transition-colors">
                          <div className="w-12 h-12 rounded-full bg-primary shadow-xl shadow-primary/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
                          </div>
                        </a>
                      )}
                    </div>
                  )}
                  {item.title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/80 via-foreground/40 to-transparent p-3 sm:p-4 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-primary-foreground text-xs sm:text-sm font-semibold">{item.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 sm:py-16">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Camera className="h-8 w-8 text-muted-foreground opacity-40" />
              </div>
              <p className="text-muted-foreground font-medium text-sm">Portfolio coming soon!</p>
              <p className="text-xs text-muted-foreground mt-1">Stay tuned for our best work</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section — Glass Card */}
      <section className="page-section">
        <div className="section-container">
          <div className="max-w-3xl mx-auto rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 sm:p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute top-4 right-4 opacity-[0.06]">
              <Camera className="h-20 sm:h-24 w-20 sm:w-24 text-primary" />
            </div>
            <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-primary/5 blur-[60px]" />
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-4">
              <Award className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Premium Quality</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground font-display mb-2 sm:mb-3 relative z-10">
              Ready to Book Your Photographer?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-5 sm:mb-6 max-w-md mx-auto relative z-10">
              Get in touch with us today and let's make your special moments unforgettable.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 relative z-10">
              <Button size="lg" className="rounded-full px-8 h-11 sm:h-12 text-sm font-semibold shadow-lg shadow-primary/25 w-full sm:w-auto" onClick={() => document.getElementById("services-section")?.scrollIntoView({ behavior: "smooth" })}>
                <Camera className="h-4 w-4 mr-2" /> Book a Session
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8 h-11 sm:h-12 text-sm font-semibold w-full sm:w-auto" asChild>
                <a href="https://wa.me/8801234567890" target="_blank" rel="noopener noreferrer">
                  <Phone className="h-4 w-4 mr-2" /> WhatsApp Us
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Booking Form Section */}
      <section id="booking-form" className="page-section bg-muted/20">
        <div className="section-container max-w-3xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              {selectedService ? `Book ${selectedService.title}` : "Book Your Session"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Fill in your details and we'll contact you to confirm
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-5 md:p-7 shadow-sm space-y-5">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Service *</label>
              <Select value={selectedService?.id || ""} onValueChange={(v) => setSelectedService(services?.find((s: any) => s.id === v) || null)}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select a service" /></SelectTrigger>
                <SelectContent>
                  {services?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedService && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Package</label>
                <Select value={selectedPackage?.id || ""} onValueChange={(v) => setSelectedPackage(packages?.find((p: any) => p.id === v) || null)}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select a package" /></SelectTrigger>
                  <SelectContent>
                    {packages?.filter((p: any) => p.service_id === selectedService?.id).map((pkg: any) => (
                      <SelectItem key={pkg.id} value={pkg.id}>{pkg.name} — {formatCurrency(pkg.price)} ({pkg.duration})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Location *</label>
                <Select value={locationType} onValueChange={(v) => { setLocationType(v); if (v === "dhaka") setDistrict(""); }}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dhaka">Dhaka (No travel fee)</SelectItem>
                    <SelectItem value="outside_dhaka">Outside Dhaka</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {locationType === "outside_dhaka" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">District *</label>
                  <Select value={district} onValueChange={setDistrict}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select district" /></SelectTrigger>
                    <SelectContent>
                      {travelFees?.filter((t: any) => t.district !== "Dhaka").map((t: any) => (
                        <SelectItem key={t.id} value={t.district}>
                          {t.district} {t.fee > 0 && `(+${formatCurrency(t.fee)})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">Schedule Your Event</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Event Date <span className="text-destructive">*</span>
                  </label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen} modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left rounded-xl h-12 bg-background text-[16px] sm:text-sm font-medium hover:bg-background hover:border-primary/50 transition-colors",
                          !eventDate && "text-muted-foreground font-normal"
                        )}
                      >
                        <Calendar className="h-4 w-4 mr-2 flex-shrink-0 text-primary" />
                        <span className="truncate">
                          {eventDate ? format(eventDate, "EEE, MMM d, yyyy") : "Pick a date"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 z-[100] max-w-[calc(100vw-2rem)] pointer-events-auto bg-popover"
                      align="start"
                      sideOffset={8}
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <CalendarUI
                        mode="single"
                        selected={eventDate}
                        onSelect={(d) => {
                          if (!d) return;
                          setEventDate(d);
                          setDatePickerOpen(false);
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> Preferred Time
                  </label>
                  <Select value={eventTime} onValueChange={setEventTime}>
                    <SelectTrigger className="rounded-xl h-12 bg-background text-[16px] sm:text-sm font-medium hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="h-4 w-4 flex-shrink-0 text-primary" />
                        <SelectValue placeholder="Select time slot" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      {timeSlots.map((t) => (
                        <SelectItem key={t} value={t} className="text-[15px] sm:text-sm py-2.5">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {eventDate && eventTime && (
                <div className="mt-3 flex items-center gap-2 text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">
                  <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="font-medium truncate">
                    {format(eventDate, "EEEE, MMMM d, yyyy")} at {eventTime}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Full Name *</label>
                <Input placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl h-11" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Phone Number *</label>
                <Input placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl h-11" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email (optional)</label>
                <Input placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl h-11" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Event Address *</label>
                <Input placeholder="Full event address" value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl h-11" />
              </div>
            </div>

            {selectedPackage && (
              <div className="rounded-xl bg-muted/40 border border-border/40 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Package</span><span className="font-medium">{formatCurrency(selectedPackage.price)}</span></div>
                {currentTravelFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Travel Fee</span><span className="font-medium">{formatCurrency(currentTravelFee)}</span></div>}
                <div className="flex justify-between items-center font-bold border-t border-border/40 pt-2">
                  <span>Total</span>
                  <span className="text-primary text-lg">{formatCurrency(totalPrice)}</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedService || !name || !phone || !address || !eventDate || (locationType === "outside_dhaka" && !district)}
              className="w-full rounded-xl h-12 text-sm font-semibold"
            >
              {submitting ? "Submitting..." : "Confirm Booking"}
            </Button>
          </div>
        </div>
      </section>

      <PageBottomSEO prefix="photography" defaultTitle="Professional Photography Services in Bangladesh" />
    </main>
  );
};

export default Photography;
