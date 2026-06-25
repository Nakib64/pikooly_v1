import { useState } from "react";
import { Sparkles, Loader2, X, Search, ArrowRight } from "lucide-react";
import { Link } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "@/hooks/use-toast";

const SUGGESTIONS = [
  { label: "Romantic gift for wife under 2500", emoji: "💝" },
  { label: "Birthday surprise for best friend", emoji: "🎂" },
  { label: "Anniversary red roses", emoji: "🌹" },
  { label: "Get well soon for mother", emoji: "🌷" },
  { label: "Eid gift for parents", emoji: "🎁" },
  { label: "Congratulations bouquet", emoji: "💐" },
];

export default function AISmartSearch() {
  const { formatCurrency } = useCurrency();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [products, setProducts] = useState<any[]>([]);

  const run = async (q?: string) => {
    const text = (q ?? query).trim();
    if (!text) return;
    setQuery(text);
    setLoading(true);
    setOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-smart-search", { body: { query: text } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setProducts((data as any).products || []);
      setReason((data as any).reason || "");
      if ((data as any)?.warning) {
        toast({ title: "AI provider issue", description: (data as any).warning });
      }
    } catch (e: any) {
      toast({ title: "AI search failed", description: e.message || "Try again", variant: "destructive" });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container mx-auto px-3 sm:px-4 py-3 sm:py-5">
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-background to-primary/5">
        <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-primary/15 blur-2xl" />

        <div className="relative p-3 sm:p-4">
          {/* Compact header row */}
          <div className="flex items-center gap-2 mb-2.5">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <h2 className="text-sm sm:text-base font-semibold leading-tight">
              Ask AI for the <span className="text-primary">perfect gift</span>
            </h2>
            <span className="ml-auto text-[9px] font-bold tracking-wider uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">Beta</span>
          </div>

          {/* Search bar */}
          <form onSubmit={(e) => { e.preventDefault(); run(); }}>
            <div className="relative flex items-center gap-1.5 rounded-full bg-background border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 shadow-sm transition-all p-1 pl-3">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Romantic anniversary gift under 3000 BDT"
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent px-0 h-9 sm:h-10"
                style={{ fontSize: 16 }}
              />
              <Button
                type="submit"
                disabled={loading || !query.trim()}
                className="rounded-full h-9 sm:h-10 px-4 shrink-0 bg-gradient-to-r from-primary to-primary/80 gap-1.5"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" /><span className="hidden sm:inline text-xs font-semibold">Search</span></>}
              </Button>
            </div>

            {/* Suggestion chips - horizontal scroll, single row */}
            <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => run(s.label)}
                  className="inline-flex items-center gap-1 text-[11px] sm:text-xs bg-background/80 hover:bg-primary hover:text-primary-foreground border border-border hover:border-primary text-foreground/80 rounded-full px-2 py-1 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{s.emoji}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </form>

          {/* Results */}
          {open && (
            <div className="mt-6 sm:mt-8 rounded-2xl bg-background/70 backdrop-blur border border-border p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-foreground/80 italic flex-1">
                    {loading ? "Thinking of the best matches…" : reason || "Here are some matches:"}
                  </p>
                </div>
                <button
                  onClick={() => { setOpen(false); setProducts([]); setReason(""); }}
                  className="text-muted-foreground hover:text-foreground rounded-full p-1 hover:bg-muted transition-colors shrink-0"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {loading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl overflow-hidden bg-muted/50 animate-pulse">
                      <div className="aspect-square bg-muted" />
                      <div className="p-2 space-y-1.5">
                        <div className="h-3 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && products.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No matches found. Try a different request.</p>
              )}

              {!loading && products.length > 0 && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {products.slice(0, 8).map((p) => (
                      <Link
                        key={p.id}
                        to={`/product/${p.slug}`}
                        className="group block rounded-xl overflow-hidden bg-background border border-border hover:border-primary hover:shadow-lg transition-all"
                      >
                        <div className="aspect-square bg-muted overflow-hidden">
                          {p.image_url && (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          )}
                        </div>
                        <div className="p-2 sm:p-2.5">
                          <p className="text-xs sm:text-sm font-medium line-clamp-2 leading-tight min-h-[2.5rem]">{p.name}</p>
                          <p className="text-xs sm:text-sm text-primary font-bold mt-1">{formatCurrency(Number(p.price) || 0)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="flex justify-center mt-4">
                    <Link
                      to="/"
                      className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:gap-2 transition-all"
                    >
                      Explore all gifts <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
