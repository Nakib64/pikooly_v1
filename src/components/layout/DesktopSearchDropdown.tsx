import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { useNavigate } from "@/lib/router-adapter";
import { Search, X, TrendingUp, Clock, Sparkles, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";

const normalizeSearchText = (value?: string | null) =>
  (value || "").replace(/&amp;|&#38;|&#038;/gi, "&").replace(/&nbsp;/gi, " ").replace(/<[^>]*>/g, " ").replace(/[,%()']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60).toLowerCase();

const HighlightMatch = ({ text, query }: { text: string; query: string }): ReactNode => {
  if (!query || query.length < 1) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return <>{parts.map((part, i) => regex.test(part) ? <span key={i} className="text-primary font-bold">{part}</span> : <span key={i}>{part}</span>)}</>;
};

interface DesktopSearchDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const DesktopSearchDropdown = ({ isOpen, onClose, onOpen }: DesktopSearchDropdownProps) => {
  const navigate = useNavigate();
  const { formatPrice } = useMultiCurrency();
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiActive, setAiActive] = useState(false);
  const [aiReason, setAiReason] = useState("");
  const [aiProducts, setAiProducts] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("recent-searches");
      if (stored) setRecentSearches(JSON.parse(stored).slice(0, 6));
    } catch {}
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
      setDebouncedSearch("");
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(normalizeSearchText(searchQuery)), 200);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const saveRecentSearch = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean || clean.length < 2) return;
    setRecentSearches(prev => {
      const updated = [clean, ...prev.filter(s => s.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
      try { localStorage.setItem("recent-searches", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try { localStorage.removeItem("recent-searches"); } catch {}
  }, []);

  // Search results
  const { data: searchResults = { products: [], cats: [] }, isFetching } = useQuery({
    queryKey: ["desktop-search", debouncedSearch],
    queryFn: async () => {
      const term = debouncedSearch;
      if (!term) return { products: [], cats: [] };
      const [prodRes, catRes] = await Promise.all([
        supabase.from("products").select("id, name, slug, price, original_price, image_url").eq("is_active", true).or(`name.ilike.%${term}%,slug.ilike.%${term}%`).limit(5),
        supabase.from("categories").select("id, name, slug, image_url").eq("is_active", true).ilike("name", `%${term}%`).limit(4),
      ]);
      return { products: prodRes.data || [], cats: catRes.data || [] };
    },
    enabled: debouncedSearch.length >= 1 && isOpen,
    staleTime: 60 * 1000,
  });

  // Trending products
  const { data: trendingProducts = [] } = useQuery({
    queryKey: ["desktop-search-trending"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, slug, price, image_url").eq("is_active", true).eq("is_featured", true).order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Popular categories
  const { data: popularCategories = [] } = useQuery({
    queryKey: ["desktop-search-popular-cats"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, slug, image_url").eq("is_active", true).eq("show_in_homepage", true).order("display_order").limit(6);
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) { saveRecentSearch(q); onClose(); navigate(`/?search=${encodeURIComponent(q)}`); }
  };

  const handleSelect = (slug: string) => { saveRecentSearch(searchQuery); onClose(); navigate(`/product/${slug}`); };
  const handleCatClick = (slug: string) => { saveRecentSearch(searchQuery); onClose(); navigate(`/product-category/${slug}`); };

  const runAiSearch = useCallback(async (q?: string) => {
    const text = (q ?? searchQuery).trim();
    if (!text) return;
    setSearchQuery(text);
    setAiActive(true);
    setAiLoading(true);
    setAiProducts([]);
    setAiReason("");
    onOpen();
    try {
      const { data, error } = await supabase.functions.invoke("ai-smart-search", { body: { query: text } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAiProducts((data as any).products || []);
      setAiReason((data as any).reason || "");
      saveRecentSearch(text);
      if ((data as any)?.warning) toast({ title: "AI provider issue", description: (data as any).warning });
    } catch (e: any) {
      setAiReason("AI provider issue. Try again or switch provider in Admin Settings.");
      toast({ title: "AI search failed", description: e.message || "Try again", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }, [searchQuery, onOpen, saveRecentSearch]);

  const showIdle = debouncedSearch.length === 0 && !aiActive;
  const hasResults = searchResults.products.length > 0 || searchResults.cats.length > 0;

  return (
    <div ref={dropdownRef} className="hidden lg:block flex-1 min-w-0 max-w-[520px] xl:max-w-[640px] mx-auto relative z-[60]">
      {/* Search Input */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={17} />
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          enterKeyHint="search"
          inputMode="search"
          maxLength={60}
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value.slice(0, 60)); if (aiActive) setAiActive(false); }}
          onFocus={onOpen}
          placeholder={t("search_placeholder")}
          className="w-full min-w-0 rounded-full border border-border/40 bg-muted/30 py-2.5 pl-11 pr-[92px] text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 focus:border-primary/40 focus:bg-card focus:ring-1 focus:ring-primary/10 hover:border-primary/40 hover:bg-card hover:ring-1 hover:ring-primary/10 lg:py-2.5"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchQuery && (
            <button type="button" onClick={() => { setSearchQuery(""); setAiActive(false); setAiProducts([]); setAiReason(""); }} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => runAiSearch()}
            disabled={aiLoading || !searchQuery.trim()}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50 hover:opacity-90 transition-all"
            aria-label="Ask AI"
          >
            {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            <span>AI</span>
          </button>
        </div>
      </form>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/10 z-[-1]" onClick={onClose} />
          
          <div className="absolute top-full left-0 right-0 mt-2 w-full min-w-0 bg-card rounded-xl border border-border/50 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] max-h-[70vh] overflow-y-auto z-[60] animate-fade-in">
            {/* AI Results */}
            {aiActive && (
              <div className="p-3 border-b border-border/30 bg-gradient-to-br from-primary/5 via-card to-primary/5">
                <div className="flex items-start gap-2 mb-2.5">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground/80 italic flex-1 leading-relaxed">
                    {aiLoading ? "Thinking of the best matches for you…" : aiReason || "Here are AI-picked matches:"}
                  </p>
                  <button onClick={() => { setAiActive(false); setAiProducts([]); setAiReason(""); }} className="shrink-0 text-muted-foreground hover:text-foreground p-0.5" aria-label="Close AI">
                    <X size={14} />
                  </button>
                </div>
                {aiLoading && (
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="rounded-lg overflow-hidden bg-muted/40 animate-pulse">
                        <div className="aspect-square bg-muted" />
                        <div className="p-1.5 space-y-1"><div className="h-2.5 bg-muted rounded w-3/4" /></div>
                      </div>
                    ))}
                  </div>
                )}
                {!aiLoading && aiProducts.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {aiProducts.slice(0, 8).map((p: any) => (
                      <button key={p.id} onClick={() => handleSelect(p.slug)} className="flex flex-col rounded-lg overflow-hidden bg-card border border-border/40 hover:border-primary/40 hover:shadow-md transition-all text-left group">
                        <div className="aspect-square w-full overflow-hidden bg-muted/30">
                          {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                        </div>
                        <div className="px-1.5 py-1">
                          <p className="text-[11px] font-semibold text-foreground/90 line-clamp-2 leading-snug group-hover:text-primary transition-colors">{p.name}</p>
                          <p className="text-[11px] text-primary font-bold mt-0.5">{formatPrice(Number(p.price) || 0)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {!aiLoading && aiProducts.length === 0 && aiReason && (
                  <p className="text-xs text-muted-foreground py-2 text-center">No AI matches. Try rewording.</p>
                )}
              </div>
            )}
            {/* Idle State */}
            {showIdle && (
              <div className="p-4">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={12} /> Recent Searches
                      </h4>
                      <button onClick={clearRecentSearches} className="text-[11px] text-primary hover:underline">Clear</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recentSearches.map((term, i) => (
                        <button
                          key={i}
                          onClick={() => { setSearchQuery(term); }}
                          className="px-3 py-1.5 rounded-full bg-muted/50 hover:bg-primary/10 text-xs font-medium text-foreground/70 hover:text-primary transition-colors border border-border/30"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending Gifts */}
                {trendingProducts.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                      <TrendingUp size={12} className="text-primary" /> Trending Gifts
                    </h4>
                    <div className="flex gap-3">
                      {trendingProducts.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleSelect(p.slug)}
                          className="flex flex-col items-center gap-1.5 group w-[72px] shrink-0"
                        >
                          <div className="w-[64px] h-[64px] rounded-xl overflow-hidden ring-1 ring-border/40 group-hover:ring-primary/40 transition-all">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full bg-muted" />
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
                  <div>
                    <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2.5">Popular Categories</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {popularCategories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => handleCatClick(cat.slug)}
                          className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-primary/5 transition-colors text-left group"
                        >
                          {cat.image_url ? (
                            <img src={cat.image_url} alt={cat.name} className="w-8 h-8 rounded-lg object-cover shrink-0" loading="lazy" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
                          )}
                          <span className="text-xs font-medium text-foreground/70 group-hover:text-primary transition-colors truncate">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search Results */}
            {!showIdle && (
              <div className="p-3">
                {isFetching && (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground justify-center">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Searching...
                  </div>
                )}

                {!isFetching && searchResults.cats.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5 px-1">Categories</p>
                    {searchResults.cats.map(cat => (
                      <button key={cat.id} onClick={() => handleCatClick(cat.slug)} className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-primary/5 transition-colors text-left group">
                        {cat.image_url && <img src={cat.image_url} alt={cat.name} className="w-8 h-8 rounded-lg object-cover shrink-0" loading="lazy" />}
                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors"><HighlightMatch text={cat.name} query={debouncedSearch} /></span>
                      </button>
                    ))}
                  </div>
                )}

                {!isFetching && searchResults.products.length > 0 && (
                  <div className={searchResults.cats.length > 0 ? "border-t border-border/30 pt-2" : ""}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5 px-1">Products</p>
                    {searchResults.products.map(p => (
                      <button key={p.id} onClick={() => handleSelect(p.slug)} className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-primary/5 transition-colors text-left group">
                        {p.image_url && <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0 ring-1 ring-border/30" loading="lazy" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors"><HighlightMatch text={p.name} query={debouncedSearch} /></p>
                          <p className="text-xs text-primary font-semibold mt-0.5">
                            {formatPrice(p.price)}
                            {p.original_price && p.original_price > p.price && (
                              <span className="text-muted-foreground line-through ml-1.5 font-normal">{formatPrice(p.original_price)}</span>
                            )}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!isFetching && hasResults && (
                  <button onClick={handleSearch as any} className="w-full border-t border-border/30 mt-2 pt-2.5 pb-1 text-center text-xs font-medium text-primary hover:underline">
                    View all results for "{debouncedSearch}" →
                  </button>
                )}

                {!isFetching && !hasResults && debouncedSearch.length >= 1 && (
                  <div className="py-6 text-center">
                    <Search size={24} className="mx-auto text-muted-foreground/20 mb-2" />
                    <p className="text-sm text-muted-foreground">No results for "{debouncedSearch}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DesktopSearchDropdown;
