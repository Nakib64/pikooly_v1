"use client";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useMultiCurrency } from "@/contexts/CurrencyContext";
import { Search, Package, Truck, CheckCircle, Clock, XCircle, Loader2, MapPin, CreditCard, CalendarDays, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import SEOHead from "@/components/seo/SEOHead";

const trackingSteps = [
  { key: "pending", label: "Order Placed", desc: "Your order has been received", icon: Clock },
  { key: "confirmed", label: "Confirmed", desc: "Order confirmed by our team", icon: CheckCircle },
  { key: "processing", label: "Processing", desc: "Being prepared with care", icon: Package },
  { key: "shipped", label: "Out for Delivery", desc: "On the way to you", icon: Truck },
  { key: "delivered", label: "Delivered", desc: "Successfully delivered", icon: Gift },
];

const getStepIndex = (status: string) => {
  if (status === "cancelled" || status === "returned") return -1;
  const idx = trackingSteps.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
};

const TrackOrder = () => {
  const { formatPrice } = useMultiCurrency();
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    order: any;
    items: any[];
  } | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) {
      toast.error("Please enter your order number");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("track-order", {
        body: { order_number: orderNumber.trim() },
      });
      if (error) {
        // Try to parse the error message for "Order not found"
        const errMsg = typeof error === "object" && error?.message ? error.message : String(error);
        if (errMsg.includes("Order not found") || errMsg.includes("404")) {
          toast.error("Order not found. Please check the number.");
        } else {
          toast.error("Failed to track order. Please try again.");
        }
        return;
      }
      if (data?.error) {
        toast.error(data.error === "Order not found" ? "Order not found. Please check the number." : data.error);
        return;
      }
      setResult(data);
    } catch {
      toast.error("Failed to track order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const order = result?.order;
  const items = result?.items || [];
  const currentStep = order ? getStepIndex(order.status) : 0;
  const isCancelled = order?.status === "cancelled" || order?.status === "returned";

  return (
    <main className="bg-gradient-to-b from-primary/5 via-background to-background pt-6 pb-6 md:pb-10">
      <SEOHead title="Track Your Order — Pikooly" description="Track the real-time status of your Pikooly order — from confirmation to doorstep delivery." canonical={typeof window !== "undefined" ? window.location.href : undefined} />
      <div className="section-container max-w-lg">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <MapPin className="text-primary" size={28} />
          </div>
          <h1 className="text-base md:text-2xl font-display font-semibold text-foreground mb-1">Track Your Order</h1>
          <p className="text-sm text-muted-foreground">Enter your order number to see real-time updates</p>
        </motion.div>

        {/* Search Form */}
        <motion.form
          onSubmit={handleTrack}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-8"
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="e.g. PF-20260220-0974"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="pl-10 h-12 rounded-xl border-border/60 bg-card shadow-sm text-sm focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button type="submit" className="rounded-xl h-12 px-6 font-semibold shadow-sm" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Track"}
            </Button>
          </div>
        </motion.form>

        <AnimatePresence mode="wait">
          {order && (
            <motion.div
              key={order.order_number}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-4"
            >
              {/* Order Header Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-0.5">Order</p>
                    <p className="text-base font-mono font-bold text-primary">{order.order_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-0.5">Placed on</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Status Tracker */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">Order Status</h3>
                {isCancelled ? (
                  <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-xl border border-destructive/20">
                    <XCircle size={22} className="text-destructive flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm capitalize text-destructive">{order.status}</p>
                      <p className="text-xs text-muted-foreground">This order has been {order.status}.</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Background line */}
                    <div className="absolute left-[15px] top-[15px] bottom-[15px] w-0.5 bg-border/50 rounded-full" />
                    {/* Progress line */}
                    <motion.div
                      className="absolute left-[15px] top-[15px] w-0.5 bg-primary rounded-full"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(0, currentStep) * 25}%` }}
                      transition={{ duration: 0.8, ease: "easeInOut", delay: 0.3 }}
                    />
                    <div className="space-y-5">
                      {trackingSteps.map((step, idx) => {
                        const isCompleted = idx <= currentStep;
                        const isCurrent = idx === currentStep;
                        const StepIcon = step.icon;
                        return (
                          <motion.div
                            key={step.key}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + idx * 0.08 }}
                            className="flex items-center gap-3.5 relative"
                          >
                            <div
                              className={`z-10 w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                                isCompleted
                                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                  : "bg-muted text-muted-foreground"
                              } ${isCurrent ? "ring-[3px] ring-primary/20 ring-offset-2 ring-offset-card scale-110" : ""}`}
                            >
                              <StepIcon size={14} strokeWidth={isCompleted ? 2.5 : 1.5} />
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                                {step.label}
                              </p>
                              <p className={`text-xs ${isCurrent ? "text-primary font-medium" : "text-muted-foreground/70"}`}>
                                {isCurrent ? "Current status" : step.desc}
                              </p>
                            </div>
                            {isCompleted && !isCurrent && (
                              <CheckCircle size={14} className="text-primary/50 flex-shrink-0" />
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Items */}
              {items.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm"
                >
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Items ({items.length})</h3>
                  <div className="space-y-3">
                    {items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.product_name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-border/40" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Package size={14} className="text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-foreground flex-shrink-0">{formatPrice(item.total)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{formatPrice(order.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="font-medium">{formatPrice(order.delivery_fee)}</span></div>
                    {Number(order.discount) > 0 && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-destructive font-medium">-{formatPrice(order.discount)}</span></div>
                    )}
                    <Separator className="my-1" />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Delivery Details */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Delivery Details</h3>
                <div className="space-y-3">
                  {order.recipient_name && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Gift size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Recipient</p>
                        <p className="text-sm font-medium text-foreground">{order.recipient_name}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin size={14} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="text-sm font-medium text-foreground">{order.delivery_address}</p>
                    </div>
                  </div>
                  {(order.delivery_date || order.delivery_time) && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CalendarDays size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Schedule</p>
                        <p className="text-sm font-medium text-foreground">
                          {order.delivery_date}{order.delivery_time ? ` • ${order.delivery_time}` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CreditCard size={14} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Payment</p>
                      <p className="text-sm font-medium text-foreground">
                        {order.payment_method.toUpperCase()} — <span className="capitalize">{order.payment_status}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!order && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-12"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-4">
              <Package className="text-muted-foreground/40" size={32} />
            </div>
            <p className="text-sm text-muted-foreground">Your order details will appear here</p>
          </motion.div>
        )}
      </div>
    </main>
  );
};

export default TrackOrder;
