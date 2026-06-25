import { useState, useMemo, useRef, useEffect, Fragment } from "react";
import { Calendar, ArrowRight, Clock, Search, X, ChevronRight, Play, Pause, ChevronDown, Menu, Home, Gift, ShoppingBag, Flower2, Phone } from "lucide-react";
import { Link, useParams, useNavigate, useSearchParams } from "@/lib/router-adapter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlogCardSkeleton } from "@/components/ui/skeletons";
import SEOHead from "@/components/seo/SEOHead";
import { slugify } from "@/lib/utils";
import { extractFaqsFromHtml } from "@/lib/extractFaqs";
import { AdSlot } from "@/components/ads/AdSense";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const SectionHeader = ({ label }: { label: string }) => (
  <div className="flex justify-center my-6 md:my-8">
    <div className="relative bg-primary text-primary-foreground px-8 py-2 text-xs sm:text-sm font-bold tracking-widest uppercase shadow-md transform -skew-x-12">
      <span className="inline-block transform skew-x-12">{label}</span>
    </div>
  </div>
);

const Blog = () => {
  const { settings } = useSiteSettings();
  const [search, setSearch] = useState("");
  const [recentTab, setRecentTab] = useState<"recent" | "popular">("recent");
  const [visibleCount, setVisibleCount] = useState(6);
  const { category: categorySlug, subcategory: subcategorySlug } = useParams<{ category?: string; subcategory?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSlide, setActiveSlide] = useState(0);
  const [autoSlide, setAutoSlide] = useState(true);
  const [intervalMs, setIntervalMs] = useState(4000);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const manualInteractedRef = useRef(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["public-blogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: sidebarCoupon } = useQuery({
    queryKey: ["blog-sidebar-coupon"],
    queryFn: async () => {
      const { data } = await supabase
        .from("coupons")
        .select("*")
        .eq("show_on_blog_sidebar", true)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((p: any) => {
      if (p.category) map.set(p.category, (map.get(p.category) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [posts]);

  const subcategoriesByCategory = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    posts.forEach((p: any) => {
      const category = p.category || "General";
      const subs = Array.isArray(p.subcategories) ? p.subcategories.filter(Boolean) : [];
      if (subs.length === 0) return;
      if (!map.has(category)) map.set(category, new Map<string, number>());
      const categorySubs = map.get(category)!;
      subs.forEach((sub: string) => categorySubs.set(sub, (categorySubs.get(sub) || 0) + 1));
    });
    return map;
  }, [posts]);

  const allBlogSubcategories = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((p: any) => {
      const subs = Array.isArray(p.subcategories) ? p.subcategories.filter(Boolean) : [];
      subs.forEach((sub: string) => map.set(sub, (map.get(sub) || 0) + 1));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [posts]);

  const activeCategory = useMemo(() => {
    if (!categorySlug) return "";
    const match = categories.find(([cat]) => slugify(cat) === categorySlug);
    if (match) return match[0];
    // FlowerAura-style flat URLs: if slug matches a subcategory, resolve its parent category
    for (const [cat, subMap] of subcategoriesByCategory.entries()) {
      for (const sub of subMap.keys()) {
        if (slugify(sub) === categorySlug) return cat;
      }
    }
    return "";
  }, [categorySlug, categories, subcategoriesByCategory]);

  const activeSubcategory = useMemo(() => {
    // Prefer explicit subcategory segment; else infer from flat /blog/category/:slug
    const slug = subcategorySlug || categorySlug;
    if (!slug) return "";
    // If the slug matches a category exactly, it's not a subcategory page
    if (!subcategorySlug && categories.some(([cat]) => slugify(cat) === slug)) return "";
    const subMap = activeCategory ? subcategoriesByCategory.get(activeCategory) : undefined;
    const categoryMatch = Array.from(subMap?.keys() || []).find((sub) => slugify(sub) === slug);
    if (categoryMatch) return categoryMatch;
    return allBlogSubcategories.find(([sub]) => slugify(sub) === slug)?.[0] || "";
  }, [subcategorySlug, categorySlug, activeCategory, categories, subcategoriesByCategory, allBlogSubcategories]);

  const visibleSubcategories = useMemo(() => {
    const categorySubs = activeCategory ? Array.from(subcategoriesByCategory.get(activeCategory)?.entries() || []) : [];
    return categorySubs.length > 0 ? categorySubs.sort((a, b) => b[1] - a[1]) : allBlogSubcategories;
  }, [activeCategory, subcategoriesByCategory, allBlogSubcategories]);

  // Redirect legacy ?category=... query to /blog/category/:slug
  useEffect(() => {
    const legacyCategory = searchParams.get("category");
    if (legacyCategory) {
      navigate(`/blog/category/${slugify(legacyCategory)}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (activeCategory) {
      result = result.filter((p: any) => p.category === activeCategory);
    }
    if (activeSubcategory) {
      result = result.filter((p: any) => Array.isArray(p.subcategories) && p.subcategories.includes(activeSubcategory));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p: any) =>
          p.title?.toLowerCase().includes(q) ||
          p.excerpt?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          (Array.isArray(p.subcategories) && p.subcategories.some((sub: string) => sub.toLowerCase().includes(q)))
      );
    }
    return result;
  }, [posts, search, activeCategory, activeSubcategory]);

  const trendingHero = posts.slice(0, 5);
  const trendingTopics = posts.slice(0, 5);

  /* Auto-slide effect */
  useEffect(() => {
    if (!autoSlide || trendingHero.length <= 1) return;
    const timer = setInterval(() => {
      if (manualInteractedRef.current) {
        manualInteractedRef.current = false;
        return;
      }
      setActiveSlide((prev) => (prev + 1) % trendingHero.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoSlide, intervalMs, trendingHero.length]);
  /* Reset pagination when search or category changes */
  useEffect(() => {
    setVisibleCount(6);
  }, [search, activeCategory, activeSubcategory]);

  const birthdayPosts = posts.filter((p: any) => p.category?.toLowerCase().includes("birthday")).slice(0, 6);
  const anniversaryPosts = posts.filter((p: any) => p.category?.toLowerCase().includes("anniversary")).slice(0, 6);
  const allPosts = filteredPosts.slice(0, visibleCount);
  const recentPosts = posts.slice(0, 4);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const estimateReadTime = (content: string | null) => {
    if (!content) return "2 min read";
    const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    return `${Math.max(1, Math.round(words / 200))} min read`;
  };

  // Featured hero collage tile
  const HeroTile = ({ post, large = false }: { post: any; large?: boolean }) => (
    <Link
      to={`/blog/${post.slug}`}
      className={`group relative block overflow-hidden rounded-lg ${large ? "row-span-2 col-span-2" : ""}`}
    >
      <img
        src={post.image_url || "/placeholder.svg"}
        alt={post.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 md:p-4">
        <h3 className={`text-white font-semibold leading-tight line-clamp-3 ${large ? "text-base sm:text-2xl md:text-3xl" : "text-[10px] sm:text-xs md:text-sm"}`}>
          {post.title}
        </h3>
      </div>
    </Link>
  );

  const SmallListItem = ({ post }: { post: any }) => (
    <Link to={`/blog/${post.slug}`} className="group flex gap-3 items-start py-2.5 border-b border-border/40 last:border-b-0">
      <img
        src={post.image_url || "/placeholder.svg"}
        alt={post.title}
        className="w-20 h-20 object-cover rounded-md flex-shrink-0"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
          {post.title}
        </h4>
        <p className="text-[11px] text-muted-foreground mt-1">
          {formatDate(post.published_at || post.created_at)} · {estimateReadTime(post.content)}
        </p>
      </div>
    </Link>
  );

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const canonicalUrl = useMemo(() => {
    const base = `${origin}/blog`;
    if (activeSubcategory) return `${base}/category/${slugify(activeSubcategory)}`;
    return activeCategory ? `${base}/category/${slugify(activeCategory)}` : base;
  }, [activeCategory, activeSubcategory, origin]);

  const categoryPostCount = activeCategory ? filteredPosts.length : 0;

  const categoryOgImage = useMemo(() => {
    if (!activeCategory) return undefined;
    const featured = posts.find(
      (p: any) => p.category === activeCategory && p.image_url
    );
    return featured?.image_url as string | undefined;
  }, [activeCategory, posts]);

  const categoryLabel = activeSubcategory
    ? activeSubcategory.charAt(0).toUpperCase() + activeSubcategory.slice(1)
    : activeCategory
    ? activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)
    : "";

  const pageTitle = activeCategory
    ? `${categoryLabel} Gift Ideas & Articles${categoryPostCount ? ` (${categoryPostCount})` : ""} | Pikooly Blog`
    : "Pikooly Blog — Gifting Stories, Tips & Inspiration";
  const pageDescription = activeCategory
    ? `Discover ${categoryPostCount || ""} ${categoryLabel.toLowerCase()} articles on the Pikooly Blog — curated gifting ideas, flower care tips, and celebration inspiration for Bangladesh.`.replace(/\s+/g, " ").trim()
    : "Explore Pikooly Blog for the latest gifting ideas, flower care tips, birthday & anniversary inspiration, and celebration stories from Bangladesh.";

  // Invalid category slug (no matching posts loaded) → noindex to avoid thin-content pages
  const isInvalidCategory = !!categorySlug && !isLoading && !activeCategory;
  // FlowerAura-style flat URL: subcategories live at /blog/category/:sub-slug
  const subcategoryLink = (sub: string) => `/blog/category/${slugify(sub)}`;

  // Pull FAQ-style Q&A pairs from the top category posts (if their content has them)
  const categoryFaqs = useMemo(() => {
    if (!activeCategory) return [] as { question: string; answer: string }[];
    const topPosts = filteredPosts
      .slice(0, 5);
    const all: { question: string; answer: string }[] = [];
    for (const p of topPosts) {
      const items = extractFaqsFromHtml(p.content, 4);
      for (const it of items) {
        if (all.length >= 8) break;
        if (!all.some((x) => x.question.toLowerCase() === it.question.toLowerCase())) {
          all.push(it);
        }
      }
      if (all.length >= 8) break;
    }
    return all;
  }, [activeCategory, filteredPosts]);

  const jsonLd = useMemo(() => {
    if (activeCategory) {
      const graph: any[] = [
        {
          "@type": "CollectionPage",
          name: `${categoryLabel} — Pikooly Blog`,
          description: pageDescription,
          url: canonicalUrl,
          inLanguage: "en",
          isPartOf: { "@type": "Blog", name: "Pikooly Blog", url: `${origin}/blog` },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: categoryPostCount,
            itemListElement: filteredPosts
              .slice(0, 20)
              .map((p: any, i: number) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `${origin}/blog/${p.slug}`,
                name: p.title,
              })),
          },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
            { "@type": "ListItem", position: 2, name: "Blog", item: `${origin}/blog` },
            { "@type": "ListItem", position: 3, name: categoryLabel, item: canonicalUrl },
          ],
        },
      ];

      if (categoryFaqs.length > 0) {
        graph.push({
          "@type": "FAQPage",
          url: canonicalUrl,
          mainEntity: categoryFaqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        });
      }

      return { "@context": "https://schema.org", "@graph": graph };
    }
    return {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Pikooly Blog",
      url: `${origin}/blog`,
      description: "Pikooly Blog — gifting ideas, flower care tips, celebration inspiration.",
    };
  }, [activeCategory, categoryLabel, pageDescription, canonicalUrl, categoryPostCount, filteredPosts, origin, categoryFaqs]);


  return (
    <main className="pb-6 md:pb-10 bg-[#f7f7f7]">
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        canonical={canonicalUrl}
        ogImage={categoryOgImage}
        ogType={activeCategory ? "website" : "website"}
        noindex={isInvalidCategory}
        jsonLd={jsonLd}
      />


      {/* Brand Header */}
      <div className="bg-white border-b border-border/40">
        <div className="section-container py-4 flex items-center justify-center relative">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(true)}
            className="md:hidden absolute left-4 top-1/2 -translate-y-1/2 px-3 py-1 border-2 border-primary text-primary rounded text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-colors"
            aria-label="Open menu"
          >
            menu
          </button>

          <Link to="/blog" className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-primary tracking-tight">
              Pikooly
            </h1>
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-bold tracking-wide">
              BLOG
            </span>
          </Link>
          <button
            onClick={() => setShowMobileSearch((v) => !v)}
            className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Toggle search"
          >
            {showMobileSearch ? (
              <X className="w-5 h-5 text-foreground" />
            ) : (
              <Search className="w-5 h-5 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Search Box */}
      {showMobileSearch && (
        <div className="md:hidden bg-white border-b border-border/40 animate-in slide-in-from-top-2">
          <div className="section-container py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search articles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-lg pl-10 pr-10 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearch("");
                  setShowMobileSearch(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                aria-label="Close search"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Side Menu Drawer */}
      {showMobileMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed top-0 left-0 h-full w-[280px] bg-white z-50 shadow-2xl md:hidden flex flex-col"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <span className="font-bold text-lg text-primary">Menu</span>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Drawer Nav Links */}
            <nav className="flex-1 overflow-y-auto py-2">
              <Link
                to="/"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted transition-colors"
              >
                <Home className="w-5 h-5 text-primary" />
                <span className="font-medium">Home</span>
              </Link>
              <Link
                to="/shop"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted transition-colors"
              >
                <Flower2 className="w-5 h-5 text-primary" />
                <span className="font-medium">Flowers</span>
              </Link>
              <Link
                to="/shop"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted transition-colors"
              >
                <Gift className="w-5 h-5 text-primary" />
                <span className="font-medium">Gifts</span>
              </Link>
              <Link
                to="/blog"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted transition-colors"
              >
                <ShoppingBag className="w-5 h-5 text-primary" />
                <span className="font-medium">Blog</span>
              </Link>
              <a
                href="tel:+8801410244421"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted transition-colors"
              >
                <Phone className="w-5 h-5 text-primary" />
                <span className="font-medium">Contact Us</span>
                <span className="ml-auto text-sm text-muted-foreground">+8801410244421</span>
              </a>

              <div className="my-2 border-t border-border/40" />

              {/* Blog Categories */}
              <div className="px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Categories
              </div>
              {categories.map(([cat]) => (
                <Fragment key={cat}>
                  <Link
                    to={`/blog/category/${slugify(cat)}`}
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-3 px-4 py-3 text-foreground hover:bg-muted transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{cat}</span>
                  </Link>
                  {Array.from(subcategoriesByCategory.get(cat)?.keys() || []).map((sub) => (
                    <Link
                      key={`${cat}-${sub}`}
                      to={`/blog/category/${slugify(sub)}`}
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 px-8 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                      <span className="font-medium">{sub}</span>
                    </Link>
                  ))}
                </Fragment>
              ))}
            </nav>
          </motion.div>
        </>
      )}


      {/* Categories Navigation Bar */}
      <div className="hidden md:block bg-[#1a5f6e] text-white">
        <div className="section-container px-2 sm:px-4">
            <div className="flex flex-wrap items-center md:justify-center gap-1 py-2.5">
            {categories.map(([cat]) => {
              const to = `/blog/category/${slugify(cat)}`;
              const isActive = activeCategory === cat;
              const subs = Array.from(subcategoriesByCategory.get(cat)?.entries() || []).sort((a, b) => b[1] - a[1]);
              const hasSubs = subs && subs.length > 0;
              return (
                <div key={cat} className="relative group shrink-0">
                  <Link
                    to={to}
                    className={`flex items-center gap-1 px-3 sm:px-4 py-2 text-[11px] sm:text-sm font-medium uppercase tracking-wide whitespace-nowrap transition-colors ${
                      isActive ? "text-white underline underline-offset-4 decoration-2" : "text-white/70 hover:text-white"
                    }`}
                  >
                    {cat}
                    {hasSubs && <ChevronDown size={14} className="opacity-70 group-hover:rotate-180 transition-transform duration-200" />}
                  </Link>
                  {hasSubs && (
                    <div className="absolute top-full left-0 hidden group-hover:block bg-[#134b56] text-white min-w-[220px] py-1 z-50 shadow-xl border-t border-white/10">
                      {subs.map(([sub]) => (
                        <Link
                          key={sub}
                          to={`/blog/category/${slugify(sub)}`}
                          className="block px-4 py-2.5 text-sm uppercase tracking-wide hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
                        >
                          {sub}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category / Search Header (FlowerAura style) */}
      {(activeCategory || search.trim()) && (
        <div className="section-container pt-6">
          <div className="relative">
            <nav className="text-xs sm:text-sm text-muted-foreground mb-3">
              <Link to="/" className="hover:text-foreground">Home</Link>
              {activeCategory && (
                <>
                  <span className="mx-1">»</span>
                  <span className="capitalize">{categoryLabel}</span>
                </>
              )}
            </nav>
            <h1 className="text-center text-xl sm:text-2xl md:text-3xl font-semibold tracking-wide">
              {activeCategory ? (
                <>
                  <span className="text-foreground">CATEGORY: </span>
                  <span className="text-primary uppercase">{categoryLabel}</span>
                </>
              ) : (
                <>
                  <span className="text-foreground">SEARCH: </span>
                  <span className="text-primary uppercase">&quot;{search.trim()}&quot;</span>
                </>
              )}
            </h1>
          </div>
        </div>
      )}


      {/* Hero Collage (desktop) / Slider (mobile) */}
      {!activeCategory && !search.trim() && (
      isLoading ? (
        <div className="section-container py-6">
          {/* Mobile skeleton slider */}
          <div className="md:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[85vw] flex-shrink-0 snap-start bg-muted animate-pulse rounded-lg aspect-[4/3]" />
            ))}
          </div>
          {/* Desktop skeleton grid */}
          <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 sm:gap-3 h-[280px] sm:h-[420px] md:h-[480px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`bg-muted animate-pulse rounded-lg ${i === 0 ? "row-span-2 col-span-2" : ""}`} />
            ))}
          </div>
        </div>
      ) : trendingHero.length > 0 && (
        <div className="section-container py-4 md:py-6">
          {/* Mobile Slider */}
          <div className="md:hidden">
            {/* Animated transform slider with swipe */}
            <div
              ref={sliderRef}
              className="relative overflow-hidden rounded-lg touch-pan-y"
              onTouchStart={(e) => {
                manualInteractedRef.current = true;
                (sliderRef.current as any)._tx = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                const start = (sliderRef.current as any)?._tx;
                if (start == null) return;
                const dx = e.changedTouches[0].clientX - start;
                if (Math.abs(dx) > 40) {
                  setActiveSlide((prev) => {
                    if (dx < 0) return (prev + 1) % trendingHero.length;
                    return (prev - 1 + trendingHero.length) % trendingHero.length;
                  });
                }
                (sliderRef.current as any)._tx = null;
              }}
            >
              <div
                className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {trendingHero.slice(0, 5).map((p: any, idx: number) => (
                  <Link
                    key={p.id}
                    to={`/blog/${p.slug}`}
                    className="w-full flex-shrink-0 relative block overflow-hidden aspect-[4/3] group"
                  >
                    <img
                      src={p.image_url || "/placeholder.svg"}
                      alt={p.title}
                      className={`w-full h-full object-cover transition-transform duration-[1200ms] ${activeSlide === idx ? "scale-105" : "scale-100"}`}
                      loading={idx === 0 ? "eager" : "lazy"}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 pb-8">
                      <h3
                        className={`text-white font-semibold leading-tight text-base line-clamp-2 transition-all duration-700 ${activeSlide === idx ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
                      >
                        {p.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
              {/* Dots overlay inside image */}
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
                {trendingHero.slice(0, 5).map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      manualInteractedRef.current = true;
                      setActiveSlide(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${activeSlide === idx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
            {/* Auto-slide controls */}
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <button
                onClick={() => setAutoSlide((v) => !v)}
                className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors ${autoSlide ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                aria-label={autoSlide ? "Pause auto-slide" : "Play auto-slide"}
              >
                {autoSlide ? <Pause size={10} /> : <Play size={10} />}
              </button>
              {[3000, 5000, 7000].map((ms) => (
                <button
                  key={ms}
                  onClick={() => { setIntervalMs(ms); manualInteractedRef.current = true; }}
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors ${intervalMs === ms ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {ms / 1000}s
                </button>
              ))}
            </div>
          </div>
          {/* Desktop Grid */}
          <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 sm:gap-3 h-[280px] sm:h-[420px] md:h-[480px]">
            {trendingHero[0] && <HeroTile post={trendingHero[0]} large />}
            {trendingHero.slice(1, 5).map((p: any) => (
              <HeroTile key={p.id} post={p} />
            ))}
          </div>
        </div>
      ))}

      {/* Main 2-column layout */}
      <div className="section-container py-2 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8">
        {/* LEFT main column */}
        <div className="min-w-0">
          {/* Trending Topics */}
          {!activeCategory && !search.trim() && trendingTopics.length > 0 && (
            <section>
              <SectionHeader label="Trending Topics" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {trendingTopics[0] && (
                  <Link to={`/blog/${trendingTopics[0].slug}`} className="group block">
                    <div className="aspect-[4/3] overflow-hidden rounded-lg mb-3">
                      <img src={trendingTopics[0].image_url || "/placeholder.svg"} alt={trendingTopics[0].title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary line-clamp-2 leading-snug">
                      {trendingTopics[0].title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      by {"Pikooly"} · {formatDate(trendingTopics[0].published_at || trendingTopics[0].created_at)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{trendingTopics[0].excerpt}</p>
                  </Link>
                )}
                <div className="flex flex-col">
                  {trendingTopics.slice(1, 5).map((p: any) => <SmallListItem key={p.id} post={p} />)}
                </div>
              </div>
            </section>
          )}

          {/* Birthday Section */}
          {!activeCategory && !search.trim() && birthdayPosts.length > 0 && (
            <section>
              <SectionHeader label="Birthday" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                {birthdayPosts.map((p: any) => <SmallListItem key={p.id} post={p} />)}
              </div>
            </section>
          )}

          {/* Anniversary Section */}
          {!activeCategory && !search.trim() && anniversaryPosts.length > 0 && (
            <section>
              <SectionHeader label="Anniversary" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                {anniversaryPosts.map((p: any) => <SmallListItem key={p.id} post={p} />)}
              </div>
            </section>
          )}

          {/* All Blog Section */}
          <section>
            {/* AdSense — Top banner on blog list */}
            <AdSlot placement="blog_list_top" slot={settings.adsense_blog_list_top_slot} sizeVariant="leaderboard-box" />

            {isLoading ? (
              <div className="space-y-5">
                {Array.from({ length: 4 }).map((_, i) => <BlogCardSkeleton key={i} />)}
              </div>
            ) : allPosts.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No blog posts found.</p>
            ) : (
              <div className="space-y-5">
                {allPosts.map((post: any, i: number) => (
                  <Fragment key={post.id}>
                    <motion.article
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.2) }}
                      className="bg-white rounded-lg overflow-hidden border border-border/40 hover:shadow-md transition-shadow"
                    >
                      <Link to={`/blog/${post.slug}`} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] md:grid-cols-[260px_1fr] gap-0 group">
                        <div className="aspect-[16/10] sm:aspect-auto sm:h-full overflow-hidden">
                          <img src={post.image_url || "/placeholder.svg"} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                        </div>
                        <div className="p-4 sm:p-5 flex flex-col justify-center">
                          <h2 className="font-display font-semibold text-base sm:text-lg md:text-xl text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                            {post.title}
                          </h2>
                          <p className="text-[11px] sm:text-xs text-muted-foreground mt-2">
                            by {"Pikooly"} · {formatDate(post.published_at || post.created_at)} · {estimateReadTime(post.content)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{post.excerpt}</p>
                        </div>
                      </Link>
                    </motion.article>
                    {/* AdSense — In-feed after every 6 posts */}
                    {(i + 1) % 6 === 0 && i < allPosts.length - 1 && (
                      <AdSlot placement="blog_list_infeed" slot={settings.adsense_blog_list_infeed_slot} sizeVariant="leaderboard-box" />
                    )}
                  </Fragment>
                ))}
              </div>
            )}

            {filteredPosts.length > visibleCount && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setVisibleCount((v) => v + 6)}
                  className="bg-primary text-primary-foreground px-8 py-2.5 rounded-md text-sm font-semibold tracking-wide hover:bg-primary/90 transition-colors"
                >
                  LOAD MORE POSTS
                </button>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT sidebar */}
        <aside className="space-y-6">
          {/* Search - desktop only */}
          <div className="hidden md:block">
            <div className="flex justify-center mb-3">
              <div className="relative bg-[#1a5f6e] text-white px-8 py-2 text-xs font-bold tracking-widest uppercase shadow transform -skew-x-12">
                <span className="inline-block transform skew-x-12">Search</span>
              </div>
            </div>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search articles..."
                className="w-full bg-white border border-border rounded-md px-4 py-2.5 text-base pr-10 focus:outline-none focus:ring-2 focus:ring-primary/30"
                style={{ fontSize: "16px" }}
              />
              {search.trim() ? (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                  aria-label="Clear search"
                >
                  <X size={16} className="text-muted-foreground" />
                </button>
              ) : (
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Offer — managed from Admin > Coupons */}
          {sidebarCoupon && (
            <div>
              <div className="flex justify-center mb-3">
                <div className="relative bg-[#1a5f6e] text-white px-8 py-2 text-xs font-bold tracking-widest uppercase shadow transform -skew-x-12">
                  <span className="inline-block transform skew-x-12">Offer</span>
                </div>
              </div>
              <Link to="/shop" className="block rounded-lg overflow-hidden bg-gradient-to-br from-primary/90 to-primary text-primary-foreground p-5 text-center">
                <div className="text-xs tracking-widest opacity-90">FLAT</div>
                <div className="text-4xl font-bold my-1">
                  {sidebarCoupon.discount_type === "percentage"
                    ? `${Number(sidebarCoupon.discount_value)}% OFF`
                    : `৳${Number(sidebarCoupon.discount_value)} OFF`}
                </div>
                <div className="text-[11px] opacity-90">COUPON CODE: <span className="font-bold">{sidebarCoupon.code}</span></div>
                {sidebarCoupon.description && (
                  <div className="text-[10px] mt-2 opacity-80">{sidebarCoupon.description}</div>
                )}
                {Number(sidebarCoupon.min_order_amount) > 0 && (
                  <div className="text-[10px] mt-1 opacity-70">Min order ৳{Number(sidebarCoupon.min_order_amount)}</div>
                )}
              </Link>
            </div>
          )}

          {/* Recent / Popular Tabs */}
          <div className="bg-white rounded-lg border border-border/40 overflow-hidden">
            <div className="flex">
              {(["recent", "popular"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRecentTab(tab)}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                    recentTab === tab ? "bg-[#1a5f6e] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="p-4 space-y-3">
              {recentPosts.map((p: any) => (
                <Link key={p.id} to={`/blog/${p.slug}`} className="group block pb-3 border-b border-border/40 last:border-b-0 last:pb-0">
                  <h4 className="text-sm font-medium text-foreground group-hover:text-primary line-clamp-2 leading-snug">{p.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1">{formatDate(p.published_at || p.created_at)}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <div className="flex justify-center mb-3">
                <div className="relative bg-[#1a5f6e] text-white px-8 py-2 text-xs font-bold tracking-widest uppercase shadow transform -skew-x-12">
                  <span className="inline-block transform skew-x-12">Categories</span>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-border/40 divide-y divide-border/40">
                {categories.map(([cat, count]) => {
                  const to = `/blog/category/${slugify(cat)}`;
                  const isActive = activeCategory === cat;
                  const activeCls = isActive && !activeSubcategory ? "bg-primary/5" : "";
                  return (
                    <Link
                      key={cat}
                      to={to}
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left ${activeCls}`}
                    >
                      <span className="flex items-center gap-2 text-foreground">
                        <ChevronRight size={14} className="text-primary" />
                        {cat}
                      </span>
                      <span className="text-muted-foreground text-xs">({count})</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
};

export default Blog;
