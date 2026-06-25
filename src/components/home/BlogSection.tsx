import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { Calendar, ArrowRight, Clock } from "lucide-react";
import { Link } from "@/lib/router-adapter";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BlogCardSkeleton } from "@/components/ui/skeletons";
import { slugify } from "@/lib/utils";

const BlogSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["home-blogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  if (!isLoading && posts.length === 0) return null;

  const estimateReadTime = (content: string | null) => {
    if (!content) return "2 min";
    const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    return `${Math.max(1, Math.round(words / 200))} min`;
  };

  return (
    <section className="py-4 md:py-7 section-container" style={{ contain: "layout style" }}>
      <div className="flex items-end justify-between mb-3 sm:mb-4 gap-4">
        <h2 className="display-heading text-foreground font-bold leading-tight" style={{ fontSize: "clamp(1.25rem, 2vw + 0.5rem, 1.75rem)" }}>
          From Our Journal
        </h2>
        <Link to="/blog" className="btn-outline-luxe text-xs sm:text-sm shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 inline-flex items-center gap-1.5">
          View All <ArrowRight size={14} />
        </Link>
      </div>

      {/* Mobile: horizontal carousel */}
      <div className="relative md:hidden">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-4 px-4"
        >
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-[44vw] max-w-[200px] snap-start flex-shrink-0">
                  <BlogCardSkeleton />
                </div>
              ))
            : posts.map((post: any) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="w-[44vw] max-w-[200px] snap-start flex-shrink-0 group bg-card rounded-xl overflow-hidden border border-border/40 shadow-[0_1px_4px_0_hsl(var(--foreground)/0.06)] hover:border-primary/30 hover:shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.2)] transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
                >
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img src={post.image_url || "/placeholder.svg"} alt={post.title} width={200} height={150} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                    {post.category && (
                      <Link
                        to={`/blog/category/${slugify(post.category)}`}
                        className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm text-primary text-[9px] px-1.5 py-0.5 rounded font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        {post.category}
                      </Link>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                      <Calendar size={10} />
                      <time>{new Date(post.published_at || post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time>
                    </div>
                    <h3 className="font-display text-xs font-semibold group-hover:text-primary transition-colors line-clamp-2 leading-snug">{post.title}</h3>
                  </div>
                </Link>
              ))}
        </div>
      </div>

      {/* Desktop: proper grid */}
      <div className="hidden md:grid md:grid-cols-4 gap-5">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <BlogCardSkeleton key={i} />)
          : posts.slice(0, 4).map((post: any) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group bg-card rounded-xl overflow-hidden border border-border/40 shadow-[0_1px_4px_0_hsl(var(--foreground)/0.06)] hover:border-primary/30 hover:shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.2)] hover:-translate-y-1 transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] flex flex-col"
              >
                <div className="aspect-[16/10] overflow-hidden relative">
                  <img src={post.image_url || "/placeholder.svg"} alt={post.title} width={400} height={250} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                  {post.category && (
                    <Link
                      to={`/blog/category/${slugify(post.category)}`}
                      className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm text-primary text-[11px] px-2.5 py-1 rounded-full font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {post.category}
                    </Link>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      <time>{new Date(post.published_at || post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {estimateReadTime(post.content)}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-semibold group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-1.5">{post.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{post.excerpt}</p>
                  <span className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-3 group-hover:gap-2 transition-all">
                    Read More <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
};

export default BlogSection;
