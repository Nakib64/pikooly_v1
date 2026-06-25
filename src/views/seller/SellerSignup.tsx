import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/router-adapter";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import {
  Lock, Mail, Store, User, Phone, Eye, EyeOff, Loader2, Check, X, MailCheck, ArrowRight,
  MapPin, FileText, Tag, Info,
} from "lucide-react";

type Step = "form" | "check_email";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().regex(/^(\+?\d{10,15})$/, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  district_id: z.string().uuid("Please select your area / district"),
  category_ids: z.array(z.string().uuid()).min(1, "Select at least one category"),
  subcategory_ids: z.array(z.string().uuid()).optional(),
  trade_license: z.string().trim().max(50, "Trade license is too long").optional().or(z.literal("")),
});

const evaluateStrength = (pw: string) => {
  const checks = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length;
  let label = "Very Weak", color = "bg-destructive";
  if (score >= 5) { label = "Strong"; color = "bg-green-500"; }
  else if (score === 4) { label = "Good"; color = "bg-green-400"; }
  else if (score === 3) { label = "Fair"; color = "bg-yellow-500"; }
  else if (score === 2) { label = "Weak"; color = "bg-orange-500"; }
  return { checks, score, label, color };
};

type District = { id: string; name: string };
type Category = { id: string; name: string };
type Subcategory = { id: string; name: string; category_id: string };

