import { useEffect, useState } from "react";

/**
 * Lightweight skeleton shown while a lazy-loaded page chunk downloads.
 * To keep navigation feel instant on cached/prefetched chunks, the skeleton
 * is delayed — if the chunk resolves within 180ms (common with hover/touch
 * prefetch), nothing flashes. Only slower loads ever see the placeholder.
 */
const PageSkeleton = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 180);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div
      aria-busy="true"
      aria-label="Loading page"
      className="w-full"
    >
      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-10">
        <div className="space-y-3 mb-6 sm:mb-8">
          <div className="h-6 sm:h-8 md:h-10 w-2/3 sm:w-1/2 rounded-md bg-muted/70 animate-pulse" />
          <div className="h-3 sm:h-4 w-1/2 sm:w-1/3 rounded-md bg-muted/50 animate-pulse" />
        </div>
        <div className="h-32 sm:h-44 md:h-56 lg:h-64 w-full rounded-xl bg-muted/60 animate-pulse mb-6 sm:mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-square w-full rounded-lg bg-muted/60 animate-pulse" />
              <div className="h-3 sm:h-4 w-3/4 rounded bg-muted/50 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-muted/40 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;
