import { Zap, Clock, Calendar, Truck, type LucideIcon } from "lucide-react";

export type DeliveryBadge = {
  label: string;
  Icon: LucideIcon;
  gradient: string;
  glow: string;
};

const EXPRESS = {
  Icon: Zap,
  gradient: "from-[hsl(28_95%_55%)] to-[hsl(14_92%_52%)]",
  glow: "shadow-[0_2px_8px_hsl(20_92%_52%/0.45)]",
};
const SAME_DAY = {
  Icon: Zap,
  gradient: "from-[hsl(142_71%_42%)] to-[hsl(160_75%_38%)]",
  glow: "shadow-[0_2px_8px_hsl(150_71%_38%/0.4)]",
};
const NEXT_DAY = {
  Icon: Calendar,
  gradient: "from-[hsl(220_85%_56%)] to-[hsl(245_82%_58%)]",
  glow: "shadow-[0_2px_8px_hsl(230_82%_55%/0.4)]",
};
const STANDARD = {
  Icon: Truck,
  gradient: "from-[hsl(0_0%_25%)] to-[hsl(0_0%_15%)]",
  glow: "shadow-[0_2px_6px_rgba(0,0,0,0.25)]",
};

/**
 * Parse a free-form delivery_time string and return a styled badge.
 * Handles: "40 min", "40 minutes", "Today 40min", "Within 1 hour",
 * "2 hrs", "Same Day", "Next Day", "Tomorrow", "Express", "Instant",
 * "2 days", "3-5 days", etc.
 */
export function parseDeliveryBadge(raw?: string | null): DeliveryBadge | null {
  if (!raw) return null;
  const txt = raw.toLowerCase().trim();
  if (!txt) return null;

  // 1) Minutes — any number followed by min/minute/mins/m (with or without space)
  const minMatch = txt.match(/(\d{1,3})\s*(?:minutes?|mins?|m)\b/);
  if (minMatch) {
    return { ...EXPRESS, label: `${minMatch[1]} Min` };
  }

  // 2) Hours — "1 hour", "within 2 hrs", "2h"
  const hourMatch = txt.match(/(\d{1,2})\s*(?:hours?|hrs?|h)\b/);
  if (hourMatch) {
    const n = parseInt(hourMatch[1], 10);
    return { ...EXPRESS, label: n === 1 ? "1 Hour" : `${n} Hours` };
  }

  // 3) Express / Instant / Urgent / ASAP keywords (no explicit time)
  if (/\b(express|instant|urgent|asap|fast|quick|rapid)\b/.test(txt)) {
    return { ...EXPRESS, label: "Express" };
  }

  // 4) Same Day / Today
  if (/\b(same\s*day|today)\b/.test(txt)) {
    return { ...SAME_DAY, label: "Same Day" };
  }

  // 5) Next Day / Tomorrow / "1 day"
  if (/\b(next\s*day|tomorrow|1\s*day)\b/.test(txt)) {
    return { ...NEXT_DAY, label: "Next Day" };
  }

  // 6) Multi-day ranges or N days — "2 days", "3-5 days", "2 to 4 days"
  const dayRange = txt.match(/(\d{1,2})\s*(?:-|to|–)\s*(\d{1,2})\s*days?/);
  if (dayRange) {
    return { ...STANDARD, Icon: Calendar, label: `${dayRange[1]}-${dayRange[2]} Days` };
  }
  const dayMatch = txt.match(/(\d{1,2})\s*days?/);
  if (dayMatch) {
    const n = parseInt(dayMatch[1], 10);
    return { ...STANDARD, Icon: Calendar, label: n === 1 ? "1 Day" : `${n} Days` };
  }

  // 7) Week(s)
  const weekMatch = txt.match(/(\d{1,2})\s*(?:weeks?|wks?)/);
  if (weekMatch) {
    const n = parseInt(weekMatch[1], 10);
    return { ...STANDARD, Icon: Calendar, label: n === 1 ? "1 Week" : `${n} Weeks` };
  }

  // Fallback — show original text trimmed (max ~14 chars), title-cased nicely
  const fallback = raw.trim().replace(/\s+/g, " ");
  const label = fallback.length > 14 ? `${fallback.slice(0, 13)}…` : fallback;
  return { ...STANDARD, label };
}
