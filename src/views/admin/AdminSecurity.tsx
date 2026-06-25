"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldOff, Loader2, KeyRound, AlertTriangle } from "lucide-react";
import { logAdminActivity } from "@/lib/activityLog";

interface MfaFactor {
  id: string;
  status: "verified" | "unverified";
  friendly_name?: string;
}

const AdminSecurity = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [verifiedFactor, setVerifiedFactor] = useState<MfaFactor | null>(null);

  // Enrollment state
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<{
    factorId: string;
    qr: string;
    secret: string;
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Disable state
  const [disabling, setDisabling] = useState(false);

  const refreshFactors = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    setLoading(false);
    if (error) {
      toast({ title: "Failed to load 2FA status", description: error.message, variant: "destructive" });
      return;
    }
    const totp = (data?.totp ?? []) as MfaFactor[];
    const verified = totp.find((f) => f.status === "verified") ?? null;
    setVerifiedFactor(verified);

    // Clean up any stale unverified factors (abandoned enrollments)
    const stale = totp.filter((f) => f.status !== "verified");
    for (const f of stale) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  };

  useEffect(() => {
    refreshFactors();
  }, []);

  const startEnrollment = async () => {
    setEnrolling(true);
    // Always clean stale factors first
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const stale = (existing?.totp ?? []).filter((f) => f.status !== "verified");
    for (const f of stale) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Admin TOTP ${Date.now()}`,
    });
    setEnrolling(false);
    if (error || !data) {
      toast({ title: "Could not start 2FA setup", description: error?.message, variant: "destructive" });
      return;
    }
    setEnrollData({
      factorId: data.id,
      qr: data.totp.qr_code,
      secret: data.totp.secret,
    });
  };

  const verifyEnrollment = async () => {
    if (!enrollData || verifyCode.length !== 6) return;
    setVerifying(true);
    const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
      factorId: enrollData.factorId,
    });
    if (chErr || !challenge) {
      setVerifying(false);
      toast({ title: "Verification failed", description: chErr?.message, variant: "destructive" });
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enrollData.factorId,
      challengeId: challenge.id,
      code: verifyCode,
    });
    setVerifying(false);
    if (vErr) {
      toast({ title: "Invalid code", description: vErr.message, variant: "destructive" });
      return;
    }
    toast({ title: "2FA Enabled", description: "Two-factor authentication is now active on your admin account." });
    await logAdminActivity({
      action: "mfa_enabled",
      userId: user?.id,
      userEmail: user?.email,
      description: "Admin enabled TOTP 2FA",
    });
    setEnrollData(null);
    setVerifyCode("");
    await refreshFactors();
  };

  const cancelEnrollment = async () => {
    if (enrollData) {
      await supabase.auth.mfa.unenroll({ factorId: enrollData.factorId });
    }
    setEnrollData(null);
    setVerifyCode("");
  };

  const disable2FA = async () => {
    if (!verifiedFactor) return;
    if (!confirm("Disable 2FA? Your account will only be protected by your password.")) return;
    setDisabling(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
    setDisabling(false);
    if (error) {
      toast({ title: "Failed to disable 2FA", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "2FA Disabled", description: "Two-factor authentication has been removed." });
    await logAdminActivity({
      action: "mfa_disabled",
      userId: user?.id,
      userEmail: user?.email,
      description: "Admin disabled TOTP 2FA",
    });
    await refreshFactors();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Security</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Protect your admin account with two-factor authentication (TOTP).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {verifiedFactor ? (
              <ShieldCheck className="h-4 w-4 text-primary" />
            ) : (
              <ShieldOff className="h-4 w-4 text-muted-foreground" />
            )}
            Two-Factor Authentication (TOTP)
          </CardTitle>
          <CardDescription>
            Use Google Authenticator, Authy, 1Password, or any TOTP app to generate 6-digit codes at sign-in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : verifiedFactor ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
                  <ShieldCheck className="h-3 w-3" /> Enabled
                </span>
                <span className="text-muted-foreground">
                  Your account requires a code at every sign-in.
                </span>
              </div>
              <Button variant="destructive" onClick={disable2FA} disabled={disabling} className="gap-2">
                {disabling ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                Disable 2FA
              </Button>
            </div>
          ) : enrollData ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4 bg-muted/30 flex flex-col items-center gap-3">
                <p className="text-sm font-medium">1. Scan this QR code with your authenticator app</p>
                <div
                  className="bg-white p-3 rounded-md"
                  dangerouslySetInnerHTML={{ __html: enrollData.qr }}
                />
                <div className="text-xs text-muted-foreground text-center">
                  Or enter this secret manually:
                  <code className="block mt-1 font-mono text-foreground bg-background border border-border rounded px-2 py-1 break-all">
                    {enrollData.secret}
                  </code>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="verifyCode">2. Enter the 6-digit code from your app</Label>
                <Input
                  id="verifyCode"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-lg tracking-widest text-center max-w-[180px]"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={verifyEnrollment} disabled={verifying || verifyCode.length !== 6} className="gap-2">
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Verify & Enable
                </Button>
                <Button variant="outline" onClick={cancelEnrollment} disabled={verifying}>
                  Cancel
                </Button>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground border-l-2 border-amber-500 pl-3">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <span>Save your TOTP secret somewhere safe. If you lose access to your authenticator app, you'll be locked out of admin.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                2FA is currently <strong className="text-foreground">disabled</strong>. Enable it to add an extra layer
                of protection.
              </p>
              <Button onClick={startEnrollment} disabled={enrolling} className="gap-2">
                {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Enable 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSecurity;
