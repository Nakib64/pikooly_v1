// Minimal stub kept only for type compatibility after delivery simplification.
// The new global delivery system lives in `useDeliveryPresets`.

export interface DistrictFees {
  id?: string;
  same_day_fee?: number | null;
  next_day_fee?: number | null;
  delivery_fee?: number | null;
  same_day_available?: boolean | null;
  next_day_available?: boolean | null;
}

export interface CategoryDeliveryFee {
  category_id: string;
  same_day_fee?: number | null;
  next_day_fee?: number | null;
}

export function resolveEffectiveDeliveryFees(
  district: DistrictFees | null | undefined,
  _categoryFees: CategoryDeliveryFee[] = [],
  _productCategoryIds: string[] = []
): DistrictFees | null {
  return district ?? null;
}

export function getEarliestDeliveryLabel(_product?: any, _district?: any): string {
  return "";
}
