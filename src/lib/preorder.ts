// Pre-order helper utilities
// A product is pre-order if:
//   1) is_preorder flag is explicitly true (manual override), OR
//   2) stock <= 0 (auto pre-order when out of stock)

export type PreorderProduct = {
  is_preorder?: boolean | null;
  stock?: number | null;
  preorder_note?: string | null;
  preorder_advance_percent?: number | null;
};

export const isPreorder = (p: PreorderProduct | null | undefined): boolean => {
  if (!p) return false;
  if (p.is_preorder === true) return true;
  if ((p.stock ?? 0) <= 0) return true;
  return false;
};

export const getAdvancePercent = (p: PreorderProduct | null | undefined): number => {
  const v = p?.preorder_advance_percent;
  if (typeof v === "number" && v > 0 && v <= 100) return v;
  return 50;
};

export const getPreorderNote = (p: PreorderProduct | null | undefined): string => {
  return p?.preorder_note?.trim() || "Ships in 7–10 days";
};
