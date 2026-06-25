import { useEffect, useState, useCallback } from "react";

export type AdConsent = "accepted" | "declined" | null;

const STORAGE_KEY = "ads_consent";
const EVENT_NAME = "ads-consent-change";

const read = (): AdConsent => {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "accepted" || v === "declined" ? v : null;
};

export const useAdConsent = () => {
  const [consent, setConsent] = useState<AdConsent>(read);

  useEffect(() => {
    const handler = () => setConsent(read());
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const update = useCallback((next: AdConsent) => {
    if (next === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(EVENT_NAME));
    setConsent(next);
  }, []);

  return {
    consent,
    accepted: consent === "accepted",
    declined: consent === "declined",
    decided: consent !== null,
    accept: () => update("accepted"),
    decline: () => update("declined"),
    reset: () => update(null),
  };
};

/** Strict AdSense publisher ID format: ca-pub-<16 digits> */
export const isValidAdsensePublisherId = (id: string | undefined | null) => {
  if (!id) return false;
  return /^ca-pub-\d{16}$/.test(id.trim());
};
