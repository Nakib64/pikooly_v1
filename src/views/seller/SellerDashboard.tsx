"use client";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/useSeller";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bell, BellRing, LogOut, Package, ShoppingCart, Loader2, MapPin, Phone, Search,
  Calendar as CalendarIcon, X, Truck, Eye, Check, Download, Settings2,
  AlertTriangle, Lock, UserCircle2, History, Clock, Timer, Wallet,
} from "lucide-react";
import { SellerProfileSheet } from "@/components/seller/SellerProfileSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OrderDetailsSheet } from "@/components/seller/OrderDetailsSheet";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip, CartesianGrid } from "recharts";

const STATUS_OPTIONS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"] as const;
// Sellers cannot set "cancelled" or "returned" manually — those are admin-only actions.
const SELLER_STATUS_OPTIONS = ["pending", "confirmed", "processing", "shipped", "delivered"] as const;
type Status = typeof STATUS_OPTIONS[number];

type NotifChannel = "both" | "sms" | "email" | "none";
const DEFAULT_PREFS: Record<Status, NotifChannel> = {
  pending: "both", confirmed: "both", processing: "both",
  shipped: "both", delivered: "both", cancelled: "sms", returned: "sms",
};

// SLA thresholds (hours since order created) — overdue if status hasn't reached target gate
const SLA = {
  toProcessing: 24, // pending/confirmed → must reach processing within 24h
  toShipped: 48,    // processing → must ship within 48h
  toDelivered: 72,  // shipped → must deliver within 72h
};

interface Notif {
  id: string;
  order_id: string | null;
  order_number: string | null;
  district_name: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  total: number;
  created_at: string;
  delivery_address: string;
  tracking_number: string | null;
  order_items: { product_name: string; quantity: number; seller_price: number | null; price: number }[] | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-emerald-100 text-emerald-700 border-emerald-200",
  new: "bg-emerald-100 text-emerald-700 border-emerald-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  processing: "bg-orange-100 text-orange-700 border-orange-200",
  shipped: "bg-blue-100 text-blue-700 border-blue-200",
  delivered: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  returned: "bg-red-100 text-red-700 border-red-200",
};

const ORDER_COLUMNS = "id, order_number, customer_name, customer_email, customer_phone, status, total, created_at, delivery_address, tracking_number, order_items(product_name, quantity, seller_price, price)";

const sellerPayout = (o: Order): number =>
  (o.order_items || []).reduce(
    (sum, i) => sum + Number(i.seller_price ?? i.price ?? 0) * Number(i.quantity || 1),
    0
  );

function getSlaState(status: string, createdAt: string): { overdue: boolean; label?: string; hours: number } {
  const hours = differenceInHours(new Date(), new Date(createdAt));
  if (["pending", "confirmed", "new"].includes(status) && hours > SLA.toProcessing) {
    return { overdue: true, label: `Overdue for Processing (${hours}h)`, hours };
  }
  if (status === "processing" && hours > SLA.toShipped) {
    return { overdue: true, label: `Overdue for Shipping (${hours}h)`, hours };
  }
  if (status === "shipped" && hours > SLA.toDelivered) {
    return { overdue: true, label: `Overdue for Delivery (${hours}h)`, hours };
  }
  return { overdue: false, hours };
}

