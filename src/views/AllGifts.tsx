import { useState } from "react";
import { Link } from "@/lib/router-adapter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp } from "lucide-react";
import SEOHead from "@/components/seo/SEOHead";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

const AllGifts = () => {
  const [activeTab, setActiveTab] = useState<"occasions" | "category">("occasions");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ["public-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: subcategories = [], isLoading: subsLoading } = useQuery({
    queryKey: ["public-subcategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcategories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as any[];
    },
  });

  const isLoading = catsLoading || subsLoading;

  const getTypes = (c: any): string[] =>
    (c.category_types && c.category_types.length > 0) ? c.category_types : [c.category_type].filter(Boolean);
  // Strict separation: a category appears in a tab only if explicitly marked with that type
  const occasions = categories.filter((c: any) => getTypes(c).includes("occasion"));
  const categoryItems = categories.filter((c: any) => getTypes(c).includes("category"));

  const getSubsForCat = (catId: string) =>
    subcategories.filter((s: any) => s.category_id === catId);

  const toggleCat = (catId: string) => {
    setExpandedCat(prev => (prev === catId ? null : catId));
  };

  const currentList = activeTab === "occasions" ? occasions : categoryItems;

  return (
    <main className="section-container py-4 pb-2 md:pb-4">
      <SEOHead
        title="All Gifts — Pikooly"
        description="Browse all gift categories and occasions. Find the perfect gift for every celebration at Pikooly."
        canonical={`${window.location.origin}/all-gifts`}
      />
      <nav aria-label="Breadcrumb" className="mb-3 text-xs sm:text-sm text-muted-foreground">
        <ol className="flex items-center flex-wrap gap-1">
          <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
          <li className="opacity-60">/</li>
          <li className="text-foreground font-medium">All Gifts</li>
        </ol>
      </nav>
      <h1 className="text-xl font-display font-bold text-foreground mb-4">
        All Gifts
      </h1>

      {/* Tabs */}
      <div className="flex border-b border-border mb-5">
        <button
          onClick={() => { setActiveTab("occasions"); setExpandedCat(null); }}
          className={`flex-1 pb-2.5 text-sm font-medium transition-colors ${
            activeTab === "occasions"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground"
          }`}
        >
          Shop By Occasions
        </button>
        <button
          onClick={() => { setActiveTab("category"); setExpandedCat(null); }}
          className={`flex-1 pb-2.5 text-sm font-medium transition-colors ${
            activeTab === "category"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground"
          }`}
        >
          Shop By Category
        </button>
      </div>

      <div className="space-y-3">
        {isLoading && currentList.length === 0 ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border border-border/60 rounded-xl bg-card p-3 flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-muted animate-pulse" />
              <div className="h-4 w-40 rounded bg-muted animate-pulse" />
            </div>
          ))
        ) : (<></>)}
        {currentList.map((cat: any) => {
          const subs = getSubsForCat(cat.id);
          const isExpanded = expandedCat === cat.id;
          const hasSubs = subs.length > 0;

          return (
            <div
              key={cat.id}
              className="border border-border/60 rounded-xl overflow-hidden bg-card"
            >
              {/* Category header */}
              <div className="flex items-center justify-between">
                <Link
                  to={`/product-category/${cat.slug}`}
                  className="flex items-center gap-3 flex-1 p-3"
                >
                  {activeTab === "category" && (
                    cat.image_url ? (
                      <img
                        src={getOptimizedImageUrl(cat.image_url, { width: 120 })}
                        alt={cat.name}
                        className="w-14 h-14 rounded-lg object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted" />
                    )
                  )}
                  <span className="font-medium text-foreground text-sm">
                    {cat.name}
                  </span>
                </Link>
                {hasSubs && (
                  <button
                    onClick={() => toggleCat(cat.id)}
                    className="p-3 text-muted-foreground active:scale-90 transition-transform"
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                )}
              </div>

              {/* Subcategories */}
              {hasSubs && isExpanded && (() => {
                const groups = new Map<string, any[]>();
                const ungrouped: any[] = [];
                subs.forEach((s: any) => {
                  const g = (s.mega_menu_group || "").trim();
                  if (!g) { ungrouped.push(s); return; }
                  if (!groups.has(g)) groups.set(g, []);
                  groups.get(g)!.push(s);
                });
                const groupEntries = Array.from(groups.entries());
                const hasGroups = groupEntries.length > 0;

                if (!hasGroups) {
                  return (
                    <div className="border-t border-border/40 px-3 pb-2">
                      {subs.map((sub: any) => (
                        <Link
                          key={sub.id}
                          to={`/product-category/${sub.slug}`}
                          className="flex items-center justify-between py-3 px-3 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                        >
                          <span>{sub.name}</span>
                        </Link>
                      ))}
                    </div>
                  );
                }

                return (
                  <div className="border-t border-border/40 p-2 space-y-2">
                    {groupEntries.map(([groupName, items]) => {
                      const groupKey = `${cat.id}::${groupName}`;
                      const isGroupOpen = expandedGroup === groupKey;
                      return (
                        <div key={groupKey} className="rounded-lg bg-muted/40 overflow-hidden">
                          <button
                            onClick={() => setExpandedGroup(prev => prev === groupKey ? null : groupKey)}
                            className="w-full flex items-center justify-between px-3 py-3 text-sm font-semibold text-foreground"
                          >
                            <span>{groupName}</span>
                            {isGroupOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          {isGroupOpen && (
                            <div className="bg-background/60 px-2 pb-2">
                              {items.map((sub: any) => (
                                <Link
                                  key={sub.id}
                                  to={`/product-category/${sub.slug}`}
                                  className="block py-2.5 px-3 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50"
                                >
                                  {sub.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {ungrouped.length > 0 && (
                      <div className="rounded-lg bg-muted/40 overflow-hidden">
                        <button
                          onClick={() => setExpandedGroup(prev => prev === `${cat.id}::__more` ? null : `${cat.id}::__more`)}
                          className="w-full flex items-center justify-between px-3 py-3 text-sm font-semibold text-foreground"
                        >
                          <span>More</span>
                          {expandedGroup === `${cat.id}::__more` ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        {expandedGroup === `${cat.id}::__more` && (
                          <div className="bg-background/60 px-2 pb-2">
                            {ungrouped.map((sub: any) => (
                              <Link
                                key={sub.id}
                                to={`/product-category/${sub.slug}`}
                                className="block py-2.5 px-3 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50"
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {currentList.length === 0 && (
        <p className="text-center text-muted-foreground py-10 text-sm">
          No {activeTab === "occasions" ? "occasions" : "categories"} available.
        </p>
      )}
    </main>
  );
};

export default AllGifts;
