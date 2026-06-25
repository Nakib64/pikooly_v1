"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Wallet, Smartphone, Landmark, Send, CheckCircle2, BellRing, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Seller {
  id: string;
  name: string;
  email: string;
  phone: string;
  district_id: string;
  payout_method: string | null;
  bkash_number: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  bank_routing_number: string | null;
}

interface PendingOrder {
  id: string;
  order_number: string;
  total: number;
  seller_amount: number;
  created_at: string;
}

interface Payout {
  id: string;
  seller_id: string;
  amount: number;
  method: string;
  reference: string | null;
  notes: string | null;
  paid_at: string;
  seller_payout_orders?: { order_id: string; seller_amount: number; orders: { order_number: string } | null }[];
}

export default function AdminSellerPayouts() {
  const { user } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Pay dialog
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("bkash");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [paying, setPaying] = useState(false);

  // Payout requests (from seller "Request manual settle")
  const [requests, setRequests] = useState<{ id: string; seller_id: string; message: string; created_at: string }[]>([]);

  // Global summary across all sellers
  const [summary, setSummary] = useState<{ totalPaid: number; totalPending: number; payoutCount: number; pendingOrderCount: number }>({
    totalPaid: 0, totalPending: 0, payoutCount: 0, pendingOrderCount: 0,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("sellers")
        .select("id, name, email, phone, district_id, payout_method, bkash_number, bank_name, bank_account_name, bank_account_number, bank_branch, bank_routing_number")
        .order("name");
      setSellers((data as any) || []);
      setLoading(false);
    })();
  }, []);

  // Load requests + summary
  const loadInbox = async () => {
    const { data: reqs } = await supabase
      .from("seller_notifications")
      .select("id, seller_id, message, created_at")
      .eq("type", "payout_request")
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(50);
    setRequests((reqs as any) || []);

    const [{ data: allPayouts }, { data: paidIds }, { data: delivered }] = await Promise.all([
      supabase.from("seller_payouts").select("amount"),
      supabase.from("seller_payout_orders").select("order_id"),
      supabase.from("orders").select("id, order_items(quantity, seller_price, price)").eq("status", "delivered").limit(2000),
    ]);
    const paidSet = new Set((paidIds || []).map((r: any) => r.order_id));
    const totalPaid = (allPayouts || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
    const pendingArr = (delivered || []).filter((o: any) => !paidSet.has(o.id));
    const totalPending = pendingArr.reduce((s: number, o: any) => s + (o.order_items || []).reduce(
      (a: number, i: any) => a + Number(i.seller_price ?? i.price ?? 0) * Number(i.quantity || 1), 0), 0);
    setSummary({
      totalPaid,
      totalPending,
      payoutCount: (allPayouts || []).length,
      pendingOrderCount: pendingArr.length,
    });
  };
  useEffect(() => { loadInbox(); }, []);

  const dismissRequest = async (id: string) => {
    setRequests((p) => p.filter((r) => r.id !== id));
    await supabase.from("seller_notifications").update({ read: true }).eq("id", id);
  };

  const sellerName = (id: string) => sellers.find((s) => s.id === id)?.name || "Unknown seller";



  const selectedSeller = useMemo(
    () => sellers.find((s) => s.id === selectedSellerId) || null,
    [sellers, selectedSellerId]
  );

  // Load pending orders + payouts for selected seller
  useEffect(() => {
    if (!selectedSeller) {
      setPendingOrders([]);
      setPayouts([]);
      setSelectedOrderIds(new Set());
      return;
    }
    (async () => {
      // Already-paid order IDs
      const { data: paid } = await supabase.from("seller_payout_orders").select("order_id");
      const excludedIds = (paid || []).map((r: any) => r.order_id);

      let q = supabase
        .from("orders")
        .select("id, order_number, total, created_at, order_items(quantity, seller_price, price)")
        .eq("status", "delivered")
        .eq("district_id", selectedSeller.district_id)
        .order("created_at", { ascending: false })
        .limit(300);
      if (excludedIds.length > 0) q = q.not("id", "in", `(${excludedIds.join(",")})`);
      const { data: pendingData } = await q;

      const mapped: PendingOrder[] = (pendingData || []).map((o: any) => {
        const seller_amount = (o.order_items || []).reduce(
          (sum: number, i: any) => sum + Number(i.seller_price ?? i.price ?? 0) * Number(i.quantity || 1),
          0
        );
        return { id: o.id, order_number: o.order_number, total: Number(o.total), seller_amount, created_at: o.created_at };
      });

      const { data: payoutData } = await supabase
        .from("seller_payouts")
        .select("id, seller_id, amount, method, reference, notes, paid_at, seller_payout_orders(order_id, seller_amount, orders(order_number))")
        .eq("seller_id", selectedSeller.id)
        .order("paid_at", { ascending: false });

      setPendingOrders(mapped);
      setPayouts((payoutData as any) || []);
      setSelectedOrderIds(new Set());
    })();
  }, [selectedSeller]);

  const totalSelected = useMemo(
    () => pendingOrders.filter((o) => selectedOrderIds.has(o.id)).reduce((s, o) => s + o.seller_amount, 0),
    [pendingOrders, selectedOrderIds]
  );

  const totalPending = pendingOrders.reduce((s, o) => s + o.seller_amount, 0);

  const toggleAll = (checked: boolean) => {
    setSelectedOrderIds(checked ? new Set(pendingOrders.map((o) => o.id)) : new Set());
  };

  const openPayDialog = () => {
    if (!selectedSeller) return;
    if (!selectedSeller.payout_method) {
      return toast.error("Seller hasn't set a payout method yet");
    }
    if (selectedOrderIds.size === 0) {
      return toast.error("Select at least one order to pay");
    }
    setPayAmount(totalSelected.toFixed(0));
    setPayMethod(selectedSeller.payout_method);
    setPayReference("");
    setPayNotes("");
    setPayOpen(true);
  };

  const submitPay = async () => {
    if (!selectedSeller) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");
    if (!payMethod) return toast.error("Select a method");

    setPaying(true);

    // Snapshot method details
    const snapshot: Record<string, any> = { method: payMethod };
    if (payMethod === "bkash") snapshot.bkash_number = selectedSeller.bkash_number;
    if (payMethod === "bank") {
      snapshot.bank_name = selectedSeller.bank_name;
      snapshot.bank_account_name = selectedSeller.bank_account_name;
      snapshot.bank_account_number = selectedSeller.bank_account_number;
      snapshot.bank_branch = selectedSeller.bank_branch;
      snapshot.bank_routing_number = selectedSeller.bank_routing_number;
    }

    const { data: payout, error } = await supabase
      .from("seller_payouts")
      .insert({
        seller_id: selectedSeller.id,
        amount,
        method: payMethod,
        reference: payReference.trim() || null,
        notes: payNotes.trim() || null,
        method_snapshot: snapshot,
        paid_by: user?.id ?? null,
      })
      .select("id")
      .single();

    if (error || !payout) {
      setPaying(false);
      return toast.error("Failed to create payout: " + (error?.message || "unknown"));
    }

    const orderIds = Array.from(selectedOrderIds);
    if (orderIds.length > 0) {
      const rows = pendingOrders
        .filter((o) => selectedOrderIds.has(o.id))
        .map((o) => ({ payout_id: payout.id, order_id: o.id, seller_amount: o.seller_amount }));
      const { error: linkErr } = await supabase.from("seller_payout_orders").insert(rows);
      if (linkErr) {
        // Roll back the payout if link fails
        await supabase.from("seller_payouts").delete().eq("id", payout.id);
        setPaying(false);
        return toast.error("Failed to link orders: " + linkErr.message);
      }
    }

    setPaying(false);
    setPayOpen(false);
    toast.success("Payout recorded and seller notified");

    // Refresh
    setSelectedOrderIds(new Set());
    setPendingOrders((prev) => prev.filter((o) => !orderIds.includes(o.id)));
    const { data: refreshed } = await supabase
      .from("seller_payouts")
      .select("id, seller_id, amount, method, reference, notes, paid_at, seller_payout_orders(order_id, seller_amount, orders(order_number))")
      .eq("seller_id", selectedSeller.id)
      .order("paid_at", { ascending: false });
    setPayouts((refreshed as any) || []);
    loadInbox();
  };

  const methodChip = (m: string | null) =>
    m === "bkash" ? <span className="inline-flex items-center gap-1 text-xs"><Smartphone className="h-3 w-3 text-pink-600" /> bKash</span> :
    m === "bank" ? <span className="inline-flex items-center gap-1 text-xs"><Landmark className="h-3 w-3 text-blue-600" /> Bank</span> :
    <span className="text-xs text-muted-foreground">Not set</span>;

  return (
    <>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> Seller Payouts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pay sellers their share for delivered orders. They are notified immediately when you mark a payment.
          </p>
        </header>

        {/* Summary across all sellers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total paid</div>
            <div className="text-xl font-semibold mt-1">৳{summary.totalPaid.toFixed(0)}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{summary.payoutCount} payout{summary.payoutCount === 1 ? "" : "s"}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[11px] uppercase tracking-wide text-amber-700">Total pending</div>
            <div className="text-xl font-semibold mt-1 text-amber-600">৳{summary.totalPending.toFixed(0)}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{summary.pendingOrderCount} delivered order{summary.pendingOrderCount === 1 ? "" : "s"}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Sellers</div>
            <div className="text-xl font-semibold mt-1">{sellers.length}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{sellers.filter((s) => s.payout_method).length} with payout method</div>
          </Card>
          <Card className="p-3 border-primary/30 bg-primary/5">
            <div className="text-[11px] uppercase tracking-wide text-primary">Open requests</div>
            <div className="text-xl font-semibold mt-1 text-primary">{requests.length}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Manual settle requests</div>
          </Card>
        </div>

        {/* Payout requests inbox */}
        {requests.length > 0 && (
          <Card className="p-4 border-primary/30">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <BellRing className="h-4 w-4 text-primary" /> Payout requests ({requests.length})
              </h2>
              <button onClick={loadInbox} className="text-[11px] text-muted-foreground hover:text-foreground">Refresh</button>
            </div>
            <ul className="divide-y divide-border">
              {requests.map((r) => (
                <li key={r.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{sellerName(r.seller_id)}</div>
                    <div className="text-[11px] text-muted-foreground">{r.message}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="h-8" onClick={() => { setSelectedSellerId(r.seller_id); dismissRequest(r.id); }}>
                      Open
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => dismissRequest(r.id)} title="Dismiss">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}



        {/* Seller picker — card list */}
        {!selectedSeller ? (
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Select a seller</Label>
              <span className="text-xs text-muted-foreground">{sellers.length} seller{sellers.length === 1 ? "" : "s"}</span>
            </div>
            {loading ? (
              <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : sellers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No sellers found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sellers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSellerId(s.id)}
                    className="text-left rounded-lg border border-border bg-card hover:border-primary hover:shadow-sm transition p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-sm truncate">{s.name}</div>
                      {methodChip(s.payout_method)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                    {s.phone && <div className="text-xs text-muted-foreground truncate">{s.phone}</div>}
                  </button>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div>
                  <div className="font-semibold">{selectedSeller.name}</div>
                  <div className="text-xs text-muted-foreground">{selectedSeller.email}</div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Method:</span>
                  {methodChip(selectedSeller.payout_method)}
                </div>
                {selectedSeller.payout_method === "bkash" && selectedSeller.bkash_number && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">bKash: </span>
                    <span className="font-mono">{selectedSeller.bkash_number}</span>
                  </div>
                )}
                {selectedSeller.payout_method === "bank" && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">{selectedSeller.bank_name || "Bank"}: </span>
                    <span className="font-mono">{selectedSeller.bank_account_number || "—"}</span>
                    {selectedSeller.bank_account_name && <span className="text-muted-foreground"> · {selectedSeller.bank_account_name}</span>}
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedSellerId("")}>Change seller</Button>
            </div>
          </Card>
        )}

        {selectedSeller && (
          <>
            {/* Pending orders */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Pending orders ({pendingOrders.length})</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm">
                    Selected: <span className="font-semibold">৳{totalSelected.toFixed(0)}</span>
                    <span className="text-muted-foreground"> / ৳{totalPending.toFixed(0)} total</span>
                  </span>
                  <Button onClick={openPayDialog} disabled={selectedOrderIds.size === 0}>
                    <Send className="h-4 w-4 mr-1.5" /> Mark as paid
                  </Button>
                </div>
              </div>

              {pendingOrders.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No pending payouts for this seller.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b border-border">
                        <th className="px-2 py-2 w-8">
                          <Checkbox
                            checked={selectedOrderIds.size === pendingOrders.length && pendingOrders.length > 0}
                            onCheckedChange={(c) => toggleAll(!!c)}
                          />
                        </th>
                        <th className="px-2 py-2">Order #</th>
                        <th className="px-2 py-2">Delivered</th>
                        <th className="px-2 py-2 text-right">Order total</th>
                        <th className="px-2 py-2 text-right">Seller payout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingOrders.map((o) => {
                        const checked = selectedOrderIds.has(o.id);
                        return (
                          <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="px-2 py-2">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) => {
                                  const next = new Set(selectedOrderIds);
                                  if (c) next.add(o.id);
                                  else next.delete(o.id);
                                  setSelectedOrderIds(next);
                                }}
                              />
                            </td>
                            <td className="px-2 py-2 font-mono text-xs">{o.order_number}</td>
                            <td className="px-2 py-2 text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                            </td>
                            <td className="px-2 py-2 text-right">৳{o.total.toFixed(0)}</td>
                            <td className="px-2 py-2 text-right font-semibold">৳{o.seller_amount.toFixed(0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Payout history with filters + expandable orders */}
            <PayoutHistoryCard payouts={payouts} methodChip={methodChip} />

          </>
        )}
      </div>

      {/* Pay dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark payment as paid</DialogTitle>
            <DialogDescription>
              {selectedSeller && `Pay ${selectedSeller.name} for ${selectedOrderIds.size} order${selectedOrderIds.size === 1 ? "" : "s"}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Amount paid (৳)</Label>
              <Input
                type="number"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                style={{ fontSize: 16 }}
              />
              <p className="text-[11px] text-muted-foreground">Suggested: ৳{totalSelected.toFixed(0)}</p>
            </div>

            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Payment reference</Label>
              <Input
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="Transaction ID / cheque # (optional)"
                style={{ fontSize: 16 }}
                maxLength={120}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Optional notes for the seller"
                rows={2}
                maxLength={500}
                style={{ fontSize: 16 }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={paying}>Cancel</Button>
            <Button onClick={submitPay} disabled={paying}>
              {paying ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
              Confirm payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PayoutHistoryCard({
  payouts,
  methodChip,
}: {
  payouts: Payout[];
  methodChip: (m: string | null) => JSX.Element;
}) {
  const [method, setMethod] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return payouts.filter((p) => {
      if (method !== "all" && p.method !== method) return false;
      const d = new Date(p.paid_at).getTime();
      if (from) {
        const f = new Date(from); f.setHours(0, 0, 0, 0);
        if (d < f.getTime()) return false;
      }
      if (to) {
        const t = new Date(to); t.setHours(23, 59, 59, 999);
        if (d > t.getTime()) return false;
      }
      return true;
    });
  }, [payouts, method, from, to]);

  const total = filtered.reduce((s, p) => s + Number(p.amount), 0);
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h2 className="font-semibold">Payout history ({filtered.length}/{payouts.length})</h2>
        <div className="text-sm">
          Total: <span className="font-semibold">৳{total.toFixed(0)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Method" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            <SelectItem value="bkash">bKash</SelectItem>
            <SelectItem value="bank">Bank</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 text-xs" style={{ fontSize: 16 }} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 text-xs" style={{ fontSize: 16 }} />
        {(method !== "all" || from || to) && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setMethod("all"); setFrom(""); setTo(""); }}>
            Clear
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">No payouts match these filters.</div>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((p) => {
            const open = expanded.has(p.id);
            const linked = p.seller_payout_orders || [];
            return (
              <li key={p.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => toggle(p.id)} className="flex-1 text-left min-w-0">
                    <div className="font-semibold flex items-center gap-2">
                      ৳{Number(p.amount).toFixed(0)} {methodChip(p.method)}
                      {linked.length > 0 && (
                        <span className="text-[11px] text-muted-foreground font-normal">
                          · {linked.length} order{linked.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(p.paid_at), "MMM d, yyyy h:mm a")}
                      {p.reference && <> · Ref: <span className="font-mono">{p.reference}</span></>}
                    </div>
                    {p.notes && <div className="text-xs text-muted-foreground mt-0.5">{p.notes}</div>}
                  </button>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Paid
                  </Badge>
                </div>
                {open && linked.length > 0 && (
                  <ul className="mt-2 ml-2 pl-3 border-l border-border space-y-1">
                    {linked.map((l) => (
                      <li key={l.order_id} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-muted-foreground">{l.orders?.order_number || l.order_id.slice(0, 8)}</span>
                        <span className="font-medium">৳{Number(l.seller_amount).toFixed(0)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
