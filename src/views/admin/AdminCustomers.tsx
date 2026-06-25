import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface CustomerWithOrders extends Profile {
  order_count: number;
  total_spent: number;
}

const AdminCustomers = () => {
  const { formatCurrency } = useCurrency();
  const [customers, setCustomers] = useState<CustomerWithOrders[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCustomers = async () => {
    // Get all profiles
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profileError) {
      toast({ title: "Error", description: profileError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Get order stats per user
    const { data: orders } = await supabase
      .from("orders")
      .select("user_id, total");

    const orderStats: Record<string, { count: number; spent: number }> = {};
    (orders || []).forEach((o) => {
      if (!o.user_id) return;
      if (!orderStats[o.user_id]) orderStats[o.user_id] = { count: 0, spent: 0 };
      orderStats[o.user_id].count++;
      orderStats[o.user_id].spent += Number(o.total);
    });

    const result: CustomerWithOrders[] = (profiles || []).map((p) => ({
      ...p,
      order_count: orderStats[p.user_id]?.count || 0,
      total_spent: orderStats[p.user_id]?.spent || 0,
    }));

    setCustomers(result);
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const filtered = customers.filter((c) => {
    const term = search.toLowerCase();
    return (c.full_name || "").toLowerCase().includes(term) ||
      (c.phone || "").includes(term) ||
      c.user_id.includes(term);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-display font-bold">Customers</h2>
        <Badge variant="outline" className="text-sm">{customers.length} total</Badge>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Mobile Card Layout */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 bg-muted rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-muted-foreground text-sm">No customers found.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((c) => (
            <Card key={c.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-3.5">
                <div className="flex items-start gap-3">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                      {(c.full_name || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{c.full_name || "—"}</h3>
                        <p className="text-xs text-muted-foreground truncate">{c.phone || "No phone"}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{c.order_count} orders</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        Joined {new Date(c.created_at).toLocaleDateString("en-GB")}
                      </span>
                      <span className="text-sm font-bold text-primary">{formatCurrency(c.total_spent)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table Layout */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-border">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-4 p-4"><div className="h-4 w-1/4 bg-muted rounded animate-pulse" /><div className="h-4 flex-1 bg-muted rounded animate-pulse" /><div className="h-4 w-24 bg-muted rounded animate-pulse" /></div>)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No customers found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead className="hidden md:table-cell">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {c.avatar_url ? (
                            <img src={c.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {(c.full_name || "?")[0].toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium">{c.full_name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{c.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{c.order_count}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(c.total_spent)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("en-GB")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCustomers;
