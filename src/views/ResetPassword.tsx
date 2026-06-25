"use client";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Eye, EyeOff, Check, X } from "lucide-react";
import { toast } from "sonner";
import SEOHead from "@/components/seo/SEOHead";

type LinkState = "checking" | "valid" | "invalid";

const evaluateStrength = (pw: string) => {
  const checks = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length;
  let label = "Very Weak";
  let color = "bg-destructive";
  if (score >= 5) { label = "Strong"; color = "bg-green-500"; }
  else if (score === 4) { label = "Good"; color = "bg-green-400"; }
  else if (score === 3) { label = "Fair"; color = "bg-yellow-500"; }
  else if (score === 2) { label = "Weak"; color = "bg-orange-500"; }
  return { checks, score, label, color };
};

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [linkError, setLinkError] = useState<string>("");
  const navigate = useNavigate();

  const strength = useMemo(() => evaluateStrength(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = !loading && strength.score >= 3 && strength.checks.length && passwordsMatch;

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const errorCode = params.get("error_code") || params.get("error");
    const errorDesc = params.get("error_description");

    if (errorCode) {
      setLinkState("invalid");
      if (errorCode.includes("expired") || errorDesc?.includes("expired")) {
        setLinkError("This reset link has expired. Please request a new one.");
      } else if (errorCode.includes("used") || errorDesc?.includes("used")) {
        setLinkError("This reset link has already been used. Please request a new one.");
      } else {
        setLinkError(errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, " ")) : "This reset link is invalid.");
      }
      return;
    }

    const isRecoveryHash = hash.includes("type=recovery") || hash.includes("access_token");

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && isRecoveryHash)) {
        setLinkState("valid");
      }
    });

    // Fallback: check existing session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && isRecoveryHash) {
        setLinkState("valid");
      } else if (!isRecoveryHash) {
        setLinkState("invalid");
        setLinkError("Invalid reset link. Please request a new password reset.");
      }
    });

    // Timeout safety
    const t = setTimeout(() => {
      setLinkState((s) => {
        if (s === "checking") {
          setLinkError("Invalid or expired reset link. Please request a new one.");
          return "invalid";
        }
        return s;
      });
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!strength.checks.length) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (strength.score < 3) {
      toast.error("Password is too weak. Include uppercase, numbers, or symbols.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        const msg = error.message?.toLowerCase() || "";
        if (msg.includes("same") || msg.includes("different")) {
          toast.error("New password must be different from your current password.");
        } else if (msg.includes("session") || msg.includes("jwt") || msg.includes("expired")) {
          toast.error("Your reset link has expired. Please request a new one.");
          setLinkState("invalid");
          setLinkError("Your reset link has expired. Please request a new one.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Verify session before redirecting
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.success("Password updated. Please sign in with your new password.");
        navigate("/auth");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      toast.success("Password updated successfully!");

      const { data: seller } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (seller) {
        await supabase
          .from("sellers")
          .update({ password_changed_at: new Date().toISOString() })
          .eq("id", seller.id);
        navigate("/seller/dashboard");
      } else {
        navigate("/account");
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (linkState === "checking") {
    return (
      <main className="min-h-[50vh] flex items-center justify-center px-4 py-10 pb-6 md:pb-10">
        <p className="text-muted-foreground text-sm">Verifying reset link…</p>
      </main>
    );
  }

  if (linkState === "invalid") {
    return (
      <main className="min-h-[50vh] flex items-center justify-center px-4 py-10 pb-6 md:pb-10">
        <SEOHead title="Reset Password — Pikooly" description="Set a new password for your Pikooly account." noindex />
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-display font-bold text-foreground mb-2">Reset Link Issue</h1>
          <p className="text-muted-foreground text-sm">{linkError}</p>
          <div className="flex flex-col gap-2 mt-5">
            <button onClick={() => navigate("/auth")} className="text-primary font-semibold text-sm hover:underline">
              Back to Login
            </button>
            <button onClick={() => navigate("/seller/login")} className="text-muted-foreground text-sm hover:underline">
              Seller Login
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[50vh] flex items-center justify-center px-4 py-10 pb-6 md:pb-10">
      <SEOHead title="Reset Password — Pikooly" description="Set a new password for your Pikooly account." noindex />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-bold text-foreground">Set New Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your new password below</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New Password"
              className="w-full pl-11 pr-11 py-3 rounded-xl bg-muted border border-border focus:border-primary outline-none text-base"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={loading}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {password.length > 0 && (
            <div className="space-y-2 px-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${(strength.score / 5) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">{strength.label}</span>
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {[
                  { ok: strength.checks.length, label: "8+ characters" },
                  { ok: strength.checks.upper, label: "Uppercase" },
                  { ok: strength.checks.lower, label: "Lowercase" },
                  { ok: strength.checks.number, label: "Number" },
                  { ok: strength.checks.special, label: "Symbol" },
                ].map((c) => (
                  <li key={c.label} className={`flex items-center gap-1.5 ${c.ok ? "text-green-600" : "text-muted-foreground"}`}>
                    {c.ok ? <Check size={12} /> : <X size={12} />}
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm New Password"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border focus:border-primary outline-none text-base"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-xs text-destructive px-1">Passwords do not match</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            aria-disabled={!canSubmit}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </main>
  );
};

export default ResetPassword;
