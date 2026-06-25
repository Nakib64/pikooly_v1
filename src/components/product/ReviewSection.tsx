import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface ReviewSectionProps {
  productId: string;
}

const ReviewSection = ({ productId }: ReviewSectionProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [customerName, setCustomerName] = useState("");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reviews").insert({
        product_id: productId,
        user_id: user?.id || null,
        customer_name: customerName.trim(),
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Your review has been submitted! It will be displayed after admin approval.");
      setRating(0);
      setComment("");
      setCustomerName("");
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
    },
    onError: () => {
      toast.error("Failed to submit review.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please give a rating.");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    submitReview.mutate();
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  return (
    <section className="mt-10 sm:mt-16">
      <h2 className="text-xl sm:text-2xl font-display font-bold mb-6">Customer Reviews</h2>

      {/* Summary */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl font-bold text-foreground">{avgRating}</span>
        <div>
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} className={i < Math.round(Number(avgRating)) ? "fill-amber-400 text-amber-400" : "text-border"} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{reviews.length} reviews</p>
        </div>
      </div>

      {/* Review Form */}
      <form onSubmit={handleSubmit} className="border border-border rounded-xl p-4 sm:p-6 mb-8 bg-card">
          <h3 className="text-sm font-semibold mb-3">Write a Review</h3>
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5"
              >
                <Star
                  size={24}
                  className={
                    s <= (hoverRating || rating)
                      ? "fill-amber-400 text-amber-400 transition-colors"
                      : "text-border transition-colors"
                  }
                />
              </button>
            ))}
          </div>
          <Input
            placeholder="Your name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            maxLength={100}
            className="mb-3"
          />
          <Textarea
            placeholder="Write your review (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={3}
            className="mb-3"
          />
          <Button type="submit" disabled={submitReview.isPending} size="sm">
            {submitReview.isPending ? "Submitting..." : "Submit Review"}
          </Button>
        </form>

      {/* Reviews List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="border border-border rounded-lg p-4 bg-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-foreground">{r.customer_name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("en-GB")}
                </span>
              </div>
              <div className="flex items-center gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} className={i < r.rating ? "fill-amber-400 text-amber-400" : "text-border"} />
                ))}
              </div>
              {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ReviewSection;
