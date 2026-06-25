import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, KeyRound, ArrowLeft } from "lucide-react";
import SEOHead from "@/components/seo/SEOHead";

type Step = "phone" | "verify";

export default function ResetPasswordPhone() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendOtp = async () => {
    if (!phone.trim()) { toast.error("Enter phone number"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-phone-otp", { body: { phone, purpose: "reset" } });
      if (error || !data?.success) { toast.error(data?.error || error?.message || "Failed"); return; }
      toast.success("OTP sent");
      setPhone(data.phone);
      setStep("verify");
      setCooldown(60);
    } finally { setLoading(false); }
  };

  const verifyAndReset = async () => {
    if (otp.length !== 6) { toast.error("Enter 6-digit code"); return; }
    if (newPassword.length < 6) { toast.error("Password too short (min 6 chars)"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-phone-otp", {
        body: { phone, code: otp, purpose: "reset", new_password: newPassword },
      });
      if (error || !data?.success) { toast.error(data?.error || error?.message || "Failed"); return; }
      toast.success("Password updated. Please sign in.");
      navigate("/auth");
    } finally { setLoading(false); }
  };

  return (
    <main className="min-h-[50vh] flex items-center justify-center px-4 py-10">
      <SEOHead title="Reset Password by Phone — Pikooly" description="Reset your Pikooly account password using your phone number." noindex />
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound size={20} /> Reset Password via Phone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "phone" ? (
              <>
                <Input
                  type="tel" inputMode="numeric" placeholder="01XXXXXXXXX"
                  value={phone} onChange={(e) => setPhone(e.target.value)} className="text-base"
                />
                <Button onClick={sendOtp} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="animate-spin" size={16} /> : "Send OTP"}
                </Button>
                <button onClick={() => navigate("/auth")} className="flex items-center gap-1 text-sm text-muted-foreground mx-auto">
                  <ArrowLeft size={14} /> Back to sign in
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to {phone}</p>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>{[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
                  </InputOTP>
                </div>
                <Input
                  type="password" placeholder="New password (min 6 chars)"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="text-base"
                />
                <Button onClick={verifyAndReset} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="animate-spin" size={16} /> : "Reset Password"}
                </Button>
                <button onClick={sendOtp} disabled={cooldown > 0 || loading} className="w-full text-sm text-primary disabled:text-muted-foreground">
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
