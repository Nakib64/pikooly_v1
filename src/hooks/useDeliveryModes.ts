import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryMode {
  id: string;
  key: string;
  name: string;
  icon: string | null;
  badge_text: string | null;
  delivery_time: string;
  charge_type: "flat" | "range";
  flat_charge: number;
  min_charge: number;
  max_charge: number;
  is_active: boolean;
  sort_order: number;
}

export interface DeliveryModeCity {
  id: string;
  mode_id: string;
  city_name: string;
  thana?: string | null;
  charge_override?: number | null;
}

const sameText = (a?: string | null, b?: string | null) =>
  (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

export interface CategoryDeliveryMode {
  id: string;
  category_id: string;
  mode_id: string;
  fallback_mode_id?: string | null;
}

/**
 * Resolve which delivery mode applies for a customer's selected city.
 * - If primary mode has a city list AND the selected city is NOT in it AND a fallback exists → use fallback.
 * - Otherwise → use primary.
 */
export const resolveModeForCity = (
  primary: DeliveryMode | undefined,
  fallback: DeliveryMode | undefined,
  selectedCity: string | undefined,
  citiesForPrimary: string[],
  selectedThana?: string | null,
  rowsForPrimary?: DeliveryModeCity[]
): DeliveryMode | undefined => {
  if (!primary) return fallback;
  if (!fallback) return primary;
  const isRestricted = citiesForPrimary.length > 0;
  if (!isRestricted) return primary;
  if (!selectedCity || selectedCity === "__other__") return fallback;
  if (rowsForPrimary?.length) {
    const hasArea = rowsForPrimary.some(
      (c) =>
        sameText(c.city_name, selectedCity) &&
        (!selectedThana || !c.thana || sameText(c.thana, selectedThana))
    );
    return hasArea ? primary : fallback;
  }
  return citiesForPrimary.some((city) => sameText(city, selectedCity)) ? primary : fallback;
};

/** Effective base charge for a mode (flat → flat_charge, range → min_charge as shown to customer). */
export const modeCharge = (m: Pick<DeliveryMode, "charge_type" | "flat_charge" | "min_charge">) =>
  m.charge_type === "flat" ? Number(m.flat_charge || 0) : Number(m.min_charge || 0);

/** Effective charge for a mode + city. If a city row has a charge_override, that wins. */
export const effectiveCharge = (
  mode: DeliveryMode,
  cityRows: DeliveryModeCity[],
  selectedCity?: string | null,
  selectedThana?: string | null
): number => {
  if (selectedCity && selectedCity !== "__other__") {
    const matchingRows = cityRows.filter((c) => c.mode_id === mode.id && sameText(c.city_name, selectedCity));
    const row = selectedThana
      ? matchingRows.find((c) => sameText(c.thana, selectedThana) && c.charge_override != null) ||
        matchingRows.find((c) => !c.thana && c.charge_override != null)
      : matchingRows.find((c) => c.charge_override != null);
    if (row && row.charge_override != null) return Number(row.charge_override);
  }
  return modeCharge(mode);
};

export const useDeliveryModes = () =>
  useQuery({
    queryKey: ["delivery-modes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_modes")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data || []) as DeliveryMode[];
    },
    staleTime: 5 * 60 * 1000,
  });

export const useDeliveryCities = () =>
  useQuery({
    queryKey: ["delivery-mode-cities"],
    queryFn: async () => {
      const pageSize = 1000;
      const allRows: DeliveryModeCity[] = [];

      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from("delivery_mode_cities")
          .select("*")
          .order("mode_id", { ascending: true })
          .order("city_name", { ascending: true })
          .order("thana", { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        allRows.push(...((data || []) as DeliveryModeCity[]));
        if (!data || data.length < pageSize) break;
      }

      return allRows;
    },
    staleTime: 5 * 60 * 1000,
  });

export const useCategoryDeliveryModes = () =>
  useQuery({
    queryKey: ["category-delivery-modes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("category_delivery_modes").select("*");
      if (error) throw error;
      return (data || []) as CategoryDeliveryMode[];
    },
    staleTime: 5 * 60 * 1000,
  });

export interface SubcategoryDeliveryMode {
  id: string;
  subcategory_id: string;
  mode_id: string;
  fallback_mode_id?: string | null;
}

export const useSubcategoryDeliveryModes = () =>
  useQuery({
    queryKey: ["subcategory-delivery-modes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subcategory_delivery_modes" as any).select("*");
      if (error) throw error;
      return (data || []) as unknown as SubcategoryDeliveryMode[];
    },
    staleTime: 5 * 60 * 1000,
  });

export interface DeliveryModeExclusion {
  id: string;
  mode_id: string;
  scope: "product" | "subcategory" | "category";
  scope_id: string;
  city_name: string;
  thana?: string | null;
}

export const useDeliveryExclusions = () =>
  useQuery({
    queryKey: ["delivery-mode-exclusions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_mode_exclusions" as any)
        .select("*");
      if (error) throw error;
      return (data || []) as unknown as DeliveryModeExclusion[];
    },
    staleTime: 5 * 60 * 1000,
  });

/**
 * Returns true if the given delivery mode is excluded for this product (or any of its subcategories/category)
 * at the customer's selected city/thana.
 */
export const isModeExcluded = (
  modeId: string | undefined,
  exclusions: DeliveryModeExclusion[],
  productId: string | undefined,
  subcategoryIds: string[],
  selectedCity: string | undefined,
  selectedThana?: string | null,
  categoryId?: string | null
): boolean => {
  if (!modeId || !selectedCity || selectedCity === "__other__") return false;
  return exclusions.some((ex) => {
    if (ex.mode_id !== modeId) return false;
    if (!sameText(ex.city_name, selectedCity)) return false;
    if (ex.thana && selectedThana && !sameText(ex.thana, selectedThana)) return false;
    if (ex.scope === "product") return !!productId && ex.scope_id === productId;
    if (ex.scope === "subcategory") return subcategoryIds.includes(ex.scope_id);
    if (ex.scope === "category") return !!categoryId && ex.scope_id === categoryId;
    return false;
  });
};

/** Pick a sensible fallback mode when the primary is excluded. */
export const pickFallbackMode = (
  activeModes: DeliveryMode[],
  primary: DeliveryMode | undefined,
  mappingFallbackId?: string | null
): DeliveryMode | undefined => {
  if (mappingFallbackId) {
    const m = activeModes.find((x) => x.id === mappingFallbackId);
    if (m) return m;
  }
  if (!primary) return activeModes[0];
  return (
    activeModes.find((m) => m.id !== primary.id && (m.key === "premium" || m.key === "safe")) ||
    activeModes.find((m) => m.id !== primary.id && m.key === "standard") ||
    activeModes.find((m) => m.id !== primary.id)
  );
};
