import { useEffect, useRef, useState } from "react";
import { useLocation } from "@/lib/router-adapter";

/**
 * Slim top progress bar that provides INSTANT visual feedback the moment a
 * user clicks (or activates) an internal link, then completes once the new
 * route has mounted. This bridges the gap between the click and the Suspense
 * fallback / new page render so the app never feels frozen.
 */
const NavigationProgress = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timersRef = useRef<number[]>([]);
  const lastPathRef = useRef(location.pathname + location.search);

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  const start = () => {
    clearTimers();
    setVisible(true);
    setProgress(8);
    // Trickle up so it always looks alive.
    timersRef.current.push(window.setTimeout(() => setProgress(35), 80));
    timersRef.current.push(window.setTimeout(() => setProgress(60), 350));
    timersRef.current.push(window.setTimeout(() => setProgress(78), 900));
    timersRef.current.push(window.setTimeout(() => setProgress(88), 1800));
  };

  const finish = () => {
    clearTimers();
    setProgress(100);
    timersRef.current.push(
      window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 280)
    );
  };

  useEffect(() => {
    const onPointer = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if (a.target && a.target !== "_self") return;
      const me = e as MouseEvent;
      if (me.metaKey || me.ctrlKey || me.shiftKey || me.altKey || me.button === 1) return;
      const href = a.getAttribute("href");
      if (!href) return;
      if (href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const current = window.location.pathname + window.location.search;
      const dest = href.split("#")[0];
      if (dest === current) return;
      start();
    };
    document.addEventListener("click", onPointer, { capture: true });
    document.addEventListener("touchstart", onPointer, { capture: true, passive: true } as any);
    return () => {
      document.removeEventListener("click", onPointer, { capture: true } as any);
      document.removeEventListener("touchstart", onPointer, { capture: true } as any);
    };
  }, []);

  // When the route actually changes, complete the bar.
  useEffect(() => {
    const key = location.pathname + location.search;
    if (key === lastPathRef.current && !visible) return;
    lastPathRef.current = key;
    if (visible) finish();
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[100] h-[2px] pointer-events-none"
    >
      <div
        className="h-full origin-left"
        style={{
          width: `${progress}%`,
          background:
            "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 100%)",
          boxShadow: "0 0 8px hsl(var(--primary) / 0.6)",
          transition: "width 280ms ease-out, opacity 280ms ease-out",
          opacity: progress >= 100 ? 0 : 1,
        }}
      />
    </div>
  );
};

export default NavigationProgress;
