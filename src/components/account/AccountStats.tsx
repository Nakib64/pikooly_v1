import { Package, Heart, MapPin, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiCurrency } from "@/contexts/CurrencyContext";

interface AccountStatsProps {
  userId: string;
  orderCount: number;
  totalSpent: number;
}

const AccountStats = ({ userId, orderCount, totalSpent }: AccountStatsProps) => {
  const { formatPrice } = useMultiCurrency();

  const { data: wishlistCount = 0 } = useQuery({
    queryKey: ["wishlist-count", userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("wishlist")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: addressCount = 0 } = useQuery({
    queryKey: ["address-count", userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("saved_addresses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw error;
      return count || 0;
    },
  });

  const stats = [
    { icon: Package, label: "Orders", value: orderCount.toString(), color: "text-primary bg-primary/10" },
    { icon: Heart, label: "Wishlist", value: wishlistCount.toString(), color: "text-destructive bg-destructive/10" },
    { icon: MapPin, label: "Addresses", value: addressCount.toString(), color: "text-accent bg-accent/10" },
    { icon: Star, label: "Total Spent", value: formatPrice(totalSpent), color: "text-primary bg-primary/10" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center hover:shadow-sm transition-shadow">
          <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 ${color}`}>
            <Icon size={18} />
          </div>
          <p className="text-lg sm:text-xl font-bold text-foreground leading-none">{value}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
};

export default AccountStats;
