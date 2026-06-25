"use client";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/useSeller";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wallet, Smartphone, Landmark, ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface PayoutRow {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  notes: string | null;
  paid_at: string;
  method_snapshot: any;
  seller_payout_orders: { order_id: string; seller_amount: number; orders: { order_number: string } | null }[];
}

const methodIcon = (m: string) =>
  m === "bkash" ? <Smartphone className="h-4 w-4 text-pink-600" /> :
  m === "bank" ? <Landmark className="h-4 w-4 text-blue-600" /> :
  <Wallet className="h-4 w-4" />;

const methodLabel = (m: string) =>
  m === "bkash" ? "bKash" : m === "bank" ? "Bank" : m;

export default function SellerPayouts() {
  const { seller, loading: sellerLoading } = useSeller();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [pending, setPending] = useState<{ id: string; order_number: string; seller_amount: number; created_at: string }[]>([]);

  useEffect(() => {
    if (!seller) return;
    let cancelled = false;
    (async () => {
      setLoading(true);

      // Confirmed/paid payouts
      const { data: payoutData } = await supabase
        .from("seller_payouts")
        .select("id, amount, method, reference, notes, paid_at, method_snapshot, seller_payout_orders(order_id, seller_amount, orders(order_number))")
        .eq("seller_id", seller.id)
        .order("paid_at", { ascending: false });

      // Pending: delivered orders not yet in any payout
      const { data: paidIds } = await supabase
        .from("seller_payout_orders")
        .select("order_id");
      const excludedIds = (paidIds || []).map((r: any) => r.order_id);

      let q = supabase
        .from("orders")
        .select("id, order_number, created_at, total, order_items(quantity, seller_price, price)")
        .eq("status", "delivered")
        .eq("district_id", seller.district_id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (excludedIds.length > 0) q = q.not("id", "in", `(${excludedIds.join(",")})`);
      const { data: pendingData } = await q;

      const pendingMapped = (pendingData || []).map((o: any) => {
        const sellerAmt = (o.order_items || []).reduce(
          (sum: number, i: any) => sum + Number(i.seller_price ?? i.price ?? 0) * Number(i.quantity || 1),
          0
        );
        return { id: o.id, order_number: o.order_number, seller_amount: sellerAmt, created_at: o.created_at };
      });

      if (!cancelled) {
        setPayouts((payoutData as any) || []);
        setPending(pendingMapped);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [seller]);

  const byMethod = useMemo(() => {
    const map: Record<string, PayoutRow[]> = {};
    for (const p of payouts) {
      const m = p.method || "other";
      (map[m] ||= []).push(p);
    }
    return map;
  }, [payouts]);

  const totalPaid = payouts.reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = pending.reduce((s, p) => s + p.seller_amount, 0);

  if (sellerLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">You don't have seller access.</p>
        <Link to="/seller/login" className="text-sm text-primary underline">Seller login</Link>
      </div>
    );
  }

  const methods = Object.keys(byMethod);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-3">
          <Link to="/seller/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <h1 className="text-base md:text-lg font-semibold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Payout status
          </h1>
          <div className="w-[80px]" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total paid</div>
            <div className="text-2xl font-semibold mt-1">৳{totalPaid.toFixed(0)}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{payouts.length} payout{payouts.length === 1 ? "" : "s"}</div>
          </Card>
          <Card className="p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Pending payout</div>
            <div className="text-2xl font-semibold mt-1 text-amber-600">৳{totalPending.toFixed(0)}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{pending.length} delivered order{pending.length === 1 ? "" : "s"}</div>
            {totalPending > 0 && (
              <button
                onClick={async () => {
                  const { error } = await supabase.from("seller_notifications").insert({
                    seller_id: seller.id,
                    type: "payout_request",
                    message: `Payout request from seller — ৳${totalPending.toFixed(0)} pending across ${pending.length} order(s).`,
                  });
                  if (error) {
                    (await import("sonner")).toast.error("Failed: " + error.message);
                  } else {
                    (await import("sonner")).toast.success("Payout request sent to admin");
                  }
                }}
                className="mt-2 text-[11px] font-medium text-primary hover:underline"
              >
                Request manual settle →
              </button>
            )}
          </Card>

          <Card className="p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Current method</div>
            <div className="text-lg font-semibold mt-1 flex items-center gap-1.5">
              {methodIcon(seller.payout_method || "")}
              {seller.payout_method ? methodLabel(seller.payout_method) : "Not set"}
            </div>
            {!seller.payout_method && (
              <div className="text-[11px] text-amber-600 mt-1">Set your payout method in profile</div>
            )}
          </Card>
        </section>

        <Tabs defaultValue="paid">
          <TabsList>
            <TabsTrigger value="paid"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Paid ({payouts.length})</TabsTrigger>
            <TabsTrigger value="pending"><Clock className="h-3.5 w-3.5 mr-1" /> Pending ({pending.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="paid" className="space-y-6 mt-4">
            {methods.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                No payouts received yet. Once admin marks an amount as paid, it will appear here.
              </Card>
            ) : (
              methods.map((m) => (
                <div key={m} className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    {methodIcon(m)} {methodLabel(m)}
                    <Badge variant="outline" className="text-[10px] ml-1">
                      ৳{byMethod[m].reduce((s, p) => s + Number(p.amount), 0).toFixed(0)}
                    </Badge>
                  </h3>
                  <Card className="divide-y divide-border overflow-hidden">
                    {byMethod[m].map((p) => (
                      <div key={p.id} className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold">৳{Number(p.amount).toFixed(0)}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {format(new Date(p.paid_at), "MMM d, yyyy h:mm a")} ·{" "}
                            {formatDistanceToNow(new Date(p.paid_at), { addSuffix: true })}
                          </div>
                          {p.reference && (
                            <div className="text-xs mt-1">
                              <span className="text-muted-foreground">Ref: </span>
                              <span className="font-mono">{p.reference}</span>
                            </div>
                          )}
                          {p.notes && <div className="text-xs text-muted-foreground mt-1">{p.notes}</div>}
                          {p.seller_payout_orders?.length > 0 && (
                            <div className="text-[11px] text-muted-foreground mt-1.5 flex flex-wrap gap-1">
                              {p.seller_payout_orders.slice(0, 6).map((o) => (
                                <span key={o.order_id} className="font-mono bg-muted px-1.5 py-0.5 rounded">
                                  {o.orders?.order_number || o.order_id.slice(0, 6)}
                                </span>
                              ))}
                              {p.seller_payout_orders.length > 6 && (
                                <span className="text-muted-foreground">+{p.seller_payout_orders.length - 6} more</span>
                              )}
                            </div>
                          )}
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 self-start">Paid</Badge>
                      </div>
                    ))}
                  </Card>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            {pending.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                No pending payouts. All your delivered orders have been settled.
              </Card>
            ) : (
              <Card className="divide-y divide-border overflow-hidden">
                {pending.map((o) => (
                  <div key={o.id} className="p-3 md:p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xs">{o.order_number}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Delivered · {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">৳{o.seller_amount.toFixed(0)}</div>
                      <Badge variant="outline" className="text-[10px] mt-0.5 border-amber-200 bg-amber-50 text-amber-700">
                        Pending
                      </Badge>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
