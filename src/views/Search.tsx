"use client";
import { useState, useRef, useEffect, useCallback, useMemo, ReactNode } from "react";
import { useNavigate } from "@/lib/router-adapter";
import { Search, ArrowLeft, X, Clock, TrendingUp, ArrowUpRight, Mic, Sparkles, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiCurrency } from "@/contexts/CurrencyContext";
import SEOHead from "@/components/seo/SEOHead";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

const sanitizeSearchTerm = (value: string) =>
  value.replace(/&amp;|&#38;|&#038;/gi, "&").replace(/&nbsp;/gi, " ").replace(/<[^>]*>/g, " ").replace(/[,%()']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

const normalizeSearchText = (value?: string | null) => sanitizeSearchTerm(value || "").toLowerCase();

const scoreSearchText = (candidate: string, term: string) => {
  const n = normalizeSearchText(candidate);
  if (!n || !term) return 0;
  if (n === term) return 1000;
  if (n.startsWith(term)) return 700;
  const words = n.split(" ").filter(Boolean);
  if (words.some(w => w === term)) return 650;
  if (words.some(w => w.startsWith(term))) return 550;
  if (n.includes(term)) return 300;
  return 0;
};

const getSearchKeywordBonus = (term: string, haystack: string) => {
  if (term.length !== 1) return 0;
  const boosts: Record<string, string[]> = { f: ["flower", "flowers", "floral"], b: ["bouquet", "birthday", "box"], c: ["cake", "combo", "carnation"], r: ["rose", "roses"] };
  return (boosts[term] || []).some(k => haystack.includes(k)) ? 120 : 0;
};

const rankSearchItems = <T extends { name?: string | null; slug?: string | null; short_description?: string | null }>(items: T[], term: string, limit: number) => {
  const t = normalizeSearchText(term);
  return items.map(item => {
    const name = normalizeSearchText(item.name);
    const slug = normalizeSearchText((item.slug || "").replace(/-/g, " "));
    const sd = normalizeSearchText(item.short_description);
    const h = `${name} ${slug} ${sd}`.trim();
    const score = Math.max(scoreSearchText(name, t), Math.max(scoreSearchText(slug, t) - 40, 0), Math.max(scoreSearchText(sd, t) - 80, 0)) + getSearchKeywordBonus(t, h);
    return { item, score, name };
  }).filter(e => e.score > 0).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, limit).map(({ item }) => item);
};

const HighlightMatch = ({ text, query }: { text: string; query: string }): ReactNode => {
  if (!query || query.length < 1) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return <>{parts.map((part, i) => regex.test(part) ? <span key={i} className="text-primary font-bold">{part}</span> : <span key={i}>{part}</span>)}</>;
};

const DEFAULT_AI_CHIPS = ["Romantic gift for wife under 2500", "Birthday surprise for friend", "Sorry bolar jonno phool", "Anniversary red roses", "Ma er jonno gift"];

