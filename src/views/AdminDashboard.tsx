import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, ShoppingCart, FileText, Tag, Users, TrendingUp, DollarSign, Clock,
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { useCurrency } from "@/hooks/useCurrency";
import { AdminDashboardSkeleton } from "@/components/ui/skeletons";

interface Stats {
  products: number;
  categories: number;
  orders: number;
  blogs: number;
  customers: number;
  todayOrders: number;
  totalRevenue: number;
  todayRevenue: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const AdminDashboard = () => {
  const { formatCurrency } = useCurrency();
  const [stats, setStats] = useState<Stats>({
    products: 0, categories: 0, orders: 0, blogs: 0,
    customers: 0, todayOrders: 0, totalRevenue: 0, todayRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const today = startOfDay(new Date()).toISOString();

      const [products, categories, orders, blogs, customers, allOrders, todayOrdersRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("blogs").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total, created_at, status").is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("orders").select("id, total", { count: "exact" }).is("deleted_at", null).gte("created_at", today),
      ]);

      const allOrderData = allOrders.data || [];
      const totalRevenue = allOrderData
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + Number(o.total), 0);
      const todayRev = (todayOrdersRes.data || []).reduce((sum: number, o: any) => sum + Number(o.total), 0);

      // Build last 7 days revenue chart
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(new Date(), i);
        const dayStr = format(day, "yyyy-MM-dd");
        const dayLabel = format(day, "dd MMM");
        const dayOrders = allOrderData.filter(
          (o) => o.created_at.startsWith(dayStr) && o.status !== "cancelled"
        );
        chartData.push({
          date: dayLabel,
          revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0),
          orders: dayOrders.length,
        });
      }

      setStats({
        products: products.count ?? 0,
        categories: categories.count ?? 0,
        orders: orders.count ?? 0,
        blogs: blogs.count ?? 0,
        customers: customers.count ?? 0,
        todayOrders: todayOrdersRes.count ?? 0,
        totalRevenue,
        todayRevenue: todayRev,
      });
      setRevenueData(chartData);

      // Recent orders
      const { data: recent } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, total, status, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8);
      setRecentOrders(recent || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const summaryCards = [
    { label: "Total Revenue", value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: "text-green-600" },
    { label: "Today's Revenue", value: formatCurrency(stats.todayRevenue), icon: TrendingUp, color: "text-primary" },
    { label: "Total Orders", value: stats.orders, icon: ShoppingCart, color: "text-blue-600" },
    { label: "Today's Orders", value: stats.todayOrders, icon: Clock, color: "text-orange-600" },
    { label: "Products", value: stats.products, icon: Package, color: "text-purple-600" },
    { label: "Categories", value: stats.categories, icon: Tag, color: "text-accent-foreground" },
    { label: "Customers", value: stats.customers, icon: Users, color: "text-teal-600" },
    { label: "Blog Posts", value: stats.blogs, icon: FileText, color: "text-rose-600" },
  ];

  if (loading) return <AdminDashboardSkeleton />;

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-display font-bold">Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${card.color}`} />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <p className="text-lg sm:text-2xl font-bold truncate">{loading ? "..." : card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm">No orders yet</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Order #</th>
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium">Total</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-2.5 font-mono text-xs">{o.order_number}</td>
                      <td className="py-2.5">{o.customer_name}</td>
                      <td className="py-2.5 font-semibold">{formatCurrency(Number(o.total))}</td>
                      <td className="py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[o.status] || "bg-muted text-muted-foreground"}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-muted-foreground text-xs">
                        {format(new Date(o.created_at), "dd MMM yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
