import { Link } from "@/lib/router-adapter";
import { Package, ChevronRight, Eye } from "lucide-react";
import { useMultiCurrency } from "@/contexts/CurrencyContext";

interface RecentOrdersProps {
  orders: any[];
}

const statusStyles: Record<string, string> = {
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  shipped: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const RecentOrders = ({ orders }: RecentOrdersProps) => {
  const { formatPrice } = useMultiCurrency();

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-display font-semibold text-foreground flex items-center gap-2">
          <Package size={18} className="text-primary" />
          Recent Orders
        </h2>
        {orders.length > 0 && (
          <Link to="/track-order" className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors">
            View All <ChevronRight size={13} />
          </Link>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
            <Package size={24} className="text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">No orders yet</p>
          <Link to="/" className="text-sm font-medium text-primary hover:underline">Start Shopping →</Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {orders.map((order: any) => (
            <div key={order.id} className="flex items-center gap-3 border border-border/50 rounded-xl p-3 sm:p-3.5 hover:border-border transition-colors group">
              <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                <Package size={18} className="text-primary/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{order.order_number}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {order.customer_name && ` • ${order.customer_name}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-primary">{formatPrice(order.total)}</p>
                <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-0.5 capitalize ${statusStyles[order.status] || "bg-muted text-muted-foreground"}`}>
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentOrders;
