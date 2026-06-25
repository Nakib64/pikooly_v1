import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useDeliveryModes,
  useDeliveryCities,
  useCategoryDeliveryModes,
  useSubcategoryDeliveryModes,
  useDeliveryExclusions,
  modeCharge,
  resolveModeForCity,
  effectiveCharge,
  isModeExcluded,
  pickFallbackMode,
  type DeliveryMode,
} from "@/hooks/useDeliveryModes";

const CITY_STORAGE_KEY = "pikooly_delivery_city";
const THANA_STORAGE_KEY = "pikooly_delivery_thana";

export interface DeliveryGroup {
  mode: DeliveryMode;
  productIds: string[];
  productNames: string[];
  charge: number;
}

interface CartItemLike {
  product: { id: string; name: string; categoryId?: string | null };
}

/**
 * Splits cart items into delivery groups based on each product's category → delivery mode.
 * Each unique mode = one shipment with its own charge.
 */
export const useCheckoutDelivery = (items: CartItemLike[], cityOverride?: string) => {
  const { data: modes = [] } = useDeliveryModes();
  const { data: cities = [] } = useDeliveryCities();
  const { data: catModes = [] } = useCategoryDeliveryModes();
  const { data: subModes = [] } = useSubcategoryDeliveryModes();
  const { data: exclusions = [] } = useDeliveryExclusions();

  const selectedCity =
    cityOverride ?? (typeof window !== "undefined" ? localStorage.getItem(CITY_STORAGE_KEY) || undefined : undefined);
  const selectedThana = typeof window !== "undefined" ? localStorage.getItem(THANA_STORAGE_KEY) || undefined : undefined;

  // Resolve each cart product's category_id + subcategories + delivery override
  const productIds = items.map((i) => i.product.id).filter((id) => !id.startsWith("bouquet-"));
  const { data: productMeta = [] } = useQuery({
    queryKey: ["checkout-prod-meta", productIds.sort().join(",")],
    queryFn: async () => {
      if (!productIds.length) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, category_id, subcategory_id, delivery_mode_id, product_subcategories(subcategory_id)")
        .in("id", productIds);
      if (error) throw error;
      return data || [];
    },
    enabled: productIds.length > 0,
  });

  const groups = useMemo<DeliveryGroup[]>(() => {
    if (!modes.length || !items.length) return [];
    const activeModes = modes.filter((m) => m.is_active);
    const defaultMode = activeModes.find((m) => m.key === "standard") || activeModes[0];
    if (!defaultMode) return [];

    const catLookup = new Map(catModes.map((cm) => [cm.category_id, cm]));
    const subLookup = new Map(subModes.map((sm) => [sm.subcategory_id, sm]));
    const metaLookup = new Map(productMeta.map((p: any) => [p.id, p]));

    const byMode = new Map<string, DeliveryGroup>();

    items.forEach((item) => {
      const meta: any = metaLookup.get(item.product.id) || {};
      const catId =
        (item.product as any).categoryId ||
        (item.product as any).category_id ||
        meta.category_id ||
        null;
      const subIds: string[] = [];
      if (meta.subcategory_id) subIds.push(meta.subcategory_id);
      if (Array.isArray(meta.product_subcategories)) {
        meta.product_subcategories.forEach((ps: any) => {
          if (ps?.subcategory_id && !subIds.includes(ps.subcategory_id)) subIds.push(ps.subcategory_id);
        });
      }
      const subMap = subIds.map((id) => subLookup.get(id)).find(Boolean);
      const overrideId: string | undefined = meta.delivery_mode_id || undefined;
      let primary: DeliveryMode | undefined;
      let mappingFallbackId: string | null | undefined;
      if (overrideId) {
        primary = activeModes.find((m) => m.id === overrideId);
      } else {
        const mapping = subMap || (catId ? catLookup.get(catId) : null);
        primary = mapping ? activeModes.find((m) => m.id === mapping.mode_id) : undefined;
        mappingFallbackId = mapping?.fallback_mode_id;
      }
      const fb = pickFallbackMode(activeModes, primary, mappingFallbackId);
      const citiesForPrimary = primary
        ? cities.filter((c) => c.mode_id === primary!.id).map((c) => c.city_name)
        : [];
      const rowsForPrimary = primary ? cities.filter((c) => c.mode_id === primary!.id) : [];
      let mode =
        resolveModeForCity(primary, fb, selectedCity, citiesForPrimary, selectedThana, rowsForPrimary) || defaultMode;
      // Apply per-product / per-subcategory / per-category exclusions
      if (
        isModeExcluded(mode.id, exclusions, item.product.id, subIds, selectedCity, selectedThana, catId) &&
        fb
      ) {
        mode = fb;
      }
      const key = mode.id;
      if (!byMode.has(key)) {
        byMode.set(key, { mode, productIds: [], productNames: [], charge: effectiveCharge(mode, cities, selectedCity, selectedThana) });
      }
      const g = byMode.get(key)!;
      g.productIds.push(item.product.id);
      g.productNames.push(item.product.name);
    });

    return Array.from(byMode.values()).sort((a, b) => a.mode.sort_order - b.mode.sort_order);
  }, [modes, cities, catModes, subModes, exclusions, productMeta, items, selectedCity, selectedThana]);

  // Policy: even when the cart splits into multiple shipments by item type,
  // the customer is only charged ONE shipping fee (the highest group charge).
  const isSplit = groups.length > 1;
  const totalDeliveryFee = groups.length
    ? Math.max(...groups.map((g) => g.charge))
    : 0;
  const primaryLabel = groups.map((g) => g.mode.name).join(" + ");

  return { groups, totalDeliveryFee, isSplit, primaryLabel };
};
