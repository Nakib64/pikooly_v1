import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_default: boolean;
}

interface CurrencyContextType {
  currencies: Currency[];
  selectedCurrency: Currency | null;
  setSelectedCurrency: (currency: Currency) => void;
  convert: (amountInDefault: number) => number;
  formatPrice: (amount: number) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCurrency, setSelectedCurrencyState] = useState<Currency | null>(null);

  const { data: currencies = [], isLoading } = useQuery({
    queryKey: ["currencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("currencies")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("code", { ascending: true });
      if (error) throw error;
      return data as Currency[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Initialize from localStorage or default currency
  useEffect(() => {
    if (currencies.length > 0 && !selectedCurrency) {
      const saved = localStorage.getItem("selected_currency_code");
      const found = saved ? currencies.find((c) => c.code === saved) : null;
      setSelectedCurrencyState(found || currencies.find((c) => c.is_default) || currencies[0]);
    }
  }, [currencies, selectedCurrency]);

  const setSelectedCurrency = (currency: Currency) => {
    setSelectedCurrencyState(currency);
    localStorage.setItem("selected_currency_code", currency.code);
  };

  const convert = (amountInDefault: number): number => {
    if (!selectedCurrency || selectedCurrency.is_default) return amountInDefault;
    return amountInDefault * selectedCurrency.exchange_rate;
  };

  const formatPrice = (amount: number): string => {
    if (!selectedCurrency) return `${amount}`;
    const converted = convert(amount);
    const decimals = selectedCurrency.is_default ? 0 : 2;
    const formatted = converted.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${selectedCurrency.symbol}${formatted}`;
  };

  return (
    <CurrencyContext.Provider
      value={{ currencies, selectedCurrency, setSelectedCurrency, convert, formatPrice, isLoading }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useMultiCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useMultiCurrency must be used within CurrencyProvider");
  return context;
};
