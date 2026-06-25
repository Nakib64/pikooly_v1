import { useRef, memo, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductCarouselProps {
  children: ReactNode;
  className?: string;
}

const ProductCarousel = memo(({ children, className = "" }: ProductCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const w = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: dir === "left" ? -w : w, behavior: "smooth" });
  };

  return (
    <div className={`relative group/carousel ${className}`}>
      <button
        onClick={() => scroll("left")}
        className="hidden md:flex absolute -left-2 lg:-left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 lg:w-10 lg:h-10 items-center justify-center rounded-full bg-card border border-border/50 shadow-md text-foreground/60 hover:text-foreground hover:shadow-lg transition-all opacity-0 group-hover/carousel:opacity-100"
        aria-label="Scroll left"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => scroll("right")}
        className="hidden md:flex absolute -right-2 lg:-right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 lg:w-10 lg:h-10 items-center justify-center rounded-full bg-card border border-border/50 shadow-md text-foreground/60 hover:text-foreground hover:shadow-lg transition-all opacity-0 group-hover/carousel:opacity-100"
        aria-label="Scroll right"
      >
        <ChevronRight size={18} />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-3 sm:gap-3.5 md:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-1 px-1"
        style={{ scrollPaddingInline: "4px" }}
      >
        {children}
      </div>
    </div>
  );
});

ProductCarousel.displayName = "ProductCarousel";

export default ProductCarousel;
