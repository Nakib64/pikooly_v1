"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Search, Eye, Package, Trash2, RotateCcw, X, ShieldCheck } from "lucide-react";
import { Link } from "@/lib/router-adapter";
import { useCurrency } from "@/hooks/useCurrency";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/contexts/AuthContext";
import { logAdminActivity } from "@/lib/activityLog";
import { shouldSendMail, shouldSendSms, shouldSendPush, sendBrowserPush } from "@/lib/notificationHelper";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type OrderItem = Tables<"order_items">;

const statusOptions = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];
const paymentStatusOptions = ["unpaid", "paid", "refunded"];

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-cyan-100 text-cyan-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  returned: "bg-orange-100 text-orange-800",
  unpaid: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-800",
  refunded: "bg-gray-100 text-gray-800",
};

const AdminOrders = () => {
  const { formatCurrency } = useCurrency();
  const { settings: siteSettings } = useSiteSettings();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [view, setView] = useState<"active" | "trash">("active");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const TRASH_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

  const fetchOrders = async () => {
    // Admin sees all orders including trashed (admin RLS bypasses filter)
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setOrders((data as Order[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  // Clear selection when switching tabs
  useEffect(() => { setSelectedIds(new Set()); }, [view]);

  const viewOrder = async (order: Order) => {
    setSelectedOrder(order);
    const { data } = await supabase.from("order_items").select("*").eq("order_id", order.id);
    setOrderItems(data || []);
    setDetailOpen(true);
  };

  const statusEmailTemplates: Record<string, { subject: string; heading: string; message: string; emoji: string; color: string }> = {
    confirmed: {
      subject: "Order Confirmed",
      heading: "Your Order is Confirmed! ✅",
      message: "Great news! Your order has been confirmed and is now being prepared with care.",
      emoji: "✅",
      color: "#3b82f6",
    },
    processing: {
      subject: "Order Being Processed",
      heading: "Your Order is Being Prepared! 🔧",
      message: "We're currently preparing your order with love and care.",
      emoji: "🔧",
      color: "#8b5cf6",
    },
    shipped: {
      subject: "Order Shipped",
      heading: "Your Order is On The Way! 🚚",
      message: "Your order has been shipped and is on its way to the delivery address.",
      emoji: "🚚",
      color: "#06b6d4",
    },
    delivered: {
      subject: "Order Delivered",
      heading: "Order Successfully Delivered! 🎉",
      message: "Your order has been successfully delivered. We hope you love it!",
      emoji: "🎉",
      color: "#22c55e",
    },
    cancelled: {
      subject: "Order Cancelled",
      heading: "Order Cancelled ❌",
      message: "Your order has been cancelled. If you have any questions, please contact us.",
      emoji: "❌",
      color: "#ef4444",
    },
  };

  const sendStatusEmail = async (order: Order, newStatus: string) => {
    if (!order.customer_email) return;
    if (!shouldSendMail(siteSettings, newStatus)) return;
    const template = statusEmailTemplates[newStatus];
    if (!template) return;

    try {
      const { data: rawItems } = await supabase
        .from("order_items")
        .select("product_name, quantity, price, total, product_id")
        .eq("order_id", order.id);

      const emailItems = await Promise.all((rawItems || []).map(async (item: any) => {
        let imgUrl = "";
        if (item.product_id) {
          const { data: prod } = await supabase.from("products").select("image_url").eq("id", item.product_id).maybeSingle();
          imgUrl = prod?.image_url || "";
        }
        return { name: item.product_name, quantity: item.quantity, total: Number(item.total), imageUrl: imgUrl };
      }));

      const { buildStatusUpdateEmail } = await import("@/lib/emailTemplates");
      const html = buildStatusUpdateEmail({
        customerName: order.customer_name,
        orderNumber: order.order_number,
        deliveryAddress: order.delivery_address,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.delivery_fee),
        discount: Number(order.discount),
        total: Number(order.total),
        items: emailItems,
        trackOrderUrl: `${(siteSettings.public_site_url || window.location.origin).replace(/\/$/, '')}/track-order`,
        logoUrl: siteSettings.company_logo || "",
        status: newStatus,
        statusHeading: template.heading,
        statusMessage: template.message,
        statusEmoji: template.emoji,
        statusColor: template.color,
      });

      await supabase.functions.invoke("send-email", {
        body: {
          to: order.customer_email,
          subject: `${template.subject} - ${order.order_number} | Pikooly`,
          html,
        },
      });
    } catch (err) {
      console.error("Failed to send status email:", err);
    }
  };

  const sendStatusSms = async (order: Order, newStatus: string) => {
    if (!order.customer_phone) return;
    if (!shouldSendSms(siteSettings, newStatus)) return;
    const template = statusEmailTemplates[newStatus];
    if (!template) return;

    try {
      const trackUrl = `${(siteSettings.public_site_url || window.location.origin).replace(/\/$/, '')}/track-order`;
      const smsMessage = `${template.emoji} ${template.subject}\n\nOrder: ${order.order_number}\nTotal: ৳${Number(order.total).toFixed(2)}\n\n${template.message}\n\n📦 Track: ${trackUrl}`;

      await supabase.functions.invoke("send-sms", {
        body: {
          to: order.customer_phone,
          message: smsMessage,
        },
      });
    } catch (err) {
      console.error("Failed to send status SMS:", err);
    }
  };

  const sendStatusPush = (order: Order, newStatus: string) => {
    if (!shouldSendPush(siteSettings, newStatus)) return;
    const template = statusEmailTemplates[newStatus];
    if (!template) return;
    sendBrowserPush(
      `${template.emoji} ${template.subject}`,
      `Order ${order.order_number} - ${template.message}`
    );
  };

  const updateStatus = async (orderId: string, status: string) => {
    const order = orders.find((o) => o.id === orderId);
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Status updated" });
      if (order) {
        sendStatusEmail(order, status);
        sendStatusSms(order, status);
        sendStatusPush(order, status);
      }
      fetchOrders();
      if (selectedOrder?.id === orderId) setSelectedOrder({ ...selectedOrder, status });
    }
  };

  const updatePaymentStatus = async (orderId: string, payment_status: string) => {
    const { error } = await supabase.from("orders").update({ payment_status }).eq("id", orderId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Payment status updated" });
      fetchOrders();
      if (selectedOrder?.id === orderId) setSelectedOrder({ ...selectedOrder, payment_status });
    }
  };

  // Soft-delete a single order: set deleted_at + deleted_by, log activity
  const softDeleteOrders = async (ids: string[]) => {
    if (ids.length === 0) return { ok: false, count: 0 };
    const { data, error } = await supabase
      .from("orders")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null })
      .in("id", ids)
      .select("id, order_number");
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return { ok: false, count: 0 };
    }
    const affected = data || [];
    if (affected.length === 1) {
      await logAdminActivity({
        action: "order_deleted",
        userId: user?.id ?? null,
        userEmail: user?.email ?? null,
        description: `Moved order ${affected[0].order_number} to trash`,
        metadata: { order_id: affected[0].id, order_number: affected[0].order_number },
      });
    } else if (affected.length > 1) {
      await logAdminActivity({
        action: "orders_bulk_deleted",
        userId: user?.id ?? null,
        userEmail: user?.email ?? null,
        description: `Moved ${affected.length} orders to trash`,
        metadata: { order_ids: affected.map((o) => o.id), order_numbers: affected.map((o) => o.order_number) },
      });
    }
    return { ok: true, count: affected.length };
  };

  const handleDeleteOrder = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { ok, count } = await softDeleteOrders([deleteId]);
    setDeleting(false);
    if (!ok) return;
    toast({ title: "Moved to trash", description: `Order can be restored within 24 hours. (${count} order)` });
    if (selectedOrder?.id === deleteId) {
      setDetailOpen(false);
      setSelectedOrder(null);
    }
    setDeleteId(null);
    fetchOrders();
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setDeleting(true);
    const { ok, count } = await softDeleteOrders(ids);
    setDeleting(false);
    if (!ok) return;
    toast({ title: "Moved to trash", description: `${count} orders moved. Restorable within 24 hours.` });
    setSelectedIds(new Set());
    setBulkConfirmOpen(false);
    fetchOrders();
  };

  const handleRestoreOrder = async (order: Order) => {
    const { error } = await supabase
      .from("orders")
      .update({ deleted_at: null, deleted_by: null })
      .eq("id", order.id);
    if (error) {
      toast({ title: "Restore failed", description: error.message, variant: "destructive" });
      return;
    }
    await logAdminActivity({
      action: "order_restored",
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      description: `Restored order ${order.order_number} from trash`,
      metadata: { order_id: order.id, order_number: order.order_number },
    });
    toast({ title: "Order restored" });
    fetchOrders();
  };

  const isExpired = (order: Order) => {
    const deletedAt = (order as any).deleted_at as string | null;
    if (!deletedAt) return false;
    return Date.now() - new Date(deletedAt).getTime() > TRASH_RETENTION_MS;
  };

  // Auto-purge expired trashed orders (>24h) — best effort, runs on mount
  useEffect(() => {
    if (orders.length === 0) return;
    const expired = orders.filter((o) => (o as any).deleted_at && isExpired(o));
    if (expired.length === 0) return;
    (async () => {
      const ids = expired.map((o) => o.id);
      await supabase.from("order_items").delete().in("order_id", ids);
      await supabase.from("bouquet_orders").delete().in("order_id", ids);
      await supabase.from("orders").delete().in("id", ids);
      fetchOrders();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.length]);

  const visibleOrders = useMemo(() => {
    return orders.filter((o) => {
      const deleted = !!(o as any).deleted_at;
      if (view === "active" && deleted) return false;
      if (view === "trash" && !deleted) return false;
      return true;
    });
  }, [orders, view]);

  const filtered = visibleOrders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch = o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.customer_phone.includes(search);
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const allVisibleSelected = filtered.length > 0 && filtered.every((o) => selectedIds.has(o.id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((o) => o.id)));
    }
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const trashCount = orders.filter((o) => (o as any).deleted_at).length;
  const activeCount = orders.length - trashCount;

  const formatTimeLeft = (deletedAt: string) => {
    const ms = TRASH_RETENTION_MS - (Date.now() - new Date(deletedAt).getTime());
    if (ms <= 0) return "Expired";
    const hrs = Math.floor(ms / (60 * 60 * 1000));
    const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    return hrs > 0 ? `${hrs}h ${mins}m left` : `${mins}m left`;
  };


  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl sm:text-2xl font-display font-bold">Orders</h2>
        <Badge variant="outline" className="text-sm">{activeCount} active · {trashCount} in trash</Badge>
      </div>

      {/* View tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as "active" | "trash")} className="mb-4">
        <TabsList>
          <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
          <TabsTrigger value="trash">
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Trash ({trashCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "trash" && (
        <p className="text-xs text-muted-foreground mb-3">
          Trashed orders are kept for 24 hours and then permanently removed.
        </p>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by order #, name, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusOptions.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar */}
      {view === "active" && selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 mb-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2 text-sm">
            <Checkbox checked onCheckedChange={() => setSelectedIds(new Set())} />
            <span className="font-medium">{selectedIds.size} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setBulkConfirmOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> Move to trash
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Card Layout */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3 space-y-2">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-muted-foreground text-sm">No orders found.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((order) => {
            const deletedAt = (order as any).deleted_at as string | null;
            const isTrash = !!deletedAt;
            const checked = selectedIds.has(order.id);
            return (
              <Card
                key={order.id}
                className={`overflow-hidden hover:shadow-md transition-shadow ${checked ? "ring-2 ring-primary" : ""}`}
              >
                <CardContent className="p-3.5">
                  <div className="flex items-start gap-2.5">
                    {!isTrash && (
                      <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                        <Checkbox checked={checked} onCheckedChange={() => toggleSelect(order.id)} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => viewOrder(order)}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-muted-foreground">{order.order_number}</p>
                          <h3 className="font-semibold text-sm mt-0.5">{order.customer_name}</h3>
                          <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                        </div>
                        <p className="font-bold text-sm text-primary whitespace-nowrap">{formatCurrency(order.total)}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize font-medium ${statusColors[order.status] || "bg-muted"}`}>
                            {order.status}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize font-medium ${statusColors[order.payment_status] || "bg-muted"}`}>
                            {order.payment_status}
                          </span>
                          {isTrash && deletedAt && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800">
                              {formatTimeLeft(deletedAt)}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString("en-GB")}</span>
                      </div>
                    </div>
                  </div>
                  {isTrash && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={(e) => { e.stopPropagation(); handleRestoreOrder(order); }}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Desktop Table Layout */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-border">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex items-center gap-4 p-4"><div className="h-4 w-20 bg-muted rounded animate-pulse" /><div className="h-4 flex-1 bg-muted rounded animate-pulse" /><div className="h-5 w-16 bg-muted rounded-full animate-pulse" /><div className="h-4 w-20 bg-muted rounded animate-pulse" /></div>)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No orders found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    {view === "active" && (
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    )}
                  </TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="hidden md:table-cell">{view === "trash" ? "Trashed" : "Date"}</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => {
                  const deletedAt = (order as any).deleted_at as string | null;
                  const isTrash = !!deletedAt;
                  const checked = selectedIds.has(order.id);
                  return (
                    <TableRow key={order.id} data-state={checked ? "selected" : undefined}>
                      <TableCell>
                        {!isTrash && (
                          <Checkbox checked={checked} onCheckedChange={() => toggleSelect(order.id)} aria-label="Select row" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{order.order_number}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{order.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{formatCurrency(order.total)}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColors[order.status] || "bg-muted"}`}>
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusColors[order.payment_status] || "bg-muted"}`}>
                          {order.payment_status}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {isTrash && deletedAt
                          ? <span className="text-amber-700">{formatTimeLeft(deletedAt)}</span>
                          : new Date(order.created_at).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewOrder(order)} aria-label="View order">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isTrash ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => handleRestoreOrder(order)}
                              title="Restore"
                              aria-label="Restore order"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteId(order.id)}
                              title="Move to trash"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Billing Details</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Name:</span> {selectedOrder.customer_name}</p>
                  <p><span className="text-muted-foreground">WhatsApp:</span> {selectedOrder.customer_phone}</p>
                  {selectedOrder.customer_email && <p><span className="text-muted-foreground">Email:</span> {selectedOrder.customer_email}</p>}
                  {(selectedOrder as any).billing_country && <p><span className="text-muted-foreground">Country:</span> {(selectedOrder as any).billing_country}</p>}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-semibold mb-2">Delivery Information</h4>
                <div className="text-sm space-y-1">
                  {selectedOrder.recipient_name && <p><span className="text-muted-foreground">Recipient:</span> {selectedOrder.recipient_name}</p>}
                  {selectedOrder.alt_phone && <p><span className="text-muted-foreground">Recipient Phone:</span> {selectedOrder.alt_phone}</p>}
                  <p><span className="text-muted-foreground">Address:</span> {selectedOrder.delivery_address}</p>
                  {(selectedOrder as any).upazila_name && <p><span className="text-muted-foreground">Thana/Upazila:</span> {(selectedOrder as any).upazila_name}</p>}
                  {selectedOrder.delivery_date && <p><span className="text-muted-foreground">Delivery Date:</span> {selectedOrder.delivery_date}</p>}
                  {selectedOrder.delivery_time && <p><span className="text-muted-foreground">Delivery Time:</span> {selectedOrder.delivery_time}</p>}
                  {selectedOrder.gift_message && (
                    <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Gift Message:</p>
                      <p className="text-sm italic">{selectedOrder.gift_message}</p>
                    </div>
                  )}
                  {selectedOrder.notes && (() => {
                    let displayNotes: string | null = selectedOrder.notes;
                    try {
                      const parsed = JSON.parse(selectedOrder.notes);
                      if (parsed.original_notes) displayNotes = parsed.original_notes;
                      else if (parsed.eps_merchant_transaction_id) displayNotes = null;
                    } catch {}
                    return displayNotes ? <p className="mt-1"><span className="text-muted-foreground">Notes:</span> {displayNotes}</p> : null;
                  })()}
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Items</h4>
                {orderItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items</p>
                ) : (
                  <div className="space-y-2">
                    {orderItems.map((item) => (
                      <div key={item.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{item.product_name} × {item.quantity}</span>
                          <span className="font-medium">{formatCurrency(item.total)}</span>
                        </div>
                        {(item as any).custom_images?.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap">
                            {(item as any).custom_images.map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt={`Custom ${i + 1}`} className="w-12 h-12 rounded object-cover border border-border hover:ring-2 ring-primary" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(selectedOrder.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Delivery Fee</span><span>{formatCurrency(selectedOrder.delivery_fee)}</span></div>
                {Number(selectedOrder.discount) > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-destructive">-{formatCurrency(selectedOrder.discount)}</span></div>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t"><span>Total</span><span>{formatCurrency(selectedOrder.total)}</span></div>
              </div>

              <Separator />

              {/* Status Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Order Status</label>
                  <Select value={selectedOrder.status} onValueChange={(v) => updateStatus(selectedOrder.id, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Status</label>
                  <Select value={selectedOrder.payment_status} onValueChange={(v) => updatePaymentStatus(selectedOrder.id, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {paymentStatusOptions.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Danger Zone / Restore */}
              {(selectedOrder as any).deleted_at ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { handleRestoreOrder(selectedOrder); setDetailOpen(false); }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore Order
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteId(selectedOrder.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Move to Trash
                </Button>
              )}
              {selectedOrder.status !== "delivered" && selectedOrder.status !== "cancelled" && (
                <Button asChild variant="secondary" className="w-full mt-2">
                  <Link to={`/admin/delivery/verify/${selectedOrder.id}`}>
                    <ShieldCheck className="h-4 w-4 mr-2" /> Verify Delivery (OTP)
                  </Link>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move this order to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              The order will be hidden from customers and can be restored from the Trash tab within 24 hours. After that it will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteOrder(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Moving..." : "Move to trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkConfirmOpen} onOpenChange={(open) => !deleting && setBulkConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move {selectedIds.size} orders to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              The selected orders will be hidden from customers and can be restored from the Trash tab within 24 hours.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleBulkDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Moving..." : `Move ${selectedIds.size} to trash`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminOrders;
