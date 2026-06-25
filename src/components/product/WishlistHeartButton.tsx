import { Heart } from "lucide-react";
import { useWishlistIds, useToggleWishlist } from "@/hooks/useWishlist";

export default function WishlistHeartButton({ productId }: { productId: string }) {
  const { data: ids } = useWishlistIds();
  const toggle = useToggleWishlist();
  const liked = ids?.has(productId) ?? false;
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate({ productId, currentlyLiked: liked });
      }}
      className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-[0_4px_14px_-2px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] hover:scale-110 active:scale-95 transition-transform"
      aria-label={liked ? "Remove from Wishlist" : "Add to Wishlist"}
    >
      <Heart
        size={17}
        className={liked ? "fill-[hsl(345_85%_58%)] text-[hsl(345_85%_58%)]" : "text-foreground/70"}
        strokeWidth={2}
      />
    </button>
  );
}
