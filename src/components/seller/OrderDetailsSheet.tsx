import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Phone, Mail, Calendar, Truck, Package, Pencil, Check, X, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";


const statusColors: Record<string, string> = {
  pending: "bg-emerald-100 text-emerald-700 border-emerald-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  processing: "bg-orange-100 text-orange-700 border-orange-200",
  shipped: "bg-blue-100 text-blue-700 border-blue-200",
  delivered: "bg-blue-100 text-blue-700 border-blue-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  returned: "bg-red-100 text-red-700 border-red-200",
};

interface Props {
  orderId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isAdmin?: boolean;
}

interface OrderDetail {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  delivery_address: string;
  delivery_date: string | null;
  delivery_time: string | null;
  status: string;
  payment_method: string | null;
  payment_status: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  notes: string | null;
  tracking_number: string | null;
  created_at: string;
  recipient_name: string | null;
  gift_message: string | null;
}

interface Item {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
  seller_price: number | null;
  selected_size: string | null;
  selected_color: string | null;
}


interface HistoryEntry {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
}

export const OrderDetailsSheet = ({ orderId, open, onOpenChange, isAdmin }: Props) => {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [productInfo, setProductInfo] = useState<Record<string, { stock: number | null; price: number | null }>>({});
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState<string>("");
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    if (!orderId || !open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [orderRes, itemsRes, histRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.from("order_items").select("id, product_id, product_name, quantity, price, total, seller_price, selected_size, selected_color").eq("order_id", orderId),
        supabase.from("order_status_history").select("id, from_status, to_status, note, created_at").eq("order_id", orderId).order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setOrder((orderRes.data as any) || null);
      const itemsList: Item[] = (itemsRes.data as any) || [];
      setItems(itemsList);
      setHistory((histRes.data as any) || []);

      // Fetch live product stock + price for items that have a product_id
      const productIds = Array.from(new Set(itemsList.map((i) => i.product_id).filter(Boolean))) as string[];
      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from("products")
          .select("id, stock, price")
          .in("id", productIds);
        if (!cancelled) {
          const map: Record<string, { stock: number | null; price: number | null }> = {};
          (prods || []).forEach((p: any) => {
            map[p.id] = { stock: p.stock, price: p.price };
          });
          setProductInfo(map);
        }
      } else {
        setProductInfo({});
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orderId, open]);

  const startEditPrice = (it: Item) => {
    if (!it.product_id) return;
    const current = productInfo[it.product_id]?.price ?? it.price;
    setEditingPriceId(it.id);
    setPriceDraft(String(current ?? ""));
  };

  const savePrice = async (it: Item) => {
    if (!it.product_id) return;
    const newPrice = Number(priceDraft);
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      toast.error("Enter a valid price");
      return;
    }
    setSavingPrice(true);
    const { error } = await supabase
      .from("products")
      .update({ price: newPrice })
      .eq("id", it.product_id);
    setSavingPrice(false);
    if (error) {
      toast.error("Failed to update price: " + error.message);
      return;
    }
    setProductInfo((prev) => ({
      ...prev,
      [it.product_id!]: { ...(prev[it.product_id!] || { stock: null, price: null }), price: newPrice },
    }));
    setEditingPriceId(null);
    toast.success("Product price updated");
  };


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {loading || !order ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <SheetHeader className="space-y-2 text-left">
              <div className="flex items-center justify-between gap-2">
                <SheetTitle className="font-mono text-base">{order.order_number}</SheetTitle>
                <Badge variant="outline" className={cn("capitalize border", statusColors[order.status] || "bg-muted text-foreground")}>
                  {order.status}
                </Badge>
              </div>
              <SheetDescription className="text-xs">
                Placed {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                {" · "}
                {format(new Date(order.created_at), "PPp")}
              </SheetDescription>
            </SheetHeader>

            {/* Customer */}
            <section className="space-y-2">
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Customer</h4>
              <div className="rounded-lg border border-border p-3 space-y-1.5 text-sm">
                <div className="font-medium">{order.customer_name}</div>
                {order.recipient_name && order.recipient_name !== order.customer_name && (
                  <div className="text-xs text-muted-foreground">Recipient: {order.recipient_name}</div>
                )}
                {order.customer_phone && (
                  <a href={`tel:${order.customer_phone}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary">
                    <Phone className="h-3 w-3" /> {order.customer_phone}
                  </a>
                )}
                {order.customer_email && (
                  <a href={`mailto:${order.customer_email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary">
                    <Mail className="h-3 w-3" /> {order.customer_email}
                  </a>
                )}
                <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
                  <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{order.delivery_address}</span>
                </div>
                {order.delivery_date && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(order.delivery_date), "PP")} {order.delivery_time && `· ${order.delivery_time}`}
                  </div>
                )}
              </div>
            </section>

            {order.gift_message && (
              <section className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Gift message</h4>
                <p className="text-sm italic rounded-lg border border-dashed border-border p-3">{order.gift_message}</p>
              </section>
            )}

            {(() => {
              const parsed = parseNotes(order.notes);
              if (!parsed) return null;
              return (
                <section className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Notes</h4>
                  <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
                    {parsed.note && <p className="whitespace-pre-wrap">{parsed.note}</p>}
                    {parsed.meta.length > 0 && (
                      <dl className="space-y-1 text-xs">
                        {parsed.meta.map(([k, v]) => (
                          <div key={k} className="flex items-start justify-between gap-3">
                            <dt className="text-muted-foreground">{k}</dt>
                            <dd className="font-mono break-all text-right">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </section>
              );
            })()}

            {/* Items */}
            <section className="space-y-2">
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Items ({items.length})</h4>
              <div className="rounded-lg border border-border divide-y divide-border">
                {items.map((it) => {
                  const sp = Number(it.seller_price ?? it.price ?? 0);
                  const info = it.product_id ? productInfo[it.product_id] : undefined;
                  const stock = info?.stock;
                  const livePrice = info?.price ?? it.price;
                  const isEditing = editingPriceId === it.id;
                  return (
                    <div key={it.id} className="p-3 flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{it.product_name}</div>
                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-0.5">
                          <span>Qty {it.quantity}</span>
                          <span>·</span>
                          {isAdmin ? (
                            isEditing ? (
                              <span className="inline-flex items-center gap-1">
                                <span>৳</span>
                                <Input
                                  value={priceDraft}
                                  onChange={(e) => setPriceDraft(e.target.value)}
                                  type="number"
                                  inputMode="decimal"
                                  className="h-7 w-20 text-xs px-1.5"
                                  autoFocus
                                />
                                <Button size="icon" variant="ghost" className="h-6 w-6" disabled={savingPrice} onClick={() => savePrice(it)}>
                                  {savingPrice ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingPriceId(null)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <span>৳{Number(livePrice).toFixed(0)}</span>
                                {it.product_id && (
                                  <button
                                    title="Quick edit price"
                                    onClick={() => startEditPrice(it)}
                                    className="text-primary hover:text-primary/80"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                )}
                              </span>
                            )
                          ) : (
                            <span>৳{sp.toFixed(0)} / unit</span>
                          )}
                          {it.selected_size && <><span>·</span><span>{it.selected_size}</span></>}
                          {it.selected_color && <><span>·</span><span>{it.selected_color}</span></>}
                        </div>
                        {it.product_id && stock !== undefined && stock !== null && (
                          <div className="mt-1.5">
                            {stock <= 0 ? (
                              <Badge variant="outline" className="text-[10px] border-red-200 bg-red-50 text-red-700">
                                <AlertTriangle className="h-2.5 w-2.5 mr-1" /> Out of stock
                              </Badge>
                            ) : stock < 5 ? (
                              <Badge variant="outline" className="text-[10px] border-orange-200 bg-orange-50 text-orange-700">
                                <Package className="h-2.5 w-2.5 mr-1" /> Low: {stock} left
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-700">
                                <Package className="h-2.5 w-2.5 mr-1" /> Stock: {stock}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="font-medium whitespace-nowrap">
                        ৳{Number(isAdmin ? it.total : sp * it.quantity).toFixed(0)}
                      </div>
                    </div>
                  );
                })}
              </div>

            </section>

            {/* Totals */}
            {isAdmin ? (
              <section className="space-y-1.5 text-sm">
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Totals</h4>
                <Row label="Subtotal" value={order.subtotal} />
                <Row label="Delivery" value={order.delivery_fee} />
                {Number(order.discount) > 0 && <Row label="Discount" value={-Number(order.discount)} />}
                <Separator className="my-2" />
                <Row label="Total" value={order.total} bold />
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Payment</span>
                  <span className="capitalize">{order.payment_method || "—"} · {order.payment_status}</span>
                </div>
              </section>
            ) : (
              <section className="space-y-1.5 text-sm">
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Your Payout</h4>
                <Row
                  label="Total payout"
                  value={items.reduce((s, it) => s + Number(it.seller_price ?? it.price ?? 0) * Number(it.quantity || 1), 0)}
                  bold
                />
              </section>
            )}

            {/* Tracking */}
            {order.tracking_number && (
              <section className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Tracking</h4>
                <div className="rounded-lg border border-border p-3 flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="font-mono">{order.tracking_number}</span>
                </div>
              </section>
            )}

            {/* Status history */}
            <section className="space-y-2">
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Status history</h4>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground">No status changes recorded yet.</p>
              ) : (
                <ol className="space-y-3 border-l border-border pl-4 ml-1.5">
                  {history.map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                      <div className="text-sm flex items-center gap-2">
                        {h.from_status && <span className="capitalize text-muted-foreground">{h.from_status}</span>}
                        {h.from_status && <span className="text-muted-foreground">→</span>}
                        <Badge variant="outline" className={cn("capitalize text-[10px] border", statusColors[h.to_status] || "bg-muted")}>
                          {h.to_status}
                        </Badge>
                      </div>
                      {h.note && <div className="text-xs text-muted-foreground mt-0.5">{h.note}</div>}
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {format(new Date(h.created_at), "PPp")} · {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <div className="h-4" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

const LABELS: Record<string, string> = {
  eps_merchant_transaction_id: "EPS transaction ID",
  original_notes: "Customer note",
  transaction_id: "Transaction ID",
  payment_reference: "Payment reference",
};

const prettify = (k: string) =>
  LABELS[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function parseNotes(raw: string | null): { note: string | null; meta: [string, string][] } | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return { note: trimmed, meta: [] };
  }
  try {
    const obj = JSON.parse(trimmed);
    if (!obj || typeof obj !== "object") return { note: trimmed, meta: [] };
    let note: string | null = null;
    const meta: [string, string][] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined || v === "") continue;
      if (k === "original_notes" || k === "note" || k === "notes") {
        note = String(v);
      } else {
        meta.push([prettify(k), typeof v === "object" ? JSON.stringify(v) : String(v)]);
      }
    }
    if (!note && meta.length === 0) return null;
    return { note, meta };
  } catch {
    return { note: trimmed, meta: [] };
  }
}

const Row = ({ label, value, bold }: { label: string; value: number; bold?: boolean }) => (
  <div className={cn("flex items-center justify-between", bold && "font-semibold text-base")}>
    <span className={cn(!bold && "text-muted-foreground")}>{label}</span>
    <span>৳{Number(value).toFixed(0)}</span>
  </div>
);
