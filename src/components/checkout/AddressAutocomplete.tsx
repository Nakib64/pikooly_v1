import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    google?: any;
    __googleMapsLoading?: Promise<void>;
  }
}

let cachedKey: string | null = null;

async function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.google?.maps?.places) return;
  if (window.__googleMapsLoading) return window.__googleMapsLoading;

  window.__googleMapsLoading = (async () => {
    if (!cachedKey) {
      try {
        const { data } = await supabase.functions.invoke("get-maps-key");
        cachedKey = (data as any)?.key || "";
      } catch (e) {
        console.error("Failed to load maps key", e);
        cachedKey = "";
      }
    }
    if (!cachedKey) throw new Error("No Google Maps API key");

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps]");
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Maps script failed")));
        return;
      }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${cachedKey}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMaps = "1";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Maps script failed"));
      document.head.appendChild(script);
    });
  })();

  return window.__googleMapsLoading;
}

interface AddressAutocompleteProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  className?: string;
  countryRestriction?: string[]; // e.g. ["bd"]
}

export function AddressAutocomplete({
  id,
  value,
  onChange,
  placeholder = "Start typing your address...",
  required,
  maxLength,
  className,
  countryRestriction,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !inputRef.current || !window.google?.maps?.places) return;
        const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "address_components", "geometry", "name"],
          types: ["geocode"],
          ...(countryRestriction ? { componentRestrictions: { country: countryRestriction } } : {}),
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const formatted = place?.formatted_address || place?.name || inputRef.current?.value || "";
          onChange(formatted);
        });
        autocompleteRef.current = ac;
        setReady(true);
      })
      .catch((e) => console.warn("Google Maps autocomplete unavailable:", e));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={ready ? placeholder : "Type recipient address..."}
      required={required}
      maxLength={maxLength}
      className={className}
      autoComplete="off"
    />
  );
}
