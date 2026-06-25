import { useState } from "react";
import { useNavigate } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { mapAuthError } from "@/lib/authErrors";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { logAdminActivity } from "@/lib/activityLog";

const AdminLogin = () => {
  const { settings } = useSiteSettings();
  const logoUrl = settings.company_logo || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaUserEmail, setMfaUserEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    const trimmedEmail = email.trim();
    const { error } = await signIn(trimmedEmail, password);

    if (error) {
      setIsLoading(false);
      await logAdminActivity({
        action: "login_failed",
        userEmail: trimmedEmail,
        description: `Failed login attempt: ${error.message}`,
      });
      const f = mapAuthError(error.message);
      toast({ title: f.title, description: f.description, variant: "destructive" });
      return;
    }

    // Check whether MFA is required to reach assurance level 2
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.nextLevel === "aal2" && aalData.currentLevel === "aal1") {
      // Need to challenge a verified TOTP factor
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp?.find((f) => f.status === "verified");
      if (verified) {
        const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
          factorId: verified.id,
        });
        if (chErr || !challenge) {
          setIsLoading(false);
          toast({ title: "2FA Error", description: chErr?.message || "Could not start challenge", variant: "destructive" });
          return;
        }
        setMfaFactorId(verified.id);
        setMfaChallengeId(challenge.id);
        setMfaUserEmail(trimmedEmail);
        setMfaRequired(true);
        setIsLoading(false);
        return;
      }
    }

    // No MFA required → success
    setIsLoading(false);
    await logAdminActivity({
      action: "login_success",
      userEmail: trimmedEmail,
      description: "Admin signed in",
    });
    navigate("/admin");
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || !mfaChallengeId || mfaCode.length !== 6) return;
    setIsLoading(true);
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: mfaChallengeId,
      code: mfaCode,
    });
    setIsLoading(false);

    if (error) {
      await logAdminActivity({
        action: "mfa_challenge_failed",
        userEmail: mfaUserEmail,
        description: `Invalid 2FA code: ${error.message}`,
      });
      toast({ title: "Invalid Code", description: error.message, variant: "destructive" });
      return;
    }

    await logAdminActivity({
      action: "login_success",
      userEmail: mfaUserEmail,
      description: "Admin signed in (2FA verified)",
    });
    navigate("/admin");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-display">
            {logoUrl ? (
              <img src={logoUrl} alt={settings.store_name || "Pikooly"} className="h-10 mx-auto object-contain" />
            ) : (
              <span className="text-foreground">{settings.store_name || "Pikooly"}</span>
            )}

          </CardTitle>
          <CardDescription>{mfaRequired ? "Two-Factor Verification" : "Admin Panel Login"}</CardDescription>
        </CardHeader>
        <CardContent>
          {mfaRequired ? (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="flex items-start gap-2 text-sm text-muted-foreground border-l-2 border-primary pl-3">
                <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>Enter the 6-digit code from your authenticator app to complete sign-in.</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mfaCode">Verification Code</Label>
                <Input
                  id="mfaCode"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoFocus
                  className="text-lg tracking-widest text-center"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || mfaCode.length !== 6}>
                {isLoading ? "Verifying..." : "Verify & Sign In"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setMfaRequired(false);
                  setMfaCode("");
                  setMfaFactorId(null);
                  setMfaChallengeId(null);
                }}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter Your Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
