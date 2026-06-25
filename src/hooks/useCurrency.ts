import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useCallback } from "react";

export const useCurrency = () => {
  const { settings } = useSiteSettings();

  const symbol = settings.currency_symbol || "৳";
  const position = settings.currency_position || "left";
  const decSep = settings.decimal_separator || ".";
  const thousandSep = settings.thousand_separator || ",";

  const formatCurrency = useCallback(
    (amount: number | string, options?: { decimals?: number }) => {
      const num = typeof amount === "string" ? parseFloat(amount) : amount;
      if (isNaN(num)) return `${symbol}0`;

      const decimals = options?.decimals ?? 0;
      const fixed = num.toFixed(decimals);
      const [intPart, decPart] = fixed.split(".");

      // Add thousand separators
      const formatted = thousandSep
        ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep)
        : intPart;

      const result = decPart ? `${formatted}${decSep}${decPart}` : formatted;

      return position === "right" ? `${result}${symbol}` : `${symbol}${result}`;
    },
    [symbol, position, decSep, thousandSep]
  );

  return { formatCurrency, symbol };
};
