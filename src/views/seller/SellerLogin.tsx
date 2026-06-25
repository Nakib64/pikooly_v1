"use client";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "@/lib/router-adapter";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useSeller } from "@/hooks/useSeller";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { mapAuthError } from "@/lib/authErrors";
import { Lock, Mail, Store, Eye, EyeOff, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .nonempty({ message: "Email is required" })
    .email({ message: "Enter a valid email address" })
    .max(255, { message: "Email is too long" }),
  password: z
    .string()
    .nonempty({ message: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters" })
    .max(72, { message: "Password is too long" }),
});

const SellerLogin = () => {
  const { settings } = useSiteSettings();
  const logoUrl = settings.company_logo || "";
  const { user, signIn, loading: authLoading } = useAuth();
  const { seller, loading: sellerLoading } = useSeller();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email().safeParse(forgotEmail);
    if (!parsed.success) {
      toast({ title: "Invalid email", description: "Enter a valid email address", variant: "destructive" });
      return;
    }
    setForgotLoading(true);
    const { data, error } = await supabase.functions.invoke("auth-send-verification", {
      body: {
        email: parsed.data,
        purpose: "reset_password",
        redirect_base: window.location.origin,
      },
    });
    setForgotLoading(false);
    if (error || !data?.success) {
      toast({
        title: "Failed to send reset link",
        description: data?.error || error?.message || "Try again later",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Reset link sent", description: "Check your email (and spam folder) for the password reset link." });
    setForgotOpen(false);
    setForgotEmail("");
  };

  useEffect(() => {
    if (!authLoading && !sellerLoading && user && seller?.is_active) {
      navigate("/seller/dashboard", { replace: true });
    }
  }, [user, seller, authLoading, sellerLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "email" | "password";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setIsLoading(false);

    if (error) {
      const f = mapAuthError(error.message);
      toast({
        title: f.title,
        description: f.description,
        variant: "destructive",
      });
      return;
    }
    navigate("/seller/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/40 px-4 py-10">
      <Card className="w-full max-w-md shadow-xl border-border/60">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="flex justify-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={settings.store_name || "Pikooly"}
                className="h-10 object-contain"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="h-6 w-6 text-primary" />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Seller Portal
            </CardTitle>
            <CardDescription className="text-sm">
              Sign in to manage your district orders
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="seller@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-10 h-11 text-base ${
                    errors.email ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  disabled={isLoading}
                  required
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-xs text-destructive mt-1">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 pr-10 h-11 text-base ${
                    errors.password ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-xs text-destructive mt-1">
                  {errors.password}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="text-center pt-1 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotOpen(true);
                }}
                className="text-xs text-primary hover:underline font-medium"
              >
                Forgot Password?
              </button>
              <p className="text-xs text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/seller/signup" className="text-primary hover:underline font-medium">
                  Sign Up
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your seller email and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="seller@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="pl-10 h-11 text-base"
                  disabled={forgotLoading}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setForgotOpen(false)} disabled={forgotLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={forgotLoading}>
                {forgotLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerLogin;