const SearchPage = () => {
  const navigate = useNavigate();
  const { formatPrice } = useMultiCurrency();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReason, setAiReason] = useState("");
  const [aiProducts, setAiProducts] = useState<any[]>([]);
  const [aiActive, setAiActive] = useState(false);

  const { data: trendingChips = DEFAULT_AI_CHIPS } = useQuery({
    queryKey: ["trending-search-chips"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("search_queries")
        .select("query_text")
        .order("count", { ascending: false })
        .order("last_searched_at", { ascending: false })
        .limit(5);
      if (error) return DEFAULT_AI_CHIPS;
      const rows = (data || []).map((r: any) => r.query_text).filter(Boolean);
      return rows.length >= 3 ? rows : DEFAULT_AI_CHIPS;
    },
    staleTime: 60_000,
  });

  const runAiSearch = useCallback(async (q?: string) => {
    const text = (q ?? searchQuery).trim();
    if (!text) return;
    setSearchQuery(text);
    setAiActive(true);
    setAiLoading(true);
    setAiProducts([]);
    setAiReason("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-smart-search", { body: { query: text } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAiProducts((data as any).products || []);
      setAiReason((data as any).reason || "");
      if ((data as any)?.warning && !((data as any).products || []).length) {
        setAiReason((data as any).warning);
      }
      saveRecentSearch(text);
      try { await (supabase as any).rpc("log_search_query", { _query: text }); } catch {}
    } catch (e: any) {
      setAiReason("AI provider issue. Try again or switch provider in Admin Settings.");
    } finally {
      setAiLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const startVoiceSearch = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join("");
      setSearchQuery(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [isListening]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("recent-searches");
      if (stored) setRecentSearches(JSON.parse(stored).slice(0, 8));
    } catch {}
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(sanitizeSearchTerm(searchQuery)), 180);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const saveRecentSearch = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean || clean.length < 2) return;
    setRecentSearches(prev => {
      const updated = [clean, ...prev.filter(s => s.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      try { localStorage.setItem("recent-searches", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try { localStorage.removeItem("recent-searches"); } catch {}
  }, []);

  const { data: searchResults = { products: [], cats: [], subs: [] }, isFetching: isSearching } = useQuery({
    queryKey: ["search-page", debouncedSearch],
    queryFn: async () => {
      const term = normalizeSearchText(debouncedSearch);
      if (!term) return { products: [], cats: [], subs: [] };
      const [prodRes, catRes, subRes] = await Promise.all([
        supabase.from("products").select("id, name, slug, price, original_price, image_url, short_description").eq("is_active", true).or(`name.ilike.%${term}%,short_description.ilike.%${term}%,slug.ilike.%${term}%`).limit(24),
        supabase.from("categories").select("id, name, slug, image_url").eq("is_active", true).ilike("name", `%${term}%`).limit(16),
        supabase.from("subcategories").select("id, name, slug, image_url, category_id").eq("is_active", true).ilike("name", `%${term}%`).limit(24),
      ]);
      return { products: rankSearchItems(prodRes.data || [], term, 12), cats: rankSearchItems(catRes.data || [], term, 8), subs: rankSearchItems(subRes.data || [], term, 10) };
    },
    enabled: debouncedSearch.length >= 1,
    staleTime: 60 * 1000,
    placeholderData: prev => prev,
  });

  // Popular categories
  const { data: popularCategories = [] } = useQuery({
    queryKey: ["search-popular-cats"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, slug, image_url").eq("is_active", true).eq("show_in_homepage", true).order("display_order").limit(8);
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Trending products
  const { data: trendingProducts = [] } = useQuery({
    queryKey: ["search-trending"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, slug, price, original_price, image_url").eq("is_active", true).eq("is_featured", true).order("created_at", { ascending: false }).limit(6);
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const hasResults = searchResults.products.length > 0 || searchResults.cats.length > 0 || searchResults.subs.length > 0;
  const showIdle = debouncedSearch.length === 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = sanitizeSearchTerm(searchQuery);
    if (q) { saveRecentSearch(q); navigate(`/?search=${encodeURIComponent(q)}`); }
  };

  const handleSelect = (slug: string) => { saveRecentSearch(searchQuery); navigate(`/product/${slug}`); };
  const handleCatClick = (slug: string) => { saveRecentSearch(searchQuery); navigate(`/product-category/${slug}`); };
  const handleRecentClick = (term: string) => setSearchQuery(term);

  return (
    <div className="bg-background">
      <SEOHead title="Search — Pikooly" description="Search Pikooly's collection of flowers, gifts, cakes and more." noindex />
      {/* Search Header - sticky, FNP style */}
      <div className="sticky top-0 z-50 bg-card safe-area-top">
        <div className="px-3 py-3 sm:px-4 md:px-6">
          <form onSubmit={handleSearch} className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-border/60 bg-card pl-2 pr-1.5 py-2 sm:pl-3 sm:pr-2 sm:py-2.5 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.10)] overflow-hidden">
            <button type="button" onClick={() => navigate(-1)} className="shrink-0 text-foreground/60 hover:text-foreground transition-colors active:scale-95" aria-label="Go back">
              <ArrowLeft size={20} />
            </button>
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              enterKeyHint="search"
              inputMode="search"
              maxLength={60}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value.slice(0, 60)); if (aiActive) setAiActive(false); }}
              placeholder="Ask AI or search gifts…"
              className="flex-1 min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground/50"
              style={{ fontSize: 16 }}
            />
            {searchQuery && (
              <button type="button" onClick={() => { setSearchQuery(""); setAiActive(false); setAiProducts([]); setAiReason(""); }} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1" aria-label="Clear">
                <X size={18} />
              </button>
            )}
            {!searchQuery && (
              <button type="button" onClick={startVoiceSearch} className={`shrink-0 transition-colors p-1 ${isListening ? "text-destructive animate-pulse" : "text-primary/70 hover:text-primary"}`} aria-label="Voice search">
                <Mic size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={() => runAiSearch()}
              disabled={aiLoading || !searchQuery.trim()}
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-2 py-1 sm:px-2.5 sm:py-1.5 text-[11px] font-semibold disabled:opacity-50 active:scale-95 transition-all"
              aria-label="Ask AI"
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span>AI</span>
            </button>
          </form>
          {/* AI suggestion chips when idle */}
          {!searchQuery && !aiActive && (
            <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
              {trendingChips.map((s: string) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => runAiSearch(s)}
                  className="inline-flex items-center gap-1 text-[11px] bg-primary/8 hover:bg-primary hover:text-primary-foreground border border-primary/20 text-primary rounded-full px-2.5 py-1 whitespace-nowrap shrink-0 transition-colors"
                >
                  <Sparkles className="h-3 w-3" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="border-b border-border/30" />
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto">
        {/* AI Results */}
        {aiActive && (
          <div className="px-4 pt-4 pb-2 animate-fade-in">
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-3.5">
              <div className="flex items-start gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/80 italic flex-1 min-w-0 break-words leading-relaxed text-left">
                  {aiLoading ? "Thinking of the best matches for you…" : aiReason || "Here are AI-picked matches:"}
                </p>
                <button onClick={() => { setAiActive(false); setAiProducts([]); setAiReason(""); }} className="shrink-0 text-muted-foreground hover:text-foreground p-0.5" aria-label="Close AI">
                  <X size={14} />
                </button>
              </div>
              {aiLoading && (
                <div className="grid grid-cols-2 gap-2.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl overflow-hidden bg-muted/40 animate-pulse">
                      <div className="aspect-square bg-muted" />
                      <div className="p-2 space-y-1.5"><div className="h-3 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div>
                    </div>
                  ))}
                </div>
              )}
              {!aiLoading && aiProducts.length > 0 && (
                <div className="grid grid-cols-2 gap-2.5">
                  {aiProducts.slice(0, 8).map((p: any) => (
                    <button key={p.id} onClick={() => handleSelect(p.slug)} className="flex flex-col rounded-xl overflow-hidden bg-card border border-border/40 hover:border-primary/40 hover:shadow-md transition-all text-left group">
                      <div className="aspect-square w-full overflow-hidden bg-muted/30">
                        {p.image_url && <img src={getOptimizedImageUrl(p.image_url, { width: 320 })} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                      </div>
                      <div className="px-2.5 py-2 space-y-0.5">
                        <p className="text-[12px] font-semibold text-foreground/90 line-clamp-2 leading-snug group-hover:text-primary transition-colors">{p.name}</p>
                        <p className="text-[13px] text-primary font-bold">{formatPrice(Number(p.price) || 0)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!aiLoading && aiProducts.length === 0 && aiReason && (
                <p className="text-xs text-muted-foreground py-2 text-center">No AI matches. Try rewording.</p>
              )}
            </div>
          </div>
        )}

        {/* Idle State - Recent + Trending + Popular */}
        {showIdle && !aiActive && (
          <div className="animate-fade-in">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Clock size={14} className="text-muted-foreground" /> Recent Search
                  </h3>
                  <button onClick={clearRecentSearches} className="text-xs text-primary font-medium hover:underline">Clear All</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term, i) => (
                    <button
                      key={i}
                      onClick={() => handleRecentClick(term)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-muted/50 hover:bg-primary/10 text-xs font-medium text-foreground/80 hover:text-primary transition-colors border border-border/30"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Separator */}
            {recentSearches.length > 0 && <div className="mx-4 my-2 border-t border-border/30" />}

            {/* Trending Gifts */}
            {trendingProducts.length > 0 && (
              <div className="px-4 pt-3 pb-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
                  <TrendingUp size={14} className="text-primary" /> Trending Gifts
                </h3>
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                  {trendingProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSelect(p.slug)}
                      className="shrink-0 snap-start w-[76px] flex flex-col items-center gap-1 group"
                    >
                      <div className="w-[68px] h-[68px] rounded-xl overflow-hidden ring-1 ring-border/40 group-hover:ring-primary/30 transition-all bg-muted/30">
                        {p.image_url ? (
                          <img src={getOptimizedImageUrl(p.image_url, { width: 160 })} alt={p.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center"><Search size={16} className="text-muted-foreground/30" /></div>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-foreground/60 group-hover:text-primary text-center line-clamp-2 leading-tight transition-colors">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Categories */}
            {popularCategories.length > 0 && (
              <div className="px-4 pt-3 pb-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Popular Categories</h3>
                <div className="grid grid-cols-2 gap-2">
                  {popularCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => handleCatClick(cat.slug)}
                      className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl bg-muted/30 hover:bg-primary/5 border border-border/30 transition-colors text-left group"
                    >
                      {cat.image_url ? (
                        <img src={getOptimizedImageUrl(cat.image_url, { width: 72 })} alt={cat.name} className="w-9 h-9 rounded-lg object-cover shrink-0" loading="lazy" decoding="async" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-muted shrink-0" />
                      )}
                      <span className="text-xs font-medium text-foreground/80 group-hover:text-primary transition-colors flex-1 line-clamp-2 leading-tight">{cat.name}</span>
                      <ArrowUpRight size={12} className="text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {!showIdle && !aiActive && (
          <div className="animate-fade-in">
            {isSearching && (
              <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted-foreground">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Searching...
              </div>
            )}

            {!isSearching && searchResults.cats.length > 0 && (
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Categories</p>
                <div className="flex gap-2 flex-wrap">
                  {searchResults.cats.map(cat => (
                    <button key={cat.id} onClick={() => handleCatClick(cat.slug)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/40 hover:bg-primary/10 border border-border/30 transition-colors group">
                      {cat.image_url && <img src={getOptimizedImageUrl(cat.image_url, { width: 48 })} alt={cat.name} className="w-6 h-6 rounded-full object-cover shrink-0" loading="lazy" decoding="async" />}
                      <span className="text-xs font-medium text-foreground/80 group-hover:text-primary transition-colors"><HighlightMatch text={cat.name} query={debouncedSearch} /></span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isSearching && searchResults.subs.length > 0 && (
              <div className={`px-4 pt-2 pb-1 ${searchResults.cats.length > 0 ? "border-t border-border/30 mt-2" : ""}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Subcategories</p>
                <div className="flex gap-2 flex-wrap">
                  {searchResults.subs.map(sub => (
                    <button key={sub.id} onClick={() => handleCatClick(sub.slug)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/40 hover:bg-primary/10 border border-border/30 transition-colors group">
                      {sub.image_url && <img src={getOptimizedImageUrl(sub.image_url, { width: 48 })} alt={sub.name} className="w-6 h-6 rounded-full object-cover shrink-0" loading="lazy" decoding="async" />}
                      <span className="text-xs font-medium text-foreground/80 group-hover:text-primary transition-colors"><HighlightMatch text={sub.name} query={debouncedSearch} /></span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isSearching && searchResults.products.length > 0 && (
              <div className={`px-4 pt-2 pb-4 ${(searchResults.cats.length > 0 || searchResults.subs.length > 0) ? "border-t border-border/30 mt-2" : ""}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Products</p>
                <div className="grid grid-cols-2 gap-3">
                  {searchResults.products.map(p => (
                    <button key={p.id} onClick={() => handleSelect(p.slug)} className="flex flex-col rounded-2xl overflow-hidden bg-card border border-border/40 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 text-left group">
                      <div className="aspect-square w-full overflow-hidden bg-muted/30">
                        {p.image_url ? (
                          <img src={getOptimizedImageUrl(p.image_url, { width: 320 })} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out" loading="lazy" decoding="async" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Search size={22} className="text-muted-foreground/20" /></div>
                        )}
                      </div>
                      <div className="px-3 py-2.5 space-y-1">
                        <p className="text-[13px] font-semibold text-foreground/90 line-clamp-2 leading-snug group-hover:text-primary transition-colors"><HighlightMatch text={p.name} query={debouncedSearch} /></p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm text-primary font-bold">{formatPrice(p.price)}</span>
                          {p.original_price && p.original_price > p.price && (
                            <span className="text-muted-foreground/60 line-through text-[11px]">{formatPrice(p.original_price)}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isSearching && hasResults && (
              <button onClick={handleSearch as any} className="w-full border-t border-border/40 px-4 py-3.5 text-center text-sm font-medium text-primary hover:bg-primary/5 transition-colors">
                View all results for "{debouncedSearch}" →
              </button>
            )}

            {!isSearching && !hasResults && debouncedSearch.length >= 1 && (
              <div className="px-4 py-10 text-center">
                <Search size={32} className="mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">No results found for "{debouncedSearch}"</p>
                <p className="text-xs text-muted-foreground/60 mt-1 mb-4">Let AI find the perfect gift for you</p>
                <button
                  onClick={() => runAiSearch()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2 text-xs font-semibold shadow-sm active:scale-95 transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Ask AI for "{debouncedSearch}"
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
