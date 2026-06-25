import { Link } from "@/lib/router-adapter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Gift, FolderOpen, ChevronRight } from "lucide-react";
import { slugify } from "@/lib/utils";

interface Props {
  category?: string | null;
  giftCategoryIds?: string[] | null;
}

const BlogGiftSidebar = ({ category, giftCategoryIds }: Props) => {
  const ids = giftCategoryIds && giftCategoryIds.length > 0 ? giftCategoryIds : null;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["blog-gift-sidebar-cats", category, ids?.join(",") || ""],
    queryFn: async () => {
      // 1) Manual selection wins
      if (ids) {
        const { data: cats } = await supabase
          .from("categories")
          .select("id, name, slug, image_url")
          .in("id", ids)
          .eq("is_active", true);
        // preserve admin order
        const ordered = ids
          .map((id) => (cats || []).find((c: any) => c.id === id))
          .filter(Boolean) as any[];
        return ordered.map((c) => ({
          name: c.name,
          image_url: c.image_url,
          href: `/product-category/${c.slug}`,
        }));
      }

      // 2) Auto match by blog category keyword (subcategories first)
      if (category) {
        const { data: subs } = await supabase
          .from("subcategories")
          .select("id, name, slug, image_url, categories(slug)")
          .eq("is_active", true)
          .ilike("name", `%${category}%`)
          .limit(6);
        if (subs && subs.length >= 4) {
          return subs.map((s: any) => ({
            name: s.name,
            image_url: s.image_url,
            href: s.categories?.slug ? `/product-category/${s.categories.slug}/${s.slug}` : `/shop?subcategory=${s.slug}`,
          }));
        }
      }

      // 3) Fallback to top categories
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name, slug, image_url, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(6);
      return (cats || []).map((c: any) => ({
        name: c.name,
        image_url: c.image_url,
        href: `/product-category/${c.slug}`,
      }));
    },
  });

  if (!isLoading && items.length === 0) return null;

  return (
    <aside className="lg:sticky lg:top-24 self-start space-y-6">
      {/* Gift Ideas Card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
          <Gift size={16} className="text-primary" />
          <h3 className="font-display font-semibold text-sm">Gift Ideas</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-2 gap-px bg-border">
          {(isLoading ? Array.from({ length: 6 }) : items).map((it: any, i: number) => (
            <Link
              key={i}
              to={it?.href || "#"}
              className="group bg-card p-2.5 flex flex-col hover:bg-muted/40 transition-colors"
            >
              <div className="aspect-square overflow-hidden rounded-md bg-muted mb-2">
                {it?.image_url ? (
                  <img
                    src={it.image_url}
                    alt={it.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full animate-pulse bg-muted" />
                )}
              </div>
              {it && (
                <p className="text-[12px] text-center leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {it.name}
                </p>
              )}
            </Link>
          ))}
        </div>
        <Link
          to="/shop"
          className="block text-center text-xs font-medium text-primary py-2.5 border-t border-border hover:bg-primary/5 transition-colors"
        >
          View all gifts →
        </Link>
      </div>

      {/* Blog Categories Card */}
      <BlogCategories />
    </aside>
  );
};

const BlogCategories = () => {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["blog-sidebar-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("category")
        .eq("is_published", true)
        .not("category", "is", null);
      if (error) throw error;
      const map = new Map<string, number>();
      (data || []).forEach((b: any) => {
        if (b.category) map.set(b.category, (map.get(b.category) || 0) + 1);
      });
      return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    },
  });

  if (!isLoading && categories.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
        <FolderOpen size={16} className="text-primary" />
        <h3 className="font-display font-semibold text-sm">Blog Categories</h3>
      </div>
      <div className="divide-y divide-border/40">
        {(isLoading ? Array.from({ length: 5 }) : categories).map((entry: any, i: number) => (
          <Link
            key={i}
            to={entry ? `/blog/category/${slugify(entry[0])}` : "#"}
            className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-foreground">
              <ChevronRight size={14} className="text-primary" />
              {entry?.[0] || <span className="w-16 h-3 bg-muted animate-pulse rounded" />}
            </span>
            {entry && (
              <span className="text-muted-foreground text-xs">({entry[1]})</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BlogGiftSidebar;
