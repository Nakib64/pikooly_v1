import { Link } from "@/lib/router-adapter";
import { Heart, Star } from "lucide-react";
import { memo, useMemo, useCallback } from "react";
import { useMultiCurrency } from "@/contexts/CurrencyContext";
import { getOptimizedCloudinaryUrl } from "@/lib/imageUtils";
import { parseDeliveryBadge } from "@/lib/deliveryBadge";
import { useWishlistIds, useToggleWishlist } from "@/hooks/useWishlist";


interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    original_price?: number | null;
    originalPrice?: number;
    image?: string;
    image_url?: string | null;
    rating?: number | null;
    review_count?: number | null;
    slug?: string;
    category?: string;
    badge?: string;
    inStock?: boolean;
    stock?: number;
    delivery_time?: string | null;
    is_preorder?: boolean | null;
  };
  index?: number;
}

const ProductCard = memo(({ product }: ProductCardProps) => {
  const { formatPrice } = useMultiCurrency();
  const { data: wishlistIds } = useWishlistIds();
  const toggleWishlist = useToggleWishlist();
  const liked = wishlistIds?.has(product.id) ?? false;

  const origPrice = product.original_price ?? product.originalPrice;
  const rawImg = product.image_url || product.image || "/placeholder.svg";
  const imgSrc = useMemo(() => getOptimizedCloudinaryUrl(rawImg, 360), [rawImg]);
  const linkTo = `/product/${product.slug || product.id}`;
  const deliveryBadge = useMemo(() => parseDeliveryBadge(product.delivery_time), [product.delivery_time]);
  const rating = Number(product.rating ?? 0).toFixed(1);
  const reviewCount = product.review_count ?? 0;
  const discount =
    origPrice && origPrice > product.price
      ? Math.round(((origPrice - product.price) / origPrice) * 100)
      : 0;

  const toggleLiked = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist.mutate({ productId: product.id, currentlyLiked: liked });
  }, [toggleWishlist, product.id, liked]);


  return (
    <article className="group relative flex flex-col h-full bg-transparent rounded-[20px] overflow-hidden active:scale-[0.98] transition-all duration-300">
      {/* Image - 1:1 square */}
      <Link to={linkTo} className="block relative overflow-hidden aspect-square bg-[hsl(0_0%_98%)]">
        <img
          src={imgSrc}
          alt={product.name}
          width={400}
          height={400}
          decoding="async"
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-luxe group-hover:scale-[1.04]"
          sizes="(max-width: 480px) 46vw, (max-width: 768px) 30vw, (max-width: 1024px) 22vw, 18vw"
        />
        {(product.is_preorder || (typeof product.stock === "number" && product.stock <= 0)) && (
          <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] sm:text-[11px] font-bold px-2 py-1 rounded-md shadow-sm uppercase tracking-wide">
            Pre-order
          </span>
        )}
        {deliveryBadge && (
          <span className={`absolute bottom-2 left-2 inline-flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full bg-gradient-to-br ${deliveryBadge.gradient} ${deliveryBadge.glow} ring-1 ring-white/40 backdrop-blur-sm pointer-events-none z-10`}>
            <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/25">
              <deliveryBadge.Icon size={8} className="text-white" strokeWidth={2.8} />
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-[0.04em] leading-none whitespace-nowrap drop-shadow-sm">
              {deliveryBadge.label}
            </span>
          </span>
        )}
        <button
          onClick={toggleLiked}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white border border-[hsl(0_0%_90%)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 z-10"
          aria-label="Add to Wishlist"
        >
          <Heart size={13} className={liked ? "fill-[hsl(345_85%_58%)] text-[hsl(345_85%_58%)]" : "text-[hsl(0_0%_30%)]"} strokeWidth={1.8} />
        </button>
      </Link>

      {/* Content */}
      <div className="px-2.5 py-2.5 sm:px-3 sm:py-3 flex flex-col flex-1 gap-1.5">
        {/* Title — 2 lines max */}
        <Link to={linkTo} className="block min-w-0">
          <h3 className="font-sans text-[12px] sm:text-[13px] text-[hsl(0_0%_15%)] leading-[1.3] font-normal line-clamp-2 min-h-[2.6em] list-none m-0">
            {product.name}
          </h3>
        </Link>

        {/* Price row */}
        <div className="flex items-center gap-x-1.5 min-w-0">
          <span className="font-sans font-semibold text-[hsl(280_60%_35%)] text-[13px] sm:text-[14px] leading-none tabular-nums shrink-0">
            {formatPrice(product.price)}
          </span>
          {origPrice && origPrice > product.price && (
            <span className="font-sans text-[11px] leading-none text-[hsl(0_0%_55%)] line-through tabular-nums min-w-0 truncate">
              {formatPrice(origPrice)}
            </span>
          )}
          {discount > 0 && (
            <span className="ml-auto inline-flex items-center justify-center px-1.5 h-[18px] rounded-md bg-[hsl(142_70%_94%)] text-[hsl(142_71%_32%)] text-[10px] leading-none font-semibold tabular-nums shrink-0 whitespace-nowrap font-sans">
              {discount}% OFF
            </span>
          )}
        </div>

        {/* Rating row */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 bg-[hsl(142_71%_38%)] text-white text-[10px] font-semibold px-1.5 h-[18px] rounded font-sans leading-none">
            <Star size={9} className="fill-white text-white" strokeWidth={0} />
            {rating}
          </span>
          <span className="text-[10px] text-[hsl(0_0%_45%)] font-sans leading-none">({reviewCount} Reviews)</span>
        </div>
      </div>
    </article>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
