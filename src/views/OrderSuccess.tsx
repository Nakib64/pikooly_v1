"use client";
import { useParams, Link, useSearchParams } from "@/lib/router-adapter";
import { Button } from "@/components/ui/button";
import { Home, Phone, Mail, PartyPopper, CircleCheckBig, Package, Truck, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { useMultiCurrency } from "@/contexts/CurrencyContext";
import SEOHead from "@/components/seo/SEOHead";
import { useEffect, useRef } from "react";

const trackingSteps = [
  { key: "pending", label: "Order Placed", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

const getStepIndex = (status: string) => {
  if (status === "cancelled" || status === "returned") return -1;
  const idx = trackingSteps.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
};

const OrderSuccess = () => {
  const { orderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const { settings } = useSiteSettings();
  const { formatPrice } = useMultiCurrency();
  const capturedRef = useRef(false);

  const storePhone = settings?.store_phone || "";
  const storeEmail = settings?.store_email || "";
  const whatsapp = settings?.whatsapp_number || "";

  // Capture PayPal payment on return from approval
  useEffect(() => {
    const paypalToken = searchParams.get("token");
    const paypalFlag = searchParams.get("paypal");
    const orderId = searchParams.get("order_id");
    if (paypalFlag && paypalToken && !capturedRef.current) {
      capturedRef.current = true;
      supabase.functions
        .invoke("paypal-payment", {
          body: { action: "capture", paypal_order_id: paypalToken, order_id: orderId },
        })
        .catch((e) => console.error("PayPal capture error:", e));
    }
    // Stripe is captured server-side via session_id presence; verify silently
    const stripeSession = searchParams.get("stripe_session");
    if (stripeSession && !capturedRef.current) {
      capturedRef.current = true;
      supabase.functions
        .invoke("stripe-payment", {
          body: { action: "verify", session_id: stripeSession },
        })
        .catch((e) => console.error("Stripe verify error:", e));
    }
  }, [searchParams]);


  const { data, isLoading } = useQuery({
    queryKey: ["track-order", orderNumber],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("track-order", {
        body: { order_number: orderNumber },
      });
      if (error) throw error;
      return data as {
        order: {
          order_number: string;
          customer_name: string;
          status: string;
          payment_status: string;
          payment_method: string;
          subtotal: number;
          delivery_fee: number;
          discount: number;
          total: number;
          delivery_address: string;
          delivery_date: string | null;
          delivery_time: string | null;
          recipient_name: string | null;
          created_at: string;
        };
        items: { product_name: string; quantity: number; price: number; total: number }[];
      };
    },
    enabled: !!orderNumber,
  });

  const order = data?.order;
  const items = data?.items || [];
  const currentStep = order ? getStepIndex(order.status) : 0;
  const isCancelled = order?.status === "cancelled" || order?.status === "returned";

  return (
    <main className="bg-gradient-to-b from-primary/5 via-background to-background pt-10 sm:pt-16 pb-6 md:pb-10">
      <SEOHead title="Order Confirmed — Pikooly" description="Thank you! Your order has been placed successfully. Track your delivery status here." noindex />
      <div className="section-container max-w-xl">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="flex justify-center mb-6"
        >
          <div className="relative">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center"
            >
              <CircleCheckBig size={52} className="text-green-600" strokeWidth={1.8} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="absolute -top-2 -right-2"
            >
              <PartyPopper size={28} className="text-amber-500" />
            </motion.div>
          </div>
        </motion.div>

        {/* Thank You Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">Thank You for Your Order!</h1>
          <p className="text-muted-foreground text-sm md:text-base">Your order has been placed successfully.</p>
        </motion.div>

        {/* Order Number Card */}
        {orderNumber && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-card border border-border rounded-2xl p-5 mb-6 text-center shadow-sm"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Order Number</p>
            <p className="text-lg md:text-xl font-mono font-bold text-primary tracking-wide">{orderNumber}</p>
            {order && (
              <p className="text-xs text-muted-foreground mt-1">
                Placed on {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </motion.div>
        )}

        {/* Order Tracking */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-muted-foreground" size={28} />
          </div>
        ) : order ? (
          <>
            {/* Status Tracker */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card border border-border rounded-2xl p-5 mb-6 shadow-sm"
            >
              <h3 className="text-sm font-semibold mb-5">Order Status</h3>

              {isCancelled ? (
                <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-xl">
                  <XCircle size={24} className="text-destructive" />
                  <div>
                    <p className="font-semibold text-sm capitalize">{order.status}</p>
                    <p className="text-xs text-muted-foreground">This order has been {order.status}.</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute left-[15px] top-[15px] bottom-[15px] w-0.5 bg-border" />
                  <div
                    className="absolute left-[15px] top-[15px] w-0.5 bg-primary transition-all duration-500"
                    style={{ height: `${Math.max(0, currentStep) * 25}%` }}
                  />

                  <div className="space-y-5">
                    {trackingSteps.map((step, idx) => {
                      const isCompleted = idx <= currentStep;
                      const isCurrent = idx === currentStep;
                      const StepIcon = step.icon;

                      return (
                        <div key={step.key} className="flex items-center gap-3 relative">
                          <div
                            className={`z-10 w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                              isCompleted
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            } ${isCurrent ? "ring-2 ring-primary/30 ring-offset-2 ring-offset-card" : ""}`}
                          >
                            <StepIcon size={14} />
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                              {step.label}
                            </p>
                            {isCurrent && (
                              <p className="text-xs text-primary font-medium">Current status</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Order Items */}
            {items.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-card border border-border rounded-2xl p-5 mb-6 shadow-sm"
              >
                <h3 className="text-sm font-semibold mb-3">Order Items</h3>
                <div className="space-y-2.5">
                  {items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.product_name} × {item.quantity}
                      </span>
                      <span className="font-medium">{formatPrice(item.total)}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>{formatPrice(order.delivery_fee)}</span>
                  </div>
                  {Number(order.discount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="text-destructive">-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <Separator className="my-1.5" />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Delivery Details */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="bg-card border border-border rounded-2xl p-5 mb-6 shadow-sm"
            >
              <h3 className="text-sm font-semibold mb-3">Delivery Details</h3>
              <div className="text-sm space-y-1.5 text-muted-foreground">
                {order.recipient_name && <p><span className="font-medium text-foreground">Recipient:</span> {order.recipient_name}</p>}
                <p><span className="font-medium text-foreground">Address:</span> {order.delivery_address}</p>
                {order.delivery_date && <p><span className="font-medium text-foreground">Date:</span> {order.delivery_date}</p>}
                {order.delivery_time && <p><span className="font-medium text-foreground">Time:</span> {order.delivery_time}</p>}
                <p><span className="font-medium text-foreground">Payment:</span> {order.payment_method.toUpperCase()} — <span className="capitalize">{order.payment_status}</span></p>
              </div>
            </motion.div>
          </>
        ) : null}

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="bg-muted/50 border border-border rounded-2xl p-5 mb-8"
        >
          <h3 className="text-sm font-semibold mb-3">Need Help?</h3>
          <div className="space-y-2">
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Phone size={14} /><span>WhatsApp: {whatsapp}</span>
              </a>
            )}
            {storePhone && (
              <a href={`tel:${storePhone}`} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Phone size={14} /><span>Call: {storePhone}</span>
              </a>
            )}
            {storeEmail && (
              <a href={`mailto:${storeEmail}`} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Mail size={14} /><span>{storeEmail}</span>
              </a>
            )}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link to={`/track-order?order=${orderNumber || ""}`} className="flex-1 sm:flex-none">
            <Button variant="outline" className="rounded-full gap-2 w-full sm:w-auto px-6 h-11">
              <Package size={16} /> Track Your Order
            </Button>
          </Link>
          <Link to="/" className="flex-1 sm:flex-none">
            <Button className="rounded-full gap-2 w-full sm:w-auto px-6 h-11">
              <Home size={16} /> Back to Home
            </Button>
          </Link>
        </motion.div>
      </div>
    </main>
  );
};

export default OrderSuccess;
