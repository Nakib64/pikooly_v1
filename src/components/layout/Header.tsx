import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "@/lib/router-adapter";
import { Search, ShoppingCart, User, Truck, ChevronDown, MapPinCheck, Moon, Sun, Globe, Sparkles, LogOut, Package } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useTheme } from "next-themes";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useMultiCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DesktopSearchDropdown from "@/components/layout/DesktopSearchDropdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Header = () => {
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [pinnedMegaMenu, setPinnedMegaMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);

  const { totalItems, setIsOpen } = useCart();
  const { settings, isLoading: settingsLoading } = useSiteSettings();
  const { currencies, selectedCurrency, setSelectedCurrency } = useMultiCurrency();
  const { user, signOut } = useAuth();
  const { language, setLanguage, t, languages, multiLanguageEnabled } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const currencyRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const headerRootRef = useRef<HTMLDivElement>(null);

  const logoUrl = settings.company_logo || "";
  const announcementText = settings.announcement_bar_text || "🌸 Same Day Delivery Available in 500+ Cities";
  // Render immediately (default enabled) to avoid CLS while settings load
  const showAnnouncement = settings.announcement_bar_enabled !== "false";

  const { data: categories = [] } = useQuery({
    queryKey: ["header-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, image_url, category_type, category_types")
        .eq("is_active", true)
        .eq("show_in_header", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      // Header respects ONLY the "Show in Header Menu" toggle — no type filtering
      return data || [];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["header-subcategories"],
    queryFn: async () => {
      const [{ data: subs, error: subsErr }, { data: prods, error: prodErr }] = await Promise.all([
        supabase
          .from("subcategories")
          .select("id, name, slug, category_id, image_url, mega_menu_group")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("products")
          .select("id, subcategory_id, product_subcategories(subcategory_id)")
          .eq("is_active", true),
      ]);
      if (subsErr) throw subsErr;
      if (prodErr) throw prodErr;

      const counts: Record<string, number> = {};
      for (const p of prods || []) {
        const seen = new Set<string>();
        if ((p as any).subcategory_id) seen.add((p as any).subcategory_id);
        for (const ps of (p as any).product_subcategories || []) {
          if (ps.subcategory_id) seen.add(ps.subcategory_id);
        }
        for (const sid of seen) counts[sid] = (counts[sid] || 0) + 1;
      }
      return (subs || []).map((s) => ({ ...s, product_count: counts[s.id] || 0 }));
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const subsByCategory = useMemo(() => {
    const map: Record<string, typeof subcategories> = {};
    subcategories.forEach((s) => {
      if (!map[s.category_id]) map[s.category_id] = [];
      map[s.category_id].push(s);
    });
    return map;
  }, [subcategories]);

  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const [canUseHover, setCanUseHover] = useState(false);
  const megaMenuCloseTimer = useRef<number | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) setShowCurrencyDropdown(false);
      if (languageRef.current && !languageRef.current.contains(e.target as Node)) setShowLanguageDropdown(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileDropdown(false);
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setHoveredCat(null);
        setPinnedMegaMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    return () => { if (megaMenuCloseTimer.current) window.clearTimeout(megaMenuCloseTimer.current); };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanUseHover(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setHoveredCat(null);
    setPinnedMegaMenu(null);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => {
      const isScrolled = window.scrollY > 60;
      setScrolled(isScrolled);
      if (isScrolled) setMobileSearchExpanded(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const root = headerRootRef.current;
    if (!root) return;

    let frameId: number | null = null;
    let lastOffset = "";

    const updateHeaderOffset = () => {
      const isMobile = window.innerWidth < 768;
      const nextOffset = isMobile ? `${root.offsetHeight}px` : "0px";
      if (nextOffset === lastOffset) return;
      lastOffset = nextOffset;
      document.documentElement.style.setProperty("--mobile-header-offset", nextOffset);
    };

    const scheduleHeaderOffsetUpdate = () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        updateHeaderOffset();
      });
    };

    scheduleHeaderOffsetUpdate();

    const resizeObserver = new ResizeObserver(() => {
      scheduleHeaderOffsetUpdate();
    });
    resizeObserver.observe(root);
    window.addEventListener("resize", scheduleHeaderOffsetUpdate);

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleHeaderOffsetUpdate);
    };
  }, [showAnnouncement, multiLanguageEnabled, languages.length, location.pathname]);

  const openMegaMenu = (id: string) => {
    if (megaMenuCloseTimer.current) { window.clearTimeout(megaMenuCloseTimer.current); megaMenuCloseTimer.current = null; }
    setHoveredCat(id);
  };
  const closeMegaMenu = () => {
    if (pinnedMegaMenu && !canUseHover) return;
    if (megaMenuCloseTimer.current) window.clearTimeout(megaMenuCloseTimer.current);
    megaMenuCloseTimer.current = window.setTimeout(() => { setHoveredCat(null); megaMenuCloseTimer.current = null; }, 120);
  };

  // Icon button component for consistency
  const IconBtn = ({ icon: Icon, label, onClick, href, badge, className = "" }: {
    icon: React.ElementType; label?: string; onClick?: () => void; href?: string; badge?: number; className?: string;
  }) => {
    const content = (
      <span className={`touch-target relative flex min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-1.5 text-foreground/70 transition-all duration-200 hover:text-primary hover:bg-muted/50 active:scale-95 ${className}`}>
        <Icon size={19} strokeWidth={1.8} />
        {badge != null && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 sm:top-0 sm:right-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1 shadow-sm">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {label && <span className="hidden md:block text-[9px] lg:text-[10px] font-medium leading-none tracking-wide">{label}</span>}
      </span>
    );
    if (href) return <Link to={href} aria-label={label || ""}>{content}</Link>;
    return <button type="button" onClick={onClick} aria-label={label || ""}>{content}</button>;
  };

  return (
    <div ref={headerRootRef} className="fixed inset-x-0 top-0 z-[60] safe-area-top md:sticky md:top-0">
      {/* Announcement Bar */}
      {showAnnouncement && (
        <div className="bg-primary text-primary-foreground text-center text-[10px] sm:text-[11px] py-1.5 px-4 font-medium tracking-wide">
          {announcementText}
        </div>
      )}

      <header className="border-b border-border/40 bg-card/98 backdrop-blur-xl shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04)]">
        <div className="section-container">
          {/* === TOP ROW: Logo + Search + Actions === */}
          <div className="flex items-center h-[50px] sm:h-[54px] md:h-[58px] lg:h-[62px] gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            
            {/* Logo */}
            <Link to="/" className="shrink-0 flex items-center">
              {settingsLoading ? (
                <div className="h-7 sm:h-8 md:h-9 lg:h-10 w-20 sm:w-24 md:w-28 lg:w-32 bg-muted rounded-lg animate-pulse" />
              ) : logoUrl ? (
                <img
                  src={logoUrl}
                  alt={settings.store_name || "Store"}
                  width={140}
                  height={48}
                  decoding="async"
                  fetchPriority="high"
                  className="h-7 sm:h-8 md:h-9 lg:h-10 w-auto max-w-[100px] sm:max-w-[112px] md:max-w-[128px] lg:max-w-[140px] object-contain"
                  style={{ aspectRatio: "140/48" }}
                />
              ) : (
                <span className="text-lg sm:text-xl md:text-2xl font-display font-bold">
                  <span className="text-primary">{settings.store_name || "Pikooly"}</span>
                </span>
              )}
            </Link>

            {/* Desktop Search — FNP-style dropdown */}
            <DesktopSearchDropdown
              isOpen={desktopSearchOpen}
              onOpen={() => setDesktopSearchOpen(true)}
              onClose={() => setDesktopSearchOpen(false)}
            />

            {/* Right Actions */}
            <div className="flex items-center gap-0 sm:gap-0.5 ml-auto">
              {/* Mobile search icon - always visible on mobile */}
              <IconBtn icon={Search} label={t("search") || "Search"} onClick={() => navigate("/search")} className="lg:hidden" />

              <IconBtn
                icon={theme === "dark" ? Sun : Moon}
                label={theme === "dark" ? "Light" : "Dark"}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              />

              {multiLanguageEnabled && languages.length > 1 && (
                <div className="relative" ref={languageRef}>
                  <button
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    className="relative flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2 lg:px-2.5 py-1.5 rounded-xl text-foreground/75 hover:text-primary hover:bg-primary/5 active:scale-95 transition-all duration-200"
                    aria-label="Language"
                  >
                    <Globe size={19} strokeWidth={1.8} />
                    <span className="hidden md:flex items-center text-[9px] lg:text-[10px] font-medium leading-none tracking-wide gap-0.5">
                      {language.code.toUpperCase()} <ChevronDown size={8} />
                    </span>
                  </button>
                  {showLanguageDropdown && (
                    <div className="absolute right-0 top-full mt-2 z-[100] bg-card border border-border/70 rounded-xl shadow-[0_12px_40px_-8px_hsl(var(--foreground)/0.12)] overflow-hidden min-w-[180px] max-h-[320px] overflow-y-auto">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => { setLanguage(lang); setShowLanguageDropdown(false); }}
                          className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-sm hover:bg-muted/60 transition-colors ${
                            language.code === lang.code ? "bg-primary/8 text-primary font-semibold" : "text-foreground"
                          }`}
                        >
                          <span className="w-5 text-center font-semibold text-xs">{lang.code.toUpperCase()}</span>
                          <span>{lang.nativeName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <span className="hidden md:inline-flex">
                <IconBtn icon={Truck} label={t("same_day")} href="/shop?same_day=true" />
              </span>

              <IconBtn icon={MapPinCheck} label={t("track")} href="/track-order" />

              {/* Currency */}
              <div className="relative" ref={currencyRef}>
                <button
                  onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                  className="relative flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2 lg:px-2.5 py-1.5 rounded-xl text-foreground/75 hover:text-primary hover:bg-primary/5 active:scale-95 transition-all duration-200"
                  aria-label="Currency"
                >
                  <span className="flex h-[19px] w-[19px] items-center justify-center rounded-full border border-current text-[10px] font-bold">
                    {selectedCurrency?.symbol || "$"}
                  </span>
                  <span className="hidden md:flex items-center text-[9px] lg:text-[10px] font-medium leading-none tracking-wide gap-0.5">
                    {selectedCurrency?.code || "USD"} <ChevronDown size={8} />
                  </span>
                </button>
                {showCurrencyDropdown && currencies.length > 1 && (
                  <div className="absolute right-0 top-full mt-2 z-[100] bg-card border border-border/70 rounded-xl shadow-[0_12px_40px_-8px_hsl(var(--foreground)/0.12)] overflow-hidden min-w-[160px]">
                    {currencies.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCurrency(c); setShowCurrencyDropdown(false); }}
                        className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-sm hover:bg-muted/60 transition-colors ${
                          selectedCurrency?.code === c.code ? "bg-primary/8 text-primary font-semibold" : "text-foreground"
                        }`}
                      >
                        <span className="w-5 text-center font-semibold">{c.symbol}</span>
                        <span>{c.code} - {c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <IconBtn icon={ShoppingCart} label={t("cart")} href="/cart" badge={totalItems} />

              <span className="hidden sm:inline-flex">
                {user ? (
                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="relative flex flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2 lg:px-2.5 py-1.5 rounded-xl text-foreground/75 hover:text-primary hover:bg-primary/5 active:scale-95 transition-all duration-200"
                      aria-label="Profile"
                    >
                      <User size={19} strokeWidth={1.8} />
                      <span className="hidden md:flex items-center text-[9px] lg:text-[10px] font-medium leading-none tracking-wide gap-0.5">
                        {t("account")} <ChevronDown size={8} />
                      </span>
                    </button>
                    {showProfileDropdown && (
                      <div className="absolute right-0 top-full mt-2 z-[100] bg-card border border-border/70 rounded-xl shadow-[0_12px_40px_-8px_hsl(var(--foreground)/0.12)] overflow-hidden min-w-[200px]">
                        <div className="px-4 py-3 border-b border-border/50">
                          <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">
                            {user.email?.split("@")[0] || "User"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{user.email}</p>
                        </div>
                        <Link
                          to="/account"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-sm hover:bg-muted/60 transition-colors text-foreground"
                        >
                          <User size={15} strokeWidth={1.8} />
                          <span>{t("account")}</span>
                        </Link>
                        <Link
                          to="/account"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-sm hover:bg-muted/60 transition-colors text-foreground"
                        >
                          <Package size={15} strokeWidth={1.8} />
                          <span>My Orders</span>
                        </Link>
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            setShowLogoutDialog(true);
                          }}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-sm hover:bg-muted/60 transition-colors text-destructive border-t border-border/50"
                        >
                          <LogOut size={15} strokeWidth={1.8} />
                          <span>{t("logout")}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <IconBtn icon={User} label={t("sign_in")} href="/auth" />
                )}
              </span>
            </div>
          </div>

          {/* Mobile search bar removed — using header icon instead */}

          {/* === NAV BAR (Desktop/Tablet) === */}
          <div ref={navRef} className="relative hidden md:block border-t border-border/30">
            <nav className="flex items-center overflow-x-auto scrollbar-hide justify-center">
              {/* Dynamic categories */}
              {categories.map((cat) => {
                const subs = subsByCategory[cat.id] || [];
                const isActive = location.pathname.startsWith(`/product-category/${cat.slug}`);
                const isHovered = hoveredCat === cat.id || pinnedMegaMenu === cat.id;
                return (
                  <div
                    key={cat.id}
                    className="static"
                    onMouseEnter={() => { if (canUseHover && subs.length > 0) openMegaMenu(cat.id); }}
                    onMouseLeave={() => { if (canUseHover && subs.length > 0 && pinnedMegaMenu !== cat.id) closeMegaMenu(); }}
                  >
                    <button
                      type="button"
                      aria-expanded={isHovered}
                      onClick={() => {
                        if (subs.length > 0) {
                          if (canUseHover) {
                            const next = hoveredCat === cat.id ? null : cat.id;
                            if (megaMenuCloseTimer.current) { window.clearTimeout(megaMenuCloseTimer.current); megaMenuCloseTimer.current = null; }
                            setPinnedMegaMenu(null);
                            setHoveredCat(next);
                            return;
                          }
                          const next = pinnedMegaMenu === cat.id ? null : cat.id;
                          setPinnedMegaMenu(next);
                          setHoveredCat(next ?? null);
                          return;
                        }
                        setPinnedMegaMenu(null);
                        setHoveredCat(null);
                        navigate(`/product-category/${cat.slug}`);
                      }}
                      className={`group relative flex items-center gap-1 px-3 md:px-3.5 lg:px-4 xl:px-5 py-2.5 md:py-3 text-[12px] md:text-[13px] lg:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                        isActive || isHovered ? "text-primary" : "text-foreground/65 hover:text-foreground"
                      }`}
                    >
                      {cat.name}
                      {subs.length > 0 && (
                        <ChevronDown size={12} className={`text-muted-foreground/60 transition-transform duration-200 ${isHovered ? "rotate-180 text-primary" : ""}`} />
                      )}
                      <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full bg-primary transition-all duration-300 ${
                        isActive ? "w-2/3" : isHovered ? "w-1/3" : "w-0 group-hover:w-1/4"
                      }`} />
                    </button>

                    {/* Mega Menu */}
                    {subs.length > 0 && isHovered && (
                      <div
                        className="absolute inset-x-0 top-full z-50 pt-2 animate-in fade-in-0 slide-in-from-top-1 duration-200"
                        onMouseEnter={() => { if (canUseHover) openMegaMenu(cat.id); }}
                        onMouseLeave={() => { if (canUseHover) closeMegaMenu(); }}
                      >
                        <div className="mx-auto w-full max-w-[960px] px-3 xl:px-0">
                          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[0_16px_48px_-12px_hsl(var(--foreground)/0.15)]">
                            <div className="flex flex-col xl:flex-row xl:items-stretch">
                              {/* Featured sidebar */}
                              <div className="flex items-center gap-3 border-b border-border/40 bg-muted/25 px-4 py-3 xl:w-[200px] xl:flex-col xl:items-start xl:gap-0 xl:border-b-0 xl:border-r xl:px-5 xl:py-5">
                                <div className="hidden xl:inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
                                  <Sparkles size={11} />
                                  Featured
                                </div>
                                <h3 className="text-sm font-display font-semibold text-foreground xl:mt-3 xl:text-xl">{cat.name}</h3>
                                <p className="hidden xl:block mt-1.5 text-xs leading-5 text-muted-foreground">
                                  Handpicked subcategories for faster browsing.
                                </p>
                                <Link
                                  to={`/product-category/${cat.slug}`}
                                  onClick={() => { setHoveredCat(null); setPinnedMegaMenu(null); }}
                                  className="ml-auto shrink-0 inline-flex items-center rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm hover:shadow-md transition-all hover:scale-[1.02] xl:ml-0 xl:mt-4 xl:px-4 xl:py-2 xl:text-xs"
                                >
                                  View all
                                </Link>
                              </div>

                              {/* Subcategories */}
                              <div className="flex-1 px-3 py-3 md:px-4 md:py-3.5 xl:px-5 xl:py-5">
                                <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-1">
                                  <div className="mb-2.5 flex items-center justify-between border-b border-border/40 pb-2 xl:mb-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Subcategories</p>
                                    <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">{subs.length} items</span>
                                  </div>
                                  {(() => {
                                    const groups = new Map<string, { name: string; items: typeof subs }>();
                                    const ungrouped: typeof subs = [];
                                    subs.forEach((s) => {
                                      const raw = ((s as any).mega_menu_group || "").trim();
                                      if (!raw) { ungrouped.push(s); return; }
                                      const key = raw.toLowerCase();
                                      if (!groups.has(key)) groups.set(key, { name: raw, items: [] });
                                      groups.get(key)!.items.push(s);
                                    });
                                    const groupEntries = Array.from(groups.values()).map((g) => [g.name, g.items] as [string, typeof subs]);
                                    const hasGroups = groupEntries.length > 0;
                                    if (!hasGroups) {
                                      return (
                                        <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-3 xl:gap-2">
                                          {subs.map((sub) => (
                                            <Link
                                              key={sub.id}
                                              to={`/product-category/${cat.slug}/${sub.slug}`}
                                              onClick={() => { setHoveredCat(null); setPinnedMegaMenu(null); }}
                                              className="group/item flex items-center justify-between gap-2 rounded-xl border border-transparent bg-muted/15 px-3 py-2 text-[12px] md:text-[13px] font-medium text-foreground/80 transition-all duration-200 hover:border-primary/15 hover:bg-primary/5 hover:text-primary xl:rounded-xl xl:px-3.5 xl:py-2.5"
                                            >
                                              <span className="flex min-w-0 items-center gap-2">
                                                <span className="flex h-5 w-5 xl:h-6 xl:w-6 shrink-0 items-center justify-center rounded-full bg-background text-primary ring-1 ring-border/60 transition-all group-hover/item:bg-primary group-hover/item:text-primary-foreground group-hover/item:ring-primary/30">
                                                  <span className="h-1 w-1 rounded-full bg-current" />
                                                </span>
                                                <span className="truncate text-[12px] xl:text-[13px] leading-5">{sub.name}</span>
                                              </span>
                                              <span className="shrink-0 rounded-full bg-background/80 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-muted-foreground ring-1 ring-border/50 transition-colors group-hover/item:bg-primary/8 group-hover/item:text-primary">
                                                {sub.product_count}
                                              </span>
                                            </Link>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-4">
                                        {groupEntries.map(([groupName, items]) => (
                                          <div key={groupName} className="min-w-0">
                                            <h4 className="text-[12px] xl:text-[13px] font-bold text-foreground mb-2 select-none cursor-default">
                                              {groupName}
                                            </h4>
                                            <ul className="space-y-1">
                                              {items.map((sub) => (
                                                <li key={sub.id}>
                                                  <Link
                                                    to={`/product-category/${cat.slug}/${sub.slug}`}
                                                    onClick={() => { setHoveredCat(null); setPinnedMegaMenu(null); }}
                                                    className="block truncate text-[12px] xl:text-[13px] text-foreground/70 hover:text-primary transition-colors py-0.5"
                                                  >
                                                    {sub.name}
                                                  </Link>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        ))}
                                        {ungrouped.length > 0 && (
                                          <div className="min-w-0">
                                            <h4 className="text-[12px] xl:text-[13px] font-bold text-foreground mb-2 select-none cursor-default">More</h4>
                                            <ul className="space-y-1">
                                              {ungrouped.map((sub) => (
                                                <li key={sub.id}>
                                                  <Link
                                                    to={`/product-category/${cat.slug}/${sub.slug}`}
                                                    onClick={() => { setHoveredCat(null); setPinnedMegaMenu(null); }}
                                                    className="block truncate text-[12px] xl:text-[13px] text-foreground/70 hover:text-primary transition-colors py-0.5"
                                                  >
                                                    {sub.name}
                                                  </Link>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Grouped: Our Services (Event Service + Photography) */}
              {(() => {
                const servicesId = "__services__";
                const serviceLinks = [
                  { label: "Event Service", href: "/events", match: (p: string) => p.startsWith("/events") },
                  { label: "Photography", href: "/photography", match: (p: string) => p === "/photography" },
                ];
                const isActive = serviceLinks.some((l) => l.match(location.pathname));
                const isHovered = hoveredCat === servicesId || pinnedMegaMenu === servicesId;
                return (
                  <div
                    key={servicesId}
                    className="static"
                    onMouseEnter={() => { if (canUseHover) openMegaMenu(servicesId); }}
                    onMouseLeave={() => { if (canUseHover && pinnedMegaMenu !== servicesId) closeMegaMenu(); }}
                  >
                    <button
                      type="button"
                      aria-expanded={isHovered}
                      onClick={() => {
                        if (canUseHover) {
                          const next = hoveredCat === servicesId ? null : servicesId;
                          if (megaMenuCloseTimer.current) { window.clearTimeout(megaMenuCloseTimer.current); megaMenuCloseTimer.current = null; }
                          setPinnedMegaMenu(null);
                          setHoveredCat(next);
                          return;
                        }
                        const next = pinnedMegaMenu === servicesId ? null : servicesId;
                        setPinnedMegaMenu(next);
                        setHoveredCat(next ?? null);
                      }}
                      className={`group relative flex items-center gap-1 px-3 md:px-3.5 lg:px-4 xl:px-5 py-2.5 md:py-3 text-[12px] md:text-[13px] lg:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                        isActive || isHovered ? "text-primary" : "text-foreground/65 hover:text-foreground"
                      }`}
                    >
                      Our Services
                      <ChevronDown size={12} className={`text-muted-foreground/60 transition-transform duration-200 ${isHovered ? "rotate-180 text-primary" : ""}`} />
                      <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full bg-primary transition-all duration-300 ${
                        isActive ? "w-2/3" : isHovered ? "w-1/3" : "w-0 group-hover:w-1/4"
                      }`} />
                    </button>

                    {isHovered && (
                      <div
                        className="absolute inset-x-0 top-full z-50 pt-2 animate-in fade-in-0 slide-in-from-top-1 duration-200"
                        onMouseEnter={() => { if (canUseHover) openMegaMenu(servicesId); }}
                        onMouseLeave={() => { if (canUseHover) closeMegaMenu(); }}
                      >
                        <div className="mx-auto w-full max-w-[960px] px-3 xl:px-0">
                          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[0_16px_48px_-12px_hsl(var(--foreground)/0.15)]">
                            <div className="flex flex-col xl:flex-row xl:items-stretch">
                              {/* Featured sidebar */}
                              <div className="flex items-center gap-3 border-b border-border/40 bg-muted/25 px-4 py-3 xl:w-[200px] xl:flex-col xl:items-start xl:gap-0 xl:border-b-0 xl:border-r xl:px-5 xl:py-5">
                                <div className="hidden xl:inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
                                  <Sparkles size={11} />
                                  Featured
                                </div>
                                <h3 className="text-sm font-display font-semibold text-foreground xl:mt-3 xl:text-xl">Our Services</h3>
                                <p className="hidden xl:block mt-1.5 text-xs leading-5 text-muted-foreground">
                                  Premium event & photography services.
                                </p>
                                <Link
                                  to="/events"
                                  onClick={() => { setHoveredCat(null); setPinnedMegaMenu(null); }}
                                  className="ml-auto shrink-0 inline-flex items-center rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm hover:shadow-md transition-all hover:scale-[1.02] xl:ml-0 xl:mt-4 xl:px-4 xl:py-2 xl:text-xs"
                                >
                                  View all
                                </Link>
                              </div>

                              {/* Service links */}
                              <div className="flex-1 px-3 py-3 md:px-4 md:py-3.5 xl:px-5 xl:py-5">
                                <div className="mb-2.5 flex items-center justify-between border-b border-border/40 pb-2 xl:mb-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Services</p>
                                  <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">{serviceLinks.length} items</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-3 xl:gap-2">
                                  {serviceLinks.map((l) => (
                                    <Link
                                      key={l.href}
                                      to={l.href}
                                      onClick={() => { setHoveredCat(null); setPinnedMegaMenu(null); }}
                                      className={`group/item flex items-center justify-between gap-2 rounded-xl border border-transparent bg-muted/15 px-3 py-2 text-[12px] md:text-[13px] font-medium transition-all duration-200 hover:border-primary/15 hover:bg-primary/5 hover:text-primary xl:rounded-xl xl:px-3.5 xl:py-2.5 ${
                                        l.match(location.pathname) ? "text-primary" : "text-foreground/80"
                                      }`}
                                    >
                                      <span className="flex min-w-0 items-center gap-2">
                                        <span className="flex h-5 w-5 xl:h-6 xl:w-6 shrink-0 items-center justify-center rounded-full bg-background text-primary ring-1 ring-border/60 transition-all group-hover/item:bg-primary group-hover/item:text-primary-foreground group-hover/item:ring-primary/30">
                                          <span className="h-1 w-1 rounded-full bg-current" />
                                        </span>
                                        <span className="truncate text-[12px] xl:text-[13px] leading-5">{l.label}</span>
                                      </span>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Static links */}
              {[
                { label: "Custom Bouquet", href: "/custom-bouquet", match: (p: string) => p === "/custom-bouquet" },
              ].map((link) => {
                const isDuplicate = categories.some(
                  (cat) => cat.name.toLowerCase().replace(/\s+/g, '') === link.label.toLowerCase().replace(/\s+/g, '')
                );
                if (isDuplicate) return null;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`group relative px-3 md:px-3.5 lg:px-4 xl:px-5 py-2.5 md:py-3 text-[12px] md:text-[13px] lg:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                      link.match(location.pathname) ? "text-primary" : "text-foreground/65 hover:text-foreground"
                    }`}
                  >
                    {link.label}
                    <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full bg-primary transition-all duration-300 ${
                      link.match(location.pathname) ? "w-2/3" : "w-0 group-hover:w-1/4"
                    }`} />
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowLogoutDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Header;
