import { Star, BadgeCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import SEOHead from "@/components/seo/SEOHead";

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
  const colors = [
    "hsl(142 40% 35%)", "hsl(200 40% 40%)", "hsl(280 30% 45%)", "hsl(20 50% 45%)",
    "hsl(340 40% 40%)", "hsl(160 35% 38%)", "hsl(60 40% 35%)", "hsl(240 30% 42%)"
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const timeAgo = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "Today";
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""} ago`;
};

const REVIEWS_PER_PAGE = 12;

const ReviewPageCard = ({ review }: { review: any }) => {
  const [expanded, setExpanded] = useState(false);
  const initials = getInitials(review.customer_name);
  const avatarColor = getAvatarColor(review.customer_name);
  const comment = review.comment?.trim() ?? "";
  const hasLongComment = comment.length > 60;

  return (
    <div className="bg-card border border-border/30 rounded-2xl p-5 sm:p-6 flex flex-col gap-3.5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ backgroundColor: avatarColor }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">
              {review.customer_name}
            </span>
            <BadgeCheck size={14} className="text-emerald-500 flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground flex-shrink-0">
              • {timeAgo(review.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-0.5 mt-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={13}
                className={i < review.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}
              />
            ))}
          </div>
        </div>
      </div>

      {comment && (
        <div className="min-w-0">
          <p className={`text-[13px] text-foreground/80 leading-[1.6] whitespace-normal break-words overflow-hidden ${!expanded && hasLongComment ? "line-clamp-3" : ""}`}>
            {comment}
          </p>
          {hasLongComment && (
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="text-xs text-primary font-medium mt-1 hover:underline"
            >
              {expanded ? "show less" : "read more"}
            </button>
          )}
        </div>
      )}

      {review.products && (
        <a
          href={`/product/${review.products.slug}`}
          className="flex items-center gap-2 mt-auto pt-2 border-t border-border/20 group/product"
        >
          {review.products.image_url && (
            <img
              src={review.products.image_url}
              alt={review.products.name}
              className="w-8 h-8 rounded-md object-cover flex-shrink-0"
              loading="lazy"
            />
          )}
          <span className="text-[11px] text-muted-foreground truncate group-hover/product:text-primary transition-colors">
            {review.products.name}
          </span>
        </a>
      )}
    </div>
  );
};

const Reviews = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["all-reviews", page],
    queryFn: async () => {
      const from = (page - 1) * REVIEWS_PER_PAGE;
      const to = from + REVIEWS_PER_PAGE - 1;

      const { data, error, count } = await supabase
        .from("reviews")
        .select("id, customer_name, rating, comment, created_at, products(name, slug, image_url)", { count: "exact" })
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { reviews: data, total: count ?? 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const reviews = data?.reviews ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / REVIEWS_PER_PAGE);

  return (
    <main className="pb-2 md:pb-4">
      <SEOHead
        title="Customer Reviews — Pikooly"
        description="Read verified customer reviews and ratings for Pikooly products. See what our happy customers say about our flowers, gifts, and delivery."
        canonical={`${window.location.origin}/reviews`}
      />
      <div className="section-container py-6 md:py-10">
        {/* Header */}
        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-xl md:text-3xl font-display font-bold text-foreground">
            Customer Reviews
          </h1>
          {total > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {total} review{total > 1 ? "s" : ""} from our happy customers
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            No reviews yet.
          </div>
        ) : (
          <>
            {/* Reviews Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {reviews.map((review) => (
                <ReviewPageCard key={review.id} review={review} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  // Show first, last, current, and neighbors
                  if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-9 h-9 text-sm rounded-lg border transition-colors ${
                          p === page
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border bg-card hover:bg-accent"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  }
                  // Show ellipsis
                  if (p === 2 && page > 3) return <span key={p} className="px-1 text-muted-foreground">…</span>;
                  if (p === totalPages - 1 && page < totalPages - 2) return <span key={p} className="px-1 text-muted-foreground">…</span>;
                  return null;
                })}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default Reviews;
