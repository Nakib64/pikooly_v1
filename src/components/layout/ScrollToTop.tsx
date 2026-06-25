import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "@/lib/router-adapter";

/**
 * Scrolls to top on route change. Optimized:
 * - Only triggers on pathname/hash change (NOT search) so filters/query params
 *   don't yank Shop/Search pages back to top.
 * - Skips work when already at top.
 * - Single sync scroll + one rAF fallback (no redundant 50ms timeout).
 * - scrollRestoration set once at mount.
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();
  const lastPath = useRef<string>("");

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    // Back/forward → let browser handle it
    if (navType === "POP") {
      lastPath.current = pathname;
      return;
    }

    // In-page anchor → scroll to element
    if (hash) {
      const id = hash.slice(1);
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "auto", block: "start" });
      });
      lastPath.current = pathname;
      return;
    }

    // Skip if pathname didn't actually change (hash-only or initial mount at top)
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    // Skip if already at top
    if (window.scrollY === 0) return;

    window.scrollTo(0, 0);
    // Single rAF fallback for lazy content shifting layout
    const raf = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash, navType]);

  return null;
};

export default ScrollToTop;
