import { useEffect, useState } from "react";

/**
 * Returns true when the OS / browser signals `prefers-reduced-motion: reduce`,
 * OR when the user has overridden it via localStorage `reduceMotion=1`.
 * Listens for changes so the UI updates live.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("reduceMotion");
    if (stored === "1") return true;
    if (stored === "0") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");

    const recompute = () => {
      const stored = window.localStorage.getItem("reduceMotion");
      if (stored === "1") return setReduced(true);
      if (stored === "0") return setReduced(false);
      setReduced(mql.matches);
    };

    const onMql = () => recompute();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "reduceMotion") recompute();
    };
    const onCustom = () => recompute();

    mql.addEventListener?.("change", onMql);
    window.addEventListener("storage", onStorage);
    window.addEventListener("reducemotion-change", onCustom);

    return () => {
      mql.removeEventListener?.("change", onMql);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("reducemotion-change", onCustom);
    };
  }, []);

  return reduced;
}

/** Set/clear the user override. Pass `null` to follow the OS setting. */
export function setReducedMotionPreference(value: boolean | null) {
  if (typeof window === "undefined") return;
  if (value === null) {
    window.localStorage.removeItem("reduceMotion");
  } else {
    window.localStorage.setItem("reduceMotion", value ? "1" : "0");
  }
  window.dispatchEvent(new Event("reducemotion-change"));
}
