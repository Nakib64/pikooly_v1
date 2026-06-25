import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "@/lib/router-adapter";
import { useCallback } from "react";

export function useWishlistIds() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ["wishlist-ids", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist")
        .select("product_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.product_id as string));
    },
  });
}

export function useToggleWishlist() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  const navigate = useNavigate();

  const toggle = useCallback(
    async (productId: string, currentlyLiked: boolean) => {
      if (!userId) {
        toast.error("Please sign in to use wishlist");
        navigate("/auth");
        return false;
      }
      if (currentlyLiked) {
        const { error } = await supabase
          .from("wishlist")
          .delete()
          .eq("user_id", userId)
          .eq("product_id", productId);
        if (error) {
          toast.error("Could not remove from wishlist");
          return currentlyLiked;
        }
        toast.success("Removed from wishlist");
      } else {
        const { error } = await supabase
          .from("wishlist")
          .insert({ user_id: userId, product_id: productId });
        if (error) {
          toast.error("Could not add to wishlist");
          return currentlyLiked;
        }
        toast.success("Added to wishlist");
      }
      qc.invalidateQueries({ queryKey: ["wishlist-ids", userId] });
      qc.invalidateQueries({ queryKey: ["wishlist", userId] });
      qc.invalidateQueries({ queryKey: ["wishlist-count", userId] });
      return !currentlyLiked;
    },
    [userId, qc, navigate]
  );

  return useMutation({
    mutationFn: ({ productId, currentlyLiked }: { productId: string; currentlyLiked: boolean }) =>
      toggle(productId, currentlyLiked),
  });
}