const SellerSignup = () => {
  const { settings } = useSiteSettings();
  const logoUrl = settings.company_logo || "";
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "",
    district_id: "", trade_license: "",
  });
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [subcategoryIds, setSubcategoryIds] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const strength = useMemo(() => evaluateStrength(form.password), [form.password]);

  // Reference data
  const [districts, setDistricts] = useState<District[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // Resend cooldown
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);


  useEffect(() => {
    (async () => {
      const [dRes, cRes, sRes] = await Promise.all([
        supabase.from("shipping_districts").select("id,name").eq("is_active", true).order("name"),
        supabase.from("categories").select("id,name").eq("is_active", true).order("name"),
        supabase.from("subcategories").select("id,name,category_id").eq("is_active", true).order("name"),
      ]);
      if (dRes.data) setDistricts(dRes.data as District[]);
      if (cRes.data) setCategories(cRes.data as Category[]);
      if (sRes.data) setSubcategories(sRes.data as Subcategory[]);
    })();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: "" }));
  };

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      // Prune subcategories whose parent category is no longer selected
      setSubcategoryIds((subs) => subs.filter((sid) => {
        const sub = subcategories.find((s) => s.id === sid);
        return sub ? next.includes(sub.category_id) : false;
      }));
      return next;
    });
    if (errors.category_ids) setErrors((p) => ({ ...p, category_ids: "" }));
  };

  const toggleSubcategory = (id: string) => {
    setSubcategoryIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const visibleSubcategories = useMemo(
    () => subcategories.filter((s) => categoryIds.includes(s.category_id)),
    [subcategories, categoryIds]
  );

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = signupSchema.safeParse({
      ...form,
      category_ids: categoryIds,
      subcategory_ids: subcategoryIds,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as string;
        if (!errs[k]) errs[k] = i.message;
      });
      setErrors(errs);
      return;
    }
    if (strength.score < 3) {
      setErrors({ password: "Password is too weak. Include uppercase, numbers, or symbols." });
      return;
    }

    setLoading(true);
    try {
      const { data: phoneTaken } = await supabase
        .from("sellers")
        .select("id")
        .eq("phone", parsed.data.phone)
        .maybeSingle();
      if (phoneTaken) {
        setErrors({ phone: "This phone number is already registered. Please sign in instead." });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("auth-custom-signup", {
        body: {
          email: parsed.data.email,
          password: parsed.data.password,
          name: parsed.data.name,
          phone: parsed.data.phone,
          role: "seller",
          redirect_base: window.location.origin,
          seller_details: {
            district_id: form.district_id,
            category_ids: categoryIds,
            subcategory_ids: subcategoryIds,
            trade_license: form.trade_license || null,
          },
        },
      });

      // Extract real error body from non-2xx responses (supabase-js wraps them)
      let serverError = data?.error as string | undefined;
      if (error && !serverError) {
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            serverError = body?.error;
          } else if (ctx && typeof ctx.text === "function") {
            const t = await ctx.text();
            try { serverError = JSON.parse(t)?.error; } catch { serverError = t; }
          }
        } catch {}
      }

      if (error || !data?.success) {
        const msg = (serverError || error?.message || "").toLowerCase();
        if (msg.includes("already")) {
          setErrors({ email: "An account with this email already exists. Please sign in instead." });
        } else if (msg.includes("password")) {
          setErrors({ password: serverError || error?.message || "Invalid password" });
        } else if (msg.includes("smtp") || msg.includes("email settings") || msg.includes("email not configured")) {
          toast({ title: "Email not configured", description: "Admin must configure SMTP in Email Settings before signups work.", variant: "destructive" });
        } else {
          toast({ title: "Signup failed", description: serverError || error?.message || "Something went wrong", variant: "destructive" });
        }
        return;
      }

      // Stash pending seller details so we can create the record after the user
      // clicks the email confirmation link and lands on /seller/dashboard.
      try {
        localStorage.setItem(
          "pending_seller_signup",
          JSON.stringify({
            email: parsed.data.email,
            district_id: form.district_id,
            category_ids: categoryIds,
            subcategory_ids: subcategoryIds,
            trade_license: form.trade_license || null,
          })
        );
      } catch {}

      setStep("check_email");
      setCooldown(45);
      toast({
        title: "Check your email",
        description: `We sent a confirmation link to ${parsed.data.email}. Click it to activate your account.`,
      });
    } catch (err: any) {
      toast({ title: "Signup failed", description: err?.message || "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke("auth-send-verification", {
        body: { email: form.email, purpose: "seller_verify", name: form.name, redirect_base: window.location.origin },
      });
      if (error || !data?.success) {
        toast({ title: "Couldn't resend", description: data?.error || error?.message || "Error", variant: "destructive" });
        return;
      }
      toast({ title: "Email resent", description: "Check your inbox for the confirmation link." });
      setCooldown(45);
    } finally {
      setResending(false);
    }
  };

  // ---------- CHECK EMAIL STEP ----------
  if (step === "check_email") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/40 px-4 py-10">
        <Card className="w-full max-w-md shadow-xl border-border/60">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <MailCheck className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl font-semibold">Check your email</CardTitle>
            <CardDescription className="text-sm">
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{form.email}</span>. Click the link in
              that email to verify your account — you'll be taken to your seller dashboard automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/40 p-4 space-y-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Next steps</p>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Open your inbox (and check the spam folder).</li>
                <li>Click the "Confirm your email" link.</li>
                <li>You'll land on your seller dashboard. An admin will review and activate your account.</li>
              </ol>
            </div>

            <div className="text-center text-xs text-muted-foreground space-y-2">
              <p>
                Didn't receive the email?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending}
                  className="text-primary hover:underline font-medium disabled:opacity-50 disabled:no-underline"
                >
                  {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
                </button>
              </p>
              <button
                type="button"
                onClick={() => setStep("form")}
                className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                Use a different email
              </button>
            </div>

            <Button variant="outline" className="w-full h-11" onClick={() => navigate("/seller/login")}>
              Go to Login
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Need help?{" "}
              <Link to="/contact-us" className="text-primary hover:underline">Contact support</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }


  // ---------- FORM STEP ----------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/40 px-4 py-10">
      <Card className="w-full max-w-lg shadow-xl border-border/60">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="flex justify-center">
            {logoUrl ? (
              <img src={logoUrl} alt={settings.store_name || "Pikooly"} className="h-10 object-contain" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="h-6 w-6 text-primary" />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-semibold tracking-tight">Become a Seller</CardTitle>
            <CardDescription className="text-sm">
              Create your seller account. Orders matching your area & categories will be routed to you.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="mb-4 flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/80">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p>
              You will only receive orders from the <strong>area (district)</strong> and{" "}
              <strong>product categories</strong> you select below. Admin will approve your account after review.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Business Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name" value={form.name} onChange={setField("name")} placeholder="Your business / shop name"
                  className={`pl-10 h-11 text-base ${errors.name ? "border-destructive" : ""}`}
                  disabled={loading} required
                />
              </div>
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Business Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email" type="email" inputMode="email" autoComplete="email"
                  value={form.email} onChange={setField("email")} placeholder="business@example.com"
                  className={`pl-10 h-11 text-base ${errors.email ? "border-destructive" : ""}`}
                  disabled={loading} required
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email}{" "}
                  {errors.email.toLowerCase().includes("already") && (
                    <Link to="/seller/login" className="underline font-medium">Go to login →</Link>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone" type="tel" inputMode="tel" autoComplete="tel"
                  value={form.phone} onChange={setField("phone")} placeholder="01XXXXXXXXX"
                  className={`pl-10 h-11 text-base ${errors.phone ? "border-destructive" : ""}`}
                  disabled={loading} required
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-destructive">
                  {errors.phone}{" "}
                  {errors.phone.toLowerCase().includes("already") && (
                    <Link to="/seller/login" className="underline font-medium">Go to login →</Link>
                  )}
                </p>
              )}
            </div>

            {/* District */}
            <div className="space-y-1.5">
              <Label htmlFor="district" className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Your Area / District
              </Label>
              <Select
                value={form.district_id || undefined}
                onValueChange={(v) => {
                  setForm((p) => ({ ...p, district_id: v }));
                  if (errors.district_id) setErrors((p) => ({ ...p, district_id: "" }));
                }}
                disabled={loading || districts.length === 0}
              >
                <SelectTrigger
                  id="district"
                  className={`h-11 text-base ${errors.district_id ? "border-destructive" : ""}`}
                >
                  <SelectValue placeholder={districts.length === 0 ? "Loading districts…" : "Select your district"} />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.district_id && <p className="text-xs text-destructive">{errors.district_id}</p>}
            </div>

            {/* Categories */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Categories you can fulfil
              </Label>
              <div
                className={`max-h-44 overflow-y-auto rounded-md border p-3 grid grid-cols-2 gap-2 ${
                  errors.category_ids ? "border-destructive" : "border-border"
                }`}
              >
                {categories.length === 0 ? (
                  <p className="text-xs text-muted-foreground col-span-2">Loading categories…</p>
                ) : (
                  categories.map((c) => {
                    const checked = categoryIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-sm cursor-pointer select-none rounded px-1.5 py-1 hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleCategory(c.id)}
                          disabled={loading}
                        />
                        <span className="truncate">{c.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pick at least one. You'll only get orders for these categories.
              </p>
              {errors.category_ids && <p className="text-xs text-destructive">{errors.category_ids}</p>}
            </div>

            {/* Subcategories (filtered by selected categories) */}
            {visibleSubcategories.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Subcategories you handle
                  <span className="text-[11px] font-normal text-muted-foreground">(optional)</span>
                </Label>
                <div className="max-h-44 overflow-y-auto rounded-md border border-border p-3 grid grid-cols-2 gap-2">
                  {visibleSubcategories.map((s) => {
                    const checked = subcategoryIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 text-sm cursor-pointer select-none rounded px-1.5 py-1 hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSubcategory(s.id)}
                          disabled={loading}
                        />
                        <span className="truncate">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Narrow your focus — orders matching these subcategories will prefer you.
                </p>
              </div>
            )}

            {/* Trade license */}
            <div className="space-y-1.5">
              <Label htmlFor="trade_license" className="text-sm font-medium flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Business Trade License Number
                <span className="text-[11px] font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="trade_license"
                value={form.trade_license}
                onChange={setField("trade_license")}
                placeholder="e.g. TRAD/DSCC/123456/2025"
                className={`h-11 text-base ${errors.trade_license ? "border-destructive" : ""}`}
                disabled={loading}
                maxLength={50}
              />
              {errors.trade_license && <p className="text-xs text-destructive">{errors.trade_license}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password" type={showPassword ? "text" : "password"} autoComplete="new-password"
                  value={form.password} onChange={setField("password")} placeholder="At least 8 characters"
                  className={`pl-10 pr-10 h-11 text-base ${errors.password ? "border-destructive" : ""}`}
                  disabled={loading} required
                />
                <button
                  type="button" onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1} aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {form.password.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${(strength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right">{strength.label}</span>
                  </div>
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                    {[
                      { ok: strength.checks.length, label: "8+ characters" },
                      { ok: strength.checks.upper, label: "Uppercase" },
                      { ok: strength.checks.lower, label: "Lowercase" },
                      { ok: strength.checks.number, label: "Number" },
                      { ok: strength.checks.special, label: "Symbol" },
                    ].map((c) => (
                      <li key={c.label} className={`flex items-center gap-1 ${c.ok ? "text-green-600" : "text-muted-foreground"}`}>
                        {c.ok ? <Check size={11} /> : <X size={11} />}
                        {c.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account…</>
              ) : (
                "Create Seller Account"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground pt-1">
              Already have an account?{" "}
              <Link to="/seller/login" className="text-primary hover:underline font-medium">Sign In</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerSignup;