function loadPrefs(): Record<Status, NotifChannel> {
  try {
    const raw = localStorage.getItem("seller_notify_prefs");
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function csvEscape(v: any): string {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

const SellerDashboard = () => {
  const { seller } = useSeller();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [districtName, setDistrictName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [payoutSummary, setPayoutSummary] = useState<{ paid: number; pending: number; lastPaidAt: string | null }>({ paid: 0, pending: 0, lastPaidAt: null });

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  // Tracking & details
  const [trackingDraft, setTrackingDraft] = useState<Record<string, string>>({});
  const [savingTracking, setSavingTracking] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkBusy, setBulkBusy] = useState(false);

  // Notification prefs
  const [prefs, setPrefs] = useState<Record<Status, NotifChannel>>(() => loadPrefs());
  useEffect(() => { localStorage.setItem("seller_notify_prefs", JSON.stringify(prefs)); }, [prefs]);

  // Exporting
  const [exporting, setExporting] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Notification action history log
  type ActionEntry = {
    orderId: string;
    orderNumber: string;
    action: "accepted" | "declined" | "auto-declined";
    at: string;
  };
  const [actionLog, setActionLog] = useState<ActionEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem("seller_action_log") || "[]"); }
    catch { return []; }
  });
  useEffect(() => {
    localStorage.setItem("seller_action_log", JSON.stringify(actionLog.slice(0, 200)));
  }, [actionLog]);

  // Auto-decline timeout (minutes). 0 = disabled.
  const [autoDeclineMin, setAutoDeclineMin] = useState<number>(() => {
    const v = Number(localStorage.getItem("seller_auto_decline_min"));
    return Number.isFinite(v) && v >= 0 ? v : 10;
  });
  useEffect(() => {
    localStorage.setItem("seller_auto_decline_min", String(autoDeclineMin));
  }, [autoDeclineMin]);

  // Auto-accept timeout (minutes). 0 = disabled. If set, must be < auto-decline.
  const [autoAcceptMin, setAutoAcceptMin] = useState<number>(() => {
    const v = Number(localStorage.getItem("seller_auto_accept_min"));
    return Number.isFinite(v) && v >= 0 ? v : 0;
  });
  useEffect(() => {
    localStorage.setItem("seller_auto_accept_min", String(autoAcceptMin));
  }, [autoAcceptMin]);


  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  // Browser push permission (default on — auto-request on first mount)
  const [pushPerm, setPushPerm] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  const requestPush = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPushPerm(p);
    if (p === "granted") toast.success("Push notifications enabled");
  };
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem("seller_push_autorequested") === "1") return;
    localStorage.setItem("seller_push_autorequested", "1");
    Notification.requestPermission().then(setPushPerm).catch(() => {});
  }, []);

  // Seller-side SMS / WhatsApp alerts for new orders (default on)
  const [notifySms, setNotifySms] = useState<boolean>(() => localStorage.getItem("seller_notify_sms") !== "0");
  const [notifyWhatsapp, setNotifyWhatsapp] = useState<boolean>(() => localStorage.getItem("seller_notify_whatsapp") !== "0");
  useEffect(() => { localStorage.setItem("seller_notify_sms", notifySms ? "1" : "0"); }, [notifySms]);
  useEffect(() => { localStorage.setItem("seller_notify_whatsapp", notifyWhatsapp ? "1" : "0"); }, [notifyWhatsapp]);




  const fetchOrders = async (_districtId: string) => {
    if (!seller) return;
    const { data } = await supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("assigned_seller_id", seller.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setOrders((data as any) || []);
  };

  // Admin check
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  // Initial load
  useEffect(() => {
    if (!seller) return;
    (async () => {
      const { data: d } = await supabase
        .from("shipping_districts").select("name").eq("id", seller.district_id).maybeSingle();
      setDistrictName(d?.name || "");

      const { data: notifs } = await supabase
        .from("seller_notifications").select("*")
        .eq("seller_id", seller.id).order("created_at", { ascending: false }).limit(20);
      setNotifications((notifs as Notif[]) || []);

      setLoadingOrders(true);
      await fetchOrders(seller.district_id);
      setLoadingOrders(false);
    })();
  }, [seller]);

  // Realtime
  useEffect(() => {
    if (!seller) return;
    const channel = supabase
      .channel(`seller-notif-${seller.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "seller_notifications", filter: `seller_id=eq.${seller.id}` },
        (payload) => {
          const n = payload.new as Notif;
          setNotifications((prev) => [n, ...prev].slice(0, 20));
          toast.success(n.message, { duration: 6000 });
          fetchOrders(seller.district_id);

          // Seller alerts via SMS / WhatsApp for new orders
          if (seller.phone && (notifySms || notifyWhatsapp) && /new order|order received|placed/i.test(n.message || "")) {
            const alertMsg = `New Pikooly order${n.order_number ? " " + n.order_number : ""}: ${n.message}`;
            if (notifySms) {
              supabase.functions.invoke("send-sms", { body: { to: seller.phone, message: alertMsg } }).catch(() => {});
            }
            if (notifyWhatsapp) {
              supabase.functions.invoke("send-sms", { body: { to: seller.phone, message: alertMsg, channel: "whatsapp" } }).catch(() => {});
            }
          }


          // Browser push notification
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              const note = new Notification("New order — Pikooly", {
                body: `${n.order_number ? n.order_number + " · " : ""}${n.message}`,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                tag: n.order_id || n.id,
              });
              note.onclick = () => {
                window.focus();
                if (n.order_id) setDetailsId(n.order_id);
                note.close();
              };
            } catch {}
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [seller]);

  // Payout summary for dashboard card
  useEffect(() => {
    if (!seller) return;
    let cancelled = false;
    (async () => {
      const { data: payoutData } = await supabase
        .from("seller_payouts")
        .select("amount, paid_at")
        .eq("seller_id", seller.id)
        .order("paid_at", { ascending: false });

      const { data: paidIds } = await supabase.from("seller_payout_orders").select("order_id");
      const excludedIds = (paidIds || []).map((r: any) => r.order_id);

      let q = supabase
        .from("orders")
        .select("id, order_items(quantity, seller_price, price)")
        .eq("status", "delivered")
        .eq("assigned_seller_id", seller.id)
        .limit(500);
      if (excludedIds.length > 0) q = q.not("id", "in", `(${excludedIds.join(",")})`);
      const { data: pendingOrders } = await q;

      const paid = (payoutData || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      const pending = (pendingOrders || []).reduce((s: number, o: any) => {
        const amt = (o.order_items || []).reduce(
          (sum: number, i: any) => sum + Number(i.seller_price ?? i.price ?? 0) * Number(i.quantity || 1),
          0
        );
        return s + amt;
      }, 0);
      if (!cancelled) {
        setPayoutSummary({
          paid,
          pending,
          lastPaidAt: payoutData?.[0]?.paid_at || null,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [seller]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  // Apply filters (+ SLA filter)
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (q) {
        const hay = `${o.order_number} ${o.customer_name} ${o.customer_phone || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (dateFrom) {
        const start = new Date(dateFrom); start.setHours(0, 0, 0, 0);
        if (new Date(o.created_at) < start) return false;
      }
      if (dateTo) {
        const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
        if (new Date(o.created_at) > end) return false;
      }
      if (showOverdueOnly && !getSlaState(o.status, o.created_at).overdue) return false;
      return true;
    });
  }, [orders, search, statusFilter, dateFrom, dateTo, showOverdueOnly]);

  const overdueCount = useMemo(
    () => filteredOrders.filter((o) => getSlaState(o.status, o.created_at).overdue).length,
    [filteredOrders]
  );

  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const newCount = filteredOrders.filter((o) => ["pending", "new", "confirmed"].includes(o.status)).length;
    const processing = filteredOrders.filter((o) => ["processing", "shipped"].includes(o.status)).length;
    const cancelled = filteredOrders.filter((o) => ["cancelled", "returned"].includes(o.status)).length;
    return { total, newCount, processing, cancelled };
  }, [filteredOrders]);

  // Reset selection on filter change
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(filteredOrders.map((o) => o.id));
      const next = new Set<string>();
      prev.forEach((id) => { if (ids.has(id)) next.add(id); });
      return next;
    });
  }, [filteredOrders]);

  const allSelected = filteredOrders.length > 0 && selected.size === filteredOrders.length;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filteredOrders.map((o) => o.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("seller_notifications").update({ read: true }).eq("id", id);
  };
  const markAllRead = async () => {
    if (!seller) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("seller_notifications").update({ read: true }).eq("seller_id", seller.id).eq("read", false);
  };

  const notifyCustomer = async (order: Order, newStatus: string) => {
    const pref = prefs[newStatus as Status] ?? "both";
    if (pref === "none") return;
    const sendSms = (pref === "sms" || pref === "both") && !!order.customer_phone;
    const sendEmail = (pref === "email" || pref === "both") && !!order.customer_email;

    const trackingLine = order.tracking_number ? `\nTracking: ${order.tracking_number}` : "";
    const message = `Hi ${order.customer_name}, your Pikooly order ${order.order_number} is now "${newStatus}".${trackingLine}`;

    if (sendSms) {
      supabase.functions.invoke("send-sms", {
        body: { to: order.customer_phone, message },
      }).catch(() => {});
    }
    if (sendEmail) {
      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
          <h2 style="margin:0 0 12px">Order update</h2>
          <p>Hi ${order.customer_name},</p>
          <p>Your order <strong>${order.order_number}</strong> status has been updated to <strong style="text-transform:capitalize">${newStatus}</strong>.</p>
          ${order.tracking_number ? `<p>Tracking number: <strong>${order.tracking_number}</strong></p>` : ""}
          <p style="color:#666;font-size:13px;margin-top:24px">— Pikooly</p>
        </div>`;
      supabase.functions.invoke("send-email", {
        body: { to: order.customer_email, subject: `Order ${order.order_number} – ${newStatus}`, html, body: message },
      }).catch(() => {});
    }
  };

  const dismissOrderNotifs = async (orderId: string) => {
    const ids = notifications.filter((n) => n.order_id === orderId && !n.read).map((n) => n.id);
    if (ids.length === 0) return;
    setNotifications((prev) => prev.filter((n) => n.order_id !== orderId));
    try { await supabase.from("seller_notifications").update({ read: true }).in("id", ids); } catch {}
  };

  const logAction = (order: Order, action: ActionEntry["action"]) => {
    setActionLog((prev) =>
      [{ orderId: order.id, orderNumber: order.order_number, action, at: new Date().toISOString() }, ...prev].slice(0, 200)
    );
  };

  const updateOrderStatus = async (order: Order, newStatus: string, opts?: { action?: ActionEntry["action"]; silent?: boolean }) => {
    if (newStatus === order.status) return;
    const prev = orders;
    setOrders((p) => p.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o)));

    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", order.id);
    if (error) {
      setOrders(prev);
      toast.error("Failed to update status: " + error.message);
      return;
    }
    supabase.from("order_status_history").insert({
      order_id: order.id, from_status: order.status, to_status: newStatus,
      changed_by: user?.id, note: opts?.action === "auto-declined" ? "Auto-declined (timeout)" : "Updated by seller",
    });
    notifyCustomer(order, newStatus);

    // Pending-flow side effects: log + dismiss
    if (opts?.action) {
      logAction(order, opts.action);
      dismissOrderNotifs(order.id);
    }

    if (!opts?.silent) {
      if (opts?.action === "accepted") toast.success(`Order ${order.order_number} accepted — moved to Processing`);
      else if (opts?.action === "declined") toast.success(`Order ${order.order_number} declined`);
      else if (opts?.action === "auto-declined") toast.warning(`Order ${order.order_number} auto-declined (timeout)`);
      else toast.success(`Status updated to ${newStatus}`);
    }
  };

  // Auto-accept pending orders past the auto-accept timeout (runs first if both set)
  useEffect(() => {
    if (!autoAcceptMin || autoAcceptMin <= 0) return;
    const cutoff = Date.now() - autoAcceptMin * 60_000;
    orders.forEach((o) => {
      if (!["pending", "new", "confirmed"].includes(o.status)) return;
      if (new Date(o.created_at).getTime() < cutoff) {
        updateOrderStatus(o, "processing", { action: "accepted", silent: true });
      }
    });
     
  }, [nowTick, orders, autoAcceptMin]);

  // Auto-decline pending orders past the timeout
  useEffect(() => {
    if (!autoDeclineMin || autoDeclineMin <= 0) return;
    const cutoff = Date.now() - autoDeclineMin * 60_000;
    orders.forEach((o) => {
      if (!["pending", "new", "confirmed"].includes(o.status)) return;
      if (new Date(o.created_at).getTime() < cutoff) {
        updateOrderStatus(o, "cancelled", { action: "auto-declined" });
      }
    });
     
  }, [nowTick, orders, autoDeclineMin]);



  const applyBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    const target = filteredOrders.filter((o) => selected.has(o.id) && o.status !== bulkStatus);
    if (target.length === 0) { toast.info("No orders to update"); return; }
    setBulkBusy(true);
    const ids = target.map((o) => o.id);
    const { error } = await supabase.from("orders").update({ status: bulkStatus }).in("id", ids);
    if (error) {
      setBulkBusy(false);
      toast.error("Bulk update failed: " + error.message);
      return;
    }
    setOrders((p) => p.map((o) => (selected.has(o.id) ? { ...o, status: bulkStatus } : o)));
    // history + notify
    const historyRows = target.map((o) => ({
      order_id: o.id, from_status: o.status, to_status: bulkStatus,
      changed_by: user?.id, note: "Bulk update by seller",
    }));
    supabase.from("order_status_history").insert(historyRows);
    target.forEach((o) => notifyCustomer(o, bulkStatus));

    setBulkBusy(false);
    setSelected(new Set());
    setBulkStatus("");
    toast.success(`Updated ${target.length} order${target.length > 1 ? "s" : ""} to ${bulkStatus}`);
  };

  const applyBulkPendingAction = async (action: "accepted" | "declined") => {
    const targetStatus = action === "accepted" ? "processing" : "cancelled";
    const target = filteredOrders.filter(
      (o) => selected.has(o.id) && ["pending", "new", "confirmed"].includes(o.status)
    );
    if (target.length === 0) {
      toast.info("No pending orders selected");
      return;
    }
    setBulkBusy(true);
    const ids = target.map((o) => o.id);
    const { error } = await supabase.from("orders").update({ status: targetStatus }).in("id", ids);
    if (error) {
      setBulkBusy(false);
      toast.error("Bulk update failed: " + error.message);
      return;
    }
    setOrders((p) => p.map((o) => (ids.includes(o.id) ? { ...o, status: targetStatus } : o)));
    supabase.from("order_status_history").insert(
      target.map((o) => ({
        order_id: o.id,
        from_status: o.status,
        to_status: targetStatus,
        changed_by: user?.id,
        note: action === "accepted" ? "Bulk accepted by seller" : "Bulk declined by seller",
      }))
    );
    target.forEach((o) => {
      notifyCustomer(o, targetStatus);
      logAction(o, action);
      dismissOrderNotifs(o.id);
    });
    setBulkBusy(false);
    setSelected(new Set());
    toast.success(`${action === "accepted" ? "Accepted" : "Declined"} ${target.length} order${target.length > 1 ? "s" : ""}`);
  };


  const saveTracking = async (order: Order) => {
    if (order.status === "delivered" && !isAdmin) {
      toast.error("Tracking is locked after delivery. Admin override required.");
      return;
    }
    const value = (trackingDraft[order.id] ?? order.tracking_number ?? "").trim();
    if (!value) { toast.error("Enter a tracking number"); return; }
    setSavingTracking(order.id);
    const { error } = await supabase.from("orders").update({ tracking_number: value }).eq("id", order.id);
    setSavingTracking(null);
    if (error) { toast.error("Failed to save tracking: " + error.message); return; }
    setOrders((p) => p.map((o) => (o.id === order.id ? { ...o, tracking_number: value } : o)));
    setTrackingDraft((d) => { const c = { ...d }; delete c[order.id]; return c; });
    notifyCustomer({ ...order, tracking_number: value }, order.status);
    toast.success("Tracking saved");
  };

  const exportCsv = async () => {
    if (filteredOrders.length === 0) { toast.info("Nothing to export"); return; }
    setExporting(true);
    try {
      const ids = filteredOrders.map((o) => o.id);
      const { data: hist } = await supabase
        .from("order_status_history")
        .select("order_id, from_status, to_status, created_at, note")
        .in("order_id", ids)
        .order("created_at", { ascending: true });

      const histByOrder: Record<string, any[]> = {};
      (hist || []).forEach((h: any) => {
        (histByOrder[h.order_id] ||= []).push(h);
      });

      const headers = [
        "Order ID", "Created", "Customer", "Phone", "Email", "Address",
        "Items", isAdmin ? "Total (BDT)" : "Your Payout (BDT)", "Status", "Tracking #",
        "SLA hours", "Overdue", "Status history",
      ];
      const rows = filteredOrders.map((o) => {
        const sla = getSlaState(o.status, o.created_at);
        const items = (o.order_items || []).map((i) => `${i.product_name} x${i.quantity}`).join(" | ");
        const history = (histByOrder[o.id] || [])
          .map((h) => `${format(new Date(h.created_at), "yyyy-MM-dd HH:mm")} ${h.from_status || "-"}→${h.to_status}`)
          .join(" ; ");
        return [
          o.order_number,
          format(new Date(o.created_at), "yyyy-MM-dd HH:mm"),
          o.customer_name,
          o.customer_phone || "",
          o.customer_email || "",
          o.delivery_address || "",
          items,
          Number(isAdmin ? o.total : sellerPayout(o)).toFixed(2),
          o.status,
          o.tracking_number || "",
          sla.hours,
          sla.overdue ? "YES" : "",
          history,
        ];
      });

      const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
      const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pikooly-orders-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filteredOrders.length} orders`);
    } finally {
      setExporting(false);
    }
  };

  const handleSignOut = async () => { await signOut(); navigate("/auth"); };
  const clearFilters = () => {
    setSearch(""); setStatusFilter("all"); setDateFrom(undefined); setDateTo(undefined); setShowOverdueOnly(false);
  };
  const hasFilters = search || statusFilter !== "all" || dateFrom || dateTo || showOverdueOnly;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/seller/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">P</div>
            <div>
              <div className="font-display font-semibold text-base leading-tight">Pikooly Seller</div>
              {districtName && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {districtName}
                  {isAdmin && <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 border-primary text-primary">ADMIN</Badge>}
                </div>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-1">
            {/* Notification prefs removed — accept/decline replaces manual status workflow */}


            {/* Seller notifications bell */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 min-w-[20px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <h4 className="text-sm font-semibold">Notifications</h4>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[11px] text-primary hover:underline">Mark all read</button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
                  ) : notifications.slice(0, 10).map((n) => (
                    <button key={n.id} onClick={() => markRead(n.id)}
                      className={cn("w-full text-left px-3 py-2.5 border-b border-border hover:bg-muted/50 transition-colors", !n.read && "bg-primary/5")}>
                      <div className="flex items-start gap-2">
                        <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", !n.read ? "bg-primary" : "bg-transparent")} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] leading-snug text-foreground line-clamp-2">{n.message}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            {n.order_number && <span className="font-mono">{n.order_number}</span>}
                            <span>·</span>
                            <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="sm" asChild title="My products">
              <Link to="/seller/products">
                <Package className="h-4 w-4 mr-1.5" /> Products
              </Link>
            </Button>

            <Button variant="ghost" size="sm" asChild title="Payout status">
              <Link to="/seller/payouts">
                <Wallet className="h-4 w-4 mr-1.5" /> Payouts
              </Link>
            </Button>

            <Button variant="ghost" size="icon" onClick={() => setProfileOpen(true)} title="My profile">
              <UserCircle2 className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard label="Total Orders" value={stats.total} icon={ShoppingCart} tone="primary" />
          <StatCard label="New Orders" value={stats.newCount} icon={Package} tone="emerald" />
          <StatCard label="Processing" value={stats.processing} icon={Loader2} tone="orange" />
          <StatCard label="Cancelled" value={stats.cancelled} icon={Package} tone="red" />
        </section>

        {/* Payout summary */}
        <section className="rounded-2xl border border-border bg-card shadow-sm p-4 md:p-5">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-semibold">Payout summary</h2>
                <p className="text-[11px] text-muted-foreground">
                  {seller?.payout_method ? `Method: ${seller.payout_method}` : "Set your payout method in profile"}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/seller/payouts">View details</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total paid</div>
              <div className="text-xl font-semibold mt-1">৳{payoutSummary.paid.toFixed(0)}</div>
              {payoutSummary.lastPaidAt && (
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Last: {formatDistanceToNow(new Date(payoutSummary.lastPaidAt), { addSuffix: true })}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="text-[11px] uppercase tracking-wide text-amber-700">Pending payout</div>
              <div className="text-xl font-semibold mt-1 text-amber-700">৳{payoutSummary.pending.toFixed(0)}</div>
              <div className="text-[11px] text-amber-700/80 mt-0.5">Delivered, not yet settled</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="text-[11px] uppercase tracking-wide text-emerald-700">Lifetime earnings</div>
              <div className="text-xl font-semibold mt-1 text-emerald-700">
                ৳{(payoutSummary.paid + payoutSummary.pending).toFixed(0)}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-0.5">Paid + pending</div>
            </div>
          </div>
        </section>

        {/* Analytics: sales chart + best sellers */}
        <AnalyticsSection orders={orders} isAdmin={isAdmin} />


        {/* New order notifications panel + auto-decline + push */}
        <NewOrderNotificationsPanel
          orders={orders}
          onAccept={(o) => updateOrderStatus(o, "processing", { action: "accepted" })}
          onDecline={(o) => updateOrderStatus(o, "cancelled", { action: "declined" })}
          onView={(o) => setDetailsId(o.id)}
          autoDeclineMin={autoDeclineMin}
          setAutoDeclineMin={setAutoDeclineMin}
          autoAcceptMin={autoAcceptMin}
          setAutoAcceptMin={setAutoAcceptMin}

          pushPerm={pushPerm}
          requestPush={requestPush}
          notifySms={notifySms}
          setNotifySms={setNotifySms}
          notifyWhatsapp={notifyWhatsapp}
          setNotifyWhatsapp={setNotifyWhatsapp}
          nowTick={nowTick}
          isAdmin={isAdmin}
        />

        {/* Action history log */}
        {actionLog.length > 0 && (
          <ActionHistoryLog log={actionLog} onClear={() => setActionLog([])} />
        )}


        {/* SLA banner */}
        {overdueCount > 0 && (
          <button
            onClick={() => setShowOverdueOnly((v) => !v)}
            className={cn(
              "w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
              showOverdueOnly ? "border-red-300 bg-red-100" : "border-red-200 bg-red-50 hover:bg-red-100"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-200 text-red-700 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-red-800">
                  {overdueCount} order{overdueCount > 1 ? "s" : ""} overdue SLA
                </div>
                <div className="text-[11px] text-red-700/80">
                  Targets — Processing: {SLA.toProcessing}h · Ship: {SLA.toShipped}h · Deliver: {SLA.toDelivered}h
                </div>
              </div>
            </div>
            <span className="text-xs font-medium text-red-700">
              {showOverdueOnly ? "Show all" : "Show overdue only"}
            </span>
          </button>
        )}

        {/* Filters */}
        <section className="bg-card border border-border rounded-2xl shadow-sm p-3 md:p-4 flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID, customer, phone…"
              className="pl-9 h-10 text-base md:text-sm"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[160px] h-10"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 justify-start md:w-[140px] text-sm font-normal">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dateFrom ? format(dateFrom, "MMM d") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 justify-start md:w-[140px] text-sm font-normal">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dateTo ? format(dateTo, "MMM d") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting} className="h-10">
            {exporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
            Export CSV
          </Button>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </section>

        {/* Bulk action bar */}
        {selected.size > 0 && (() => {
          const selectedPendingCount = filteredOrders.filter(
            (o) => selected.has(o.id) && ["pending", "new", "confirmed"].includes(o.status)
          ).length;
          return (
            <section className="bg-primary/5 border border-primary/30 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="text-sm font-medium">
                {selected.size} selected
                {selectedPendingCount > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({selectedPendingCount} pending)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedPendingCount > 0 && (
                  <>
                    <Button
                      size="sm"
                      className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={bulkBusy}
                      onClick={() => applyBulkPendingAction("accepted")}
                    >
                      {bulkBusy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
                      Accept {selectedPendingCount}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 border-red-200 text-red-700 hover:bg-red-50"
                      disabled={bulkBusy}
                      onClick={() => applyBulkPendingAction("declined")}
                    >
                      <X className="h-4 w-4 mr-1.5" />
                      Decline {selectedPendingCount}
                    </Button>
                    <span className="hidden sm:inline-block h-6 w-px bg-border" />
                  </>
                )}
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger className="h-9 w-[180px] text-sm"><SelectValue placeholder="Set status to…" /></SelectTrigger>
                  <SelectContent>
                    {SELLER_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={applyBulkStatus} disabled={!bulkStatus || bulkBusy}>
                  {bulkBusy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
                  Apply
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Cancel</Button>
              </div>
            </section>
          );
        })()}


        {/* Orders */}
        <section className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 md:px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold text-base">Orders</h3>
            <span className="text-xs text-muted-foreground">{filteredOrders.length} of {orders.length}</span>
          </div>

          {loadingOrders ? (
            <div className="p-10 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {hasFilters ? "No orders match your filters." : `No orders yet for ${districtName || "your district"}.`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 w-10">
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium">Order ID</th>
                    <th className="text-left px-4 py-2.5 font-medium">Customer</th>
                    <th className="text-left px-4 py-2.5 font-medium">Product</th>
                    <th className="text-left px-4 py-2.5 font-medium">{isAdmin ? "Total" : "Your Payout"}</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium">Tracking</th>
                    <th className="text-left px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => {
                    const sla = getSlaState(o.status, o.created_at);
                    const trackingLocked = o.status === "delivered" && !isAdmin;
                    const showTrackingEditor = ["shipped", "delivered"].includes(o.status);
                    const draft = trackingDraft[o.id] ?? o.tracking_number ?? "";
                    const isSelected = selected.has(o.id);
                    return (
                      <tr key={o.id}
                        className={cn(
                          "border-t border-border hover:bg-muted/30 transition-colors align-top",
                          sla.overdue && "bg-red-50/60 hover:bg-red-50",
                          isSelected && "bg-primary/5"
                        )}>
                        <td className="px-3 py-3 align-middle">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(o.id)} aria-label={`Select ${o.order_number}`} />
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] whitespace-nowrap">
                          <button onClick={() => setDetailsId(o.id)} className="hover:text-primary hover:underline">
                            {o.order_number}
                          </button>
                          {sla.overdue && (
                            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-red-700">
                              <AlertTriangle className="h-3 w-3" /> {sla.label}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{o.customer_name}</div>
                          {o.customer_phone && (
                            <a href={`tel:${o.customer_phone}`} className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />{o.customer_phone}
                            </a>
                          )}
                          {o.delivery_address && (
                            <div className="text-[11px] text-muted-foreground mt-1 max-w-[220px] line-clamp-2">{o.delivery_address}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px]">
                          {o.order_items?.length
                            ? o.order_items.map((i) => `${i.product_name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">৳{Number(isAdmin ? o.total : sellerPayout(o)).toFixed(0)}</td>
                        <td className="px-4 py-3">
                          {["pending", "new", "confirmed"].includes(o.status) ? (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => updateOrderStatus(o, "processing", { action: "accepted" })}
                              >
                                <Check className="h-3.5 w-3.5 mr-1" /> Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 border-red-200 text-red-700 hover:bg-red-50"
                                onClick={() => updateOrderStatus(o, "cancelled", { action: "declined" })}
                              >
                                <X className="h-3.5 w-3.5 mr-1" /> Decline
                              </Button>
                            </div>
                          ) : (
                            <Select value={o.status} onValueChange={(v) => updateOrderStatus(o, v)}>
                              <SelectTrigger className={cn("h-8 w-[140px] text-xs capitalize border font-medium", statusColors[o.status] || "bg-muted text-foreground")}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SELLER_STATUS_OPTIONS.map((s) => (
                                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                ))}
                                {/* Show current status as read-only option if it's cancelled/returned (admin-set) */}
                                {!SELLER_STATUS_OPTIONS.includes(o.status as any) && (
                                  <SelectItem key={o.status} value={o.status} className="capitalize" disabled>{o.status} (admin)</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-4 py-3 min-w-[220px]">
                          {showTrackingEditor ? (
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                {trackingLocked ? (
                                  <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <Truck className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                )}
                                <Input
                                  value={draft}
                                  disabled={trackingLocked}
                                  onChange={(e) => setTrackingDraft((d) => ({ ...d, [o.id]: e.target.value }))}
                                  placeholder={trackingLocked ? "Locked after delivery" : "Tracking #"}
                                  className="h-8 pl-8 text-xs font-mono"
                                />
                              </div>
                              {!trackingLocked && (
                                <Button size="sm" variant="outline" className="h-8 px-2"
                                  disabled={savingTracking === o.id || draft === (o.tracking_number ?? "")}
                                  onClick={() => saveTracking(o)}>
                                  {savingTracking === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                </Button>
                              )}
                              {trackingLocked && isAdmin === false && o.tracking_number && (
                                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </div>
                          ) : o.tracking_number ? (
                            <span className="text-xs font-mono text-muted-foreground">{o.tracking_number}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setDetailsId(o.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <OrderDetailsSheet
        orderId={detailsId}
        open={!!detailsId}
        onOpenChange={(v) => !v && setDetailsId(null)}
        isAdmin={isAdmin}
      />
      {seller && (
        <SellerProfileSheet
          open={profileOpen}
          onOpenChange={setProfileOpen}
          seller={seller}
          districtName={districtName}
        />
      )}
    </div>
  );
};

const StatCard = ({
  label, value, icon: Icon, tone,
}: { label: string; value: number; icon: any; tone: "primary" | "emerald" | "orange" | "red"; }) => {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-100 text-emerald-600",
    orange: "bg-orange-100 text-orange-600",
    red: "bg-red-100 text-red-600",
  };
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-4 md:p-5 flex items-center gap-4">
      <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center", tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-display font-semibold leading-none mt-1">{value}</p>
      </div>
    </div>
  );
};

// === New Order Notifications Panel ===
const PENDING_STATUSES = ["pending", "new", "confirmed"];

const NewOrderNotificationsPanel = ({
  orders, onAccept, onDecline, onView,
  autoDeclineMin, setAutoDeclineMin,
  autoAcceptMin, setAutoAcceptMin,
  pushPerm, requestPush,
  notifySms, setNotifySms, notifyWhatsapp, setNotifyWhatsapp,
  nowTick, isAdmin,
}: {
  orders: Order[];
  onAccept: (o: Order) => void;
  onDecline: (o: Order) => void;
  onView: (o: Order) => void;
  autoDeclineMin: number;
  setAutoDeclineMin: (n: number) => void;
  autoAcceptMin: number;
  setAutoAcceptMin: (n: number) => void;
  pushPerm: NotificationPermission;
  requestPush: () => void;
  notifySms: boolean;
  setNotifySms: (v: boolean) => void;
  notifyWhatsapp: boolean;
  setNotifyWhatsapp: (v: boolean) => void;
  nowTick: number;
  isAdmin?: boolean;
}) => {
  const pending = orders.filter((o) => PENDING_STATUSES.includes(o.status));

  const remainingLabel = (createdAt: string) => {
    // Pick whichever auto-action will fire first (>0)
    const candidates = [
      autoAcceptMin > 0 ? { kind: "accept" as const, min: autoAcceptMin } : null,
      autoDeclineMin > 0 ? { kind: "decline" as const, min: autoDeclineMin } : null,
    ].filter(Boolean) as { kind: "accept" | "decline"; min: number }[];
    if (candidates.length === 0) return null;
    const next = candidates.sort((a, b) => a.min - b.min)[0];
    const ms = new Date(createdAt).getTime() + next.min * 60_000 - nowTick;
    if (ms <= 0) return next.kind === "accept" ? "Auto-accepting…" : "Expiring…";
    const m = Math.floor(ms / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return `${m}m ${s.toString().padStart(2, "0")}s · auto-${next.kind}`;
  };


  return (
    <section className="bg-card border border-border rounded-2xl shadow-sm">
      <div className="px-4 md:px-5 py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <BellRing className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-base leading-tight">New order notifications</h3>
            <p className="text-[11px] text-muted-foreground">
              {pending.length === 0 ? "No new orders waiting" : `${pending.length} awaiting your response`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Push toggle */}
          {pushPerm !== "granted" && (
            <Button size="sm" variant="outline" className="h-8" onClick={requestPush}>
              <BellRing className="h-3.5 w-3.5 mr-1.5" />
              {pushPerm === "denied" ? "Push blocked" : "Enable push"}
            </Button>
          )}
          {pushPerm === "granted" && (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">
              <BellRing className="h-3 w-3 mr-1" /> Push on
            </Badge>
          )}

          {/* SMS / WhatsApp alert toggles */}
          <button
            type="button"
            onClick={() => setNotifySms(!notifySms)}
            className={cn(
              "inline-flex items-center gap-1 px-2 h-8 rounded-md border text-[11px] font-medium transition-colors",
              notifySms ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-background text-muted-foreground hover:bg-muted"
            )}
            title="SMS alerts for new orders"
          >
            <Phone className="h-3 w-3" /> SMS {notifySms ? "on" : "off"}
          </button>
          <button
            type="button"
            onClick={() => setNotifyWhatsapp(!notifyWhatsapp)}
            className={cn(
              "inline-flex items-center gap-1 px-2 h-8 rounded-md border text-[11px] font-medium transition-colors",
              notifyWhatsapp ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-background text-muted-foreground hover:bg-muted"
            )}
            title="WhatsApp alerts for new orders"
          >
            <BellRing className="h-3 w-3" /> WhatsApp {notifyWhatsapp ? "on" : "off"}
          </button>


          {/* Auto-accept timeout */}
          <div className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[11px] text-muted-foreground">Auto-accept</span>
            <Select value={String(autoAcceptMin)} onValueChange={(v) => setAutoAcceptMin(Number(v))}>
              <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Off</SelectItem>
                <SelectItem value="1">1 min</SelectItem>
                <SelectItem value="2">2 min</SelectItem>
                <SelectItem value="5">5 min</SelectItem>
                <SelectItem value="10">10 min</SelectItem>
                <SelectItem value="15">15 min</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auto-decline timeout */}
          <div className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Auto-decline</span>
            <Select value={String(autoDeclineMin)} onValueChange={(v) => setAutoDeclineMin(Number(v))}>
              <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Off</SelectItem>
                <SelectItem value="5">5 min</SelectItem>
                <SelectItem value="10">10 min</SelectItem>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="60">60 min</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>
      </div>

      {pending.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          You’re all caught up. New orders will appear here in real-time.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {pending.map((o) => {
            const remain = remainingLabel(o.created_at);
            const expiring = remain === "Expiring…";
            return (
              <li key={o.id} className={cn("p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-3", expiring && "bg-red-50/60")}>
                <button onClick={() => onView(o)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[12px] text-foreground">{o.order_number}</span>
                    <span className="text-sm font-medium">{o.customer_name}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-medium">৳{Number(isAdmin ? o.total : sellerPayout(o)).toFixed(0)}</span>
                    {remain && (
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded",
                        expiring ? "bg-red-100 text-red-700" : "bg-amber-50 text-amber-700"
                      )}>
                        <Clock className="h-3 w-3" /> {remain}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    {o.order_items?.length
                      ? o.order_items.map((i) => `${i.product_name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")
                      : o.delivery_address}
                  </div>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => onAccept(o)}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => onDecline(o)}
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Decline
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

// === Action history log ===
const ActionHistoryLog = ({
  log, onClear,
}: {
  log: { orderId: string; orderNumber: string; action: "accepted" | "declined" | "auto-declined"; at: string }[];
  onClear: () => void;
}) => {
  const tone = (a: string) =>
    a === "accepted"
      ? "bg-emerald-100 text-emerald-700"
      : a === "auto-declined"
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-700";

  return (
    <section className="bg-card border border-border rounded-2xl shadow-sm">
      <div className="px-4 md:px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-base">Notification history</h3>
        </div>
        <button onClick={onClear} className="text-[11px] text-muted-foreground hover:text-foreground">Clear</button>
      </div>
      <ul className="max-h-72 overflow-y-auto divide-y divide-border">
        {log.slice(0, 50).map((e, i) => (
          <li key={i} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded", tone(e.action))}>
                {e.action.replace("-", " ")}
              </span>
              <span className="font-mono text-[12px] truncate">{e.orderNumber}</span>
            </div>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(e.at), { addSuffix: true })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

// === Analytics Section: sales chart + best sellers ===
const AnalyticsSection = ({ orders, isAdmin }: { orders: Order[]; isAdmin: boolean }) => {
  const [range, setRange] = useState<"daily" | "weekly" | "monthly">("daily");

  const chartData = useMemo(() => {
    const buckets = new Map<string, { label: string; sortKey: string; revenue: number; count: number }>();
    const fmtKey = (d: Date) => {
      if (range === "daily") return { key: format(d, "yyyy-MM-dd"), label: format(d, "MMM d") };
      if (range === "weekly") {
        const start = new Date(d); start.setDate(d.getDate() - d.getDay());
        return { key: format(start, "yyyy-'W'II"), label: `W/${format(start, "MMM d")}` };
      }
      return { key: format(d, "yyyy-MM"), label: format(d, "MMM yyyy") };
    };
    orders.forEach((o) => {
      if (["cancelled", "returned"].includes(o.status)) return;
      const { key, label } = fmtKey(new Date(o.created_at));
      const amount = isAdmin ? Number(o.total) : sellerPayout(o);
      const b = buckets.get(key) || { label, sortKey: key, revenue: 0, count: 0 };
      b.revenue += amount;
      b.count += 1;
      buckets.set(key, b);
    });
    const arr = Array.from(buckets.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return range === "daily" ? arr.slice(-14) : range === "weekly" ? arr.slice(-12) : arr.slice(-12);
  }, [orders, range, isAdmin]);

  const bestSellers = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    orders.forEach((o) => {
      if (["cancelled", "returned"].includes(o.status)) return;
      (o.order_items || []).forEach((i) => {
        const cur = map.get(i.product_name) || { name: i.product_name, qty: 0, revenue: 0 };
        const unit = Number(isAdmin ? i.price : (i.seller_price ?? i.price ?? 0));
        cur.qty += Number(i.quantity || 1);
        cur.revenue += unit * Number(i.quantity || 1);
        map.set(i.product_name, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [orders, isAdmin]);

  const totalRevenue = chartData.reduce((s, b) => s + b.revenue, 0);

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm p-4 md:p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="font-display font-semibold text-base">Sales overview</h3>
            <p className="text-[11px] text-muted-foreground">
              {chartData.length} {range} buckets · ৳{totalRevenue.toFixed(0)} total
            </p>
          </div>
          <Select value={range} onValueChange={(v) => setRange(v as any)}>
            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {chartData.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
            No sales data yet.
          </div>
        ) : (
          <SalesChart data={chartData} />
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm p-4 md:p-5">
        <h3 className="font-display font-semibold text-base mb-3">Best sellers</h3>
        {bestSellers.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No products sold yet.</div>
        ) : (
          <ul className="space-y-2.5">
            {bestSellers.map((p, i) => (
              <li key={p.name} className="flex items-start gap-2.5">
                <div className="h-6 w-6 rounded-md bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-clamp-1">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.qty} sold · ৳{p.revenue.toFixed(0)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

const SalesChart = ({ data }: { data: { label: string; revenue: number; count: number }[] }) => {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="sellerSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <ReTooltip
            formatter={(v: any, name: string) => name === "revenue" ? [`৳${Number(v).toFixed(0)}`, "Revenue"] : [v, "Orders"]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#sellerSales)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SellerDashboard;


