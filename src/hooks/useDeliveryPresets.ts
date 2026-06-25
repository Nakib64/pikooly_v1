import { useSiteSettings } from "@/hooks/useSiteSettings";

export type DeliveryType = "same_day" | "next_day" | "standard" | "economy";

export interface DeliveryPreset {
  type: DeliveryType;
  label: string;
  fee: number;
  days?: number | null;
  eta: string;
}

const TYPE_LABELS: Record<DeliveryType, string> = {
  same_day: "Same Day Delivery",
  next_day: "Next Day Delivery",
  standard: "Standard Delivery",
  economy: "Economy Delivery",
};

const DEFAULT_FEES: Record<DeliveryType, number> = {
  same_day: 250,
  next_day: 150,
  standard: 120,
  economy: 80,
};

const DEFAULT_DAYS: Record<DeliveryType, number | null> = {
  same_day: 0,
  next_day: 1,
  standard: 3,
  economy: 5,
};

const fmtEta = (type: DeliveryType, days: number | null) => {
  if (type === "same_day") return "Today";
  if (type === "next_day") return "Tomorrow";
  if (!days || days <= 0) return "Soon";
  return days === 1 ? "In 1 day" : `In ${days} days`;
};

/**
 * Single source of truth for delivery options. Admin sets 4 prices in
 * Settings → Delivery Presets and customers pick one at checkout.
 */
export const useDeliveryPresets = (): DeliveryPreset[] => {
  const { settings } = useSiteSettings();

  const types: DeliveryType[] = ["same_day", "next_day", "standard", "economy"];

  return types.map((type) => {
    const feeRaw = settings[`delivery_preset_${type}_fee`];
    const daysRaw = settings[`delivery_preset_${type}_days`];
    const fee = feeRaw && !isNaN(parseFloat(feeRaw)) ? parseFloat(feeRaw) : DEFAULT_FEES[type];
    const days =
      daysRaw && !isNaN(parseInt(daysRaw)) ? parseInt(daysRaw) : DEFAULT_DAYS[type];
    return {
      type,
      label: TYPE_LABELS[type],
      fee,
      days,
      eta: fmtEta(type, days),
    };
  });
};
