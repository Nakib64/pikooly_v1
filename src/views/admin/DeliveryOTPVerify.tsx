"use client";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, Send, ShieldCheck, ArrowLeft } from "lucide-react";

export default function DeliveryOTPVerify() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [phoneLast4, setPhoneLast4] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    supabase.from("orders").select("id, order_number, customer_name, customer_phone, total, status, delivery_address").eq("id", orderId).maybeSingle()
      .then(({ data }) => setOrder(data));
  }, [orderId]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendOtp = async () => {
    if (!orderId) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-delivery-otp", { body: { order_id: orderId } });
      if (error || !data?.success) { toast.error(data?.error || error?.message || "Failed to send OTP"); return; }
      setSent(true);
      setPhoneLast4(data.phone_last4 ?? "");
      setCooldown(60);
      toast.success(`OTP sent to customer (••••${data.phone_last4 ?? ""})`);
    } finally { setSending(false); }
  };

  const verify = async () => {
    if (otp.length !== 6 || !orderId) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-delivery-otp", { body: { order_id: orderId, code: otp } });
      if (error || !data?.success) { toast.error(data?.error || error?.message || "Invalid code"); return; }
      toast.success("Delivery confirmed ✓");
      setTimeout(() => navigate("/admin/orders"), 1200);
    } finally { setVerifying(false); }
  };

  return (
    <main className="min-h-screen bg-muted/30 p-4 sm:p-6">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ArrowLeft size={16} /> Back
        </button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck size={20} /> Delivery Confirmation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {order ? (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="font-semibold">{order.order_number}</div>
                <div>{order.customer_name}</div>
                <div className="text-muted-foreground">{order.customer_phone}</div>
                <div className="text-muted-foreground text-xs">{order.delivery_address}</div>
                <div className="pt-1 font-medium">Total: ৳{order.total}</div>
                <div className="text-xs text-muted-foreground">Status: {order.status}</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Loading order...</div>
            )}

            {!sent ? (
              <Button onClick={sendOtp} disabled={sending || !order} className="w-full">
                {sending ? <><Loader2 className="animate-spin mr-2" size={16} />Sending...</> : <><Send className="mr-2" size={16} />Send OTP to Customer</>}
              </Button>
            ) : (
              <>
                <div className="text-center text-sm text-muted-foreground">
                  Enter 6-digit code from customer's phone (••••{phoneLast4})
                </div>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button onClick={verify} disabled={otp.length !== 6 || verifying} className="w-full">
                  {verifying ? <><Loader2 className="animate-spin mr-2" size={16} />Verifying...</> : "Confirm Delivery"}
                </Button>
                <button
                  onClick={sendOtp}
                  disabled={cooldown > 0 || sending}
                  className="w-full text-sm text-primary disabled:text-muted-foreground"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                </button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
