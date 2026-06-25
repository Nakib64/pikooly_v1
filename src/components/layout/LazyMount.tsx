import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyMountProps {
  children: ReactNode;
  /** Distance (px) before the viewport when the child should mount. */
  rootMargin?: string;
  /** Minimum reserved height so layout doesn't shift before mount. */
  minHeight?: number | string;
  /** Skip observation and mount immediately (e.g. for SSR/no-IO). */
  eager?: boolean;
}

/**
 * Defers rendering of its children until the placeholder scrolls near
 * the viewport. Combined with React.lazy this means the JS chunk for
 * a below-the-fold section is not even fetched until it's needed,
 * dramatically improving TTI on long pages like the homepage.
 */
const LazyMount = ({ children, rootMargin = "400px", minHeight = 200, eager = false }: LazyMountProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = useState(eager);

  useEffect(() => {
    if (shouldMount) return;
    if (typeof IntersectionObserver === "undefined") {
      setShouldMount(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldMount(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, shouldMount]);

  return (
    <div ref={ref} style={shouldMount ? undefined : { minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight }}>
      {shouldMount ? children : null}
    </div>
  );
};

export default LazyMount;
