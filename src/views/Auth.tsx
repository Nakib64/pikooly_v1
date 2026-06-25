import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router-adapter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Mail, Lock, User, Eye, EyeOff, Phone, ArrowLeft, ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";
import SEOHead from "@/components/seo/SEOHead";
import { COUNTRIES, type Country } from "@/lib/countries";
import { mapAuthError } from "@/lib/authErrors";


type AuthMethod = "email" | "phone";
type EmailMode = "login" | "signup" | "forgot";
type PhoneStep = "enter" | "verify";

const Auth = () => {
  const [method, setMethod] = useState<AuthMethod>("email");
  const [mode, setMode] = useState<EmailMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Phone OTP state
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("enter");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");


  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { settings } = useSiteSettings();

  // Resend OTP countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const googleEnabled = settings["social_google_status"] === "enable";
  const appleEnabled = settings["social_apple_status"] === "enable";
  const phoneEnabled = settings["social_phone_status"] === "enable";
  const showSocialSection = googleEnabled || appleEnabled;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { data, error } = await supabase.functions.invoke("auth-send-verification", {
          body: { email, purpose: "reset_password", redirect_base: window.location.origin },
        });
        if (error || !data?.success) {
          const f = mapAuthError(data?.error || error?.message || "Failed");
          toast.error(f.title, { description: f.description });
        } else { toast.success("Password reset link sent to your email!"); setMode("login"); }
      } else if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          const f = mapAuthError(error.message);
          toast.error(f.title, { description: f.description });
        }
        else { toast.success("Logged in successfully!"); navigate("/account"); }
      } else {
        if (!fullName.trim()) { toast.error("Please enter your full name"); setLoading(false); return; }
        const { data, error } = await supabase.functions.invoke("auth-custom-signup", {
          body: { email, password, name: fullName, role: "customer", redirect_base: window.location.origin },
        });
        if (error || !data?.success) {
          const f = mapAuthError(data?.error || error?.message || "Signup failed");
          toast.error(f.title, { description: f.description });
        }
        else toast.success("Check your email to verify your account!");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/auth/callback" },
      });
      if (error) toast.error("Google login failed");
    } finally { setLoading(false); }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: window.location.origin + "/auth/callback" },
      });
      if (error) toast.error("Apple login failed");
    } finally { setLoading(false); }
  };

  const normalizePhone = (raw: string) => {
    const trimmed = raw.trim().replace(/[\s\-()]/g, "");
    if (trimmed.startsWith("+")) return trimmed;
    const digits = trimmed.replace(/\D/g, "").replace(/^0+/, "");
    return "+" + country.dial + digits;
  };



  const handlePhoneSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneE164 = normalizePhone(phone);
    if (!/^\+\d{8,15}$/.test(phoneE164)) {
      toast.error("Please enter a valid phone number with country code");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-phone-otp", {
        body: { phone: phoneE164, purpose: "login" },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || "Failed to send OTP");
      } else {
        toast.success("OTP sent to your phone");
        setPhone(data.phone || phoneE164);
        setPhoneStep("verify");
        setResendTimer(60);
      }
    } finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || !phone) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-phone-otp", {
        body: { phone, purpose: "login" },
      });
      if (error || !data?.success) toast.error(data?.error || error?.message || "Failed");
      else { toast.success("OTP resent!"); setResendTimer(60); }
    } finally { setLoading(false); }
  };

  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-phone-otp", {
        body: { phone, code: otp, purpose: "login" },
      });
      if (error || !data?.success || !data?.session) {
        toast.error(data?.error || error?.message || "Verification failed");
      } else {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        toast.success("Signed in successfully!");
        navigate("/account");
      }
    } finally { setLoading(false); }
  };


  const title =
    method === "phone"
      ? phoneStep === "verify" ? "Verify Phone" : "Sign in with Phone"
      : mode === "forgot" ? "Reset Password" : mode === "login" ? "Welcome Back" : "Create Account";
  const subtitle =
    method === "phone"
      ? phoneStep === "verify" ? `Enter the 6-digit code sent to ${phone}` : "We'll send you a one-time code via SMS"
      : mode === "forgot" ? "Enter your email to receive a reset link" : mode === "login" ? "Sign in to your account" : "Join us today";

  return (
    <main className="min-h-[50vh] flex items-center justify-center px-4 py-10 pb-6 md:pb-10 bg-gradient-to-b from-muted/40 via-background to-background">
      <SEOHead title="Sign In or Sign Up — Pikooly" description="Sign in or create your Pikooly account to track orders, save favorites and check out faster." noindex />
      <div className="w-full max-w-md">
        <div className="bg-card border border-border/60 rounded-3xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.12)] p-7 sm:p-9">
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              {method === "phone" ? <Phone className="text-primary" size={24} /> : <Mail className="text-primary" size={24} />}
            </div>
            <h1 className="text-[22px] font-display font-semibold text-foreground tracking-tight">{title}</h1>
            <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">{subtitle}</p>
          </div>

        {/* Method toggle: Email / Phone */}
        {phoneEnabled && mode !== "forgot" && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/70 rounded-full mb-6">
            <button
              type="button"
              onClick={() => { setMethod("email"); setPhoneStep("enter"); setOtp(""); }}
              className={`py-2.5 rounded-full text-[13px] font-medium transition-all ${method === "email" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Mail className="inline-block mr-1.5 -mt-0.5" size={14} /> Email
            </button>
            <button
              type="button"
              onClick={() => setMethod("phone")}
              className={`py-2.5 rounded-full text-[13px] font-medium transition-all ${method === "phone" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Phone className="inline-block mr-1.5 -mt-0.5" size={14} /> Phone
            </button>
          </div>
        )}

        {/* PHONE FLOW */}
        {method === "phone" ? (
          phoneStep === "enter" ? (
            <form onSubmit={handlePhoneSend} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5 ml-1">Phone number</label>
                <div className="flex items-stretch rounded-2xl border border-border bg-muted/40 focus-within:border-primary focus-within:bg-background focus-within:ring-4 focus-within:ring-primary/10 transition-all overflow-visible relative">
                  <button
                    type="button"
                    onClick={() => setCountryOpen((v) => !v)}
                    className="flex items-center gap-1.5 pl-3.5 pr-2.5 border-r border-border/70 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors rounded-l-2xl"
                  >
                    <span className="text-base leading-none">{country.flag}</span>
                    <span>+{country.dial}</span>
                    <ChevronDown size={14} className="text-muted-foreground" />
                  </button>
                  <input
                    id="auth-phone-input"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                    aria-label="Phone number"
                    className="flex-1 bg-transparent px-3 py-3.5 text-base outline-none placeholder:text-muted-foreground/60 min-w-0"
                    required
                    autoFocus
                  />

                  {countryOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => { setCountryOpen(false); setCountrySearch(""); }} />
                      <div className="absolute z-50 top-[calc(100%+6px)] left-0 w-72 max-w-[90vw] bg-popover border border-border rounded-2xl shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-border bg-muted/30">
                          <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                              autoFocus
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                              placeholder="Search country..."
                              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-background border border-border outline-none focus:border-primary"
                            />
                          </div>
                        </div>
                        <ul className="max-h-64 overflow-y-auto py-1">
                          {COUNTRIES.filter((c) => {
                            const q = countrySearch.toLowerCase();
                            return !q || c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.iso.toLowerCase().includes(q);
                          }).map((c) => (
                            <li key={c.iso}>
                              <button
                                type="button"
                                onClick={() => { setCountry(c); setCountryOpen(false); setCountrySearch(""); }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 text-left ${country.iso === c.iso ? "bg-primary/5 text-primary font-medium" : "text-foreground"}`}
                              >
                                <span className="text-base">{c.flag}</span>
                                <span className="flex-1 truncate">{c.name}</span>
                                <span className="text-muted-foreground text-xs">+{c.dial}</span>
                              </button>
                            </li>
                          ))}
                          {COUNTRIES.filter((c) => {
                            const q = countrySearch.toLowerCase();
                            return !q || c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.iso.toLowerCase().includes(q);
                          }).length === 0 && (
                            <li className="px-3 py-4 text-center text-xs text-muted-foreground">No countries found</li>
                          )}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 ml-1">We'll text a 6-digit code. Standard SMS rates may apply.</p>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60 shadow-sm shadow-primary/25">
                {loading ? "Sending code..." : "Send verification code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePhoneVerify} className="space-y-5">
              <div>
                <label htmlFor="auth-otp-input" className="block text-xs font-medium text-foreground/80 mb-3 text-center">Enter the 6-digit code</label>
                <input
                  id="auth-otp-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  aria-label="6 digit verification code"
                  className="w-full text-center text-3xl font-semibold tracking-[0.6em] py-4 rounded-2xl bg-muted/40 border border-border focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                  autoFocus
                  required
                />
              </div>
              <button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 shadow-sm shadow-primary/25">
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => { setPhoneStep("enter"); setOtp(""); setResendTimer(0); }}
                  className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft size={14} /> Change number
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || resendTimer > 0}
                  className="text-[13px] text-primary font-semibold hover:underline disabled:text-muted-foreground disabled:no-underline disabled:font-medium"
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
                </button>
              </div>
            </form>
          )

        ) : (
          <>
            {mode !== "forgot" && showSocialSection && (
              <>
                {googleEnabled && (
                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 border border-border rounded-xl py-3 px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                )}

                {appleEnabled && (
                  <button
                    onClick={handleAppleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 border border-border rounded-xl py-3 px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 mt-3"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    Continue with Apple
                  </button>
                )}

                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border focus:border-primary outline-none text-base" required />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted border border-border focus:border-primary outline-none text-base" required />
              </div>

              {mode !== "forgot" && (
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full pl-11 pr-11 py-3 rounded-xl bg-muted border border-border focus:border-primary outline-none text-base" required minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}

              {mode === "login" && (
                <div className="text-right">
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                    Forgot Password?
                  </button>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? "Please wait..." : mode === "forgot" ? "Send Reset Link" : mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {mode === "forgot" ? (
                <>
                  <button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">Back to Sign In</button>
                  <span className="mx-2">·</span>
                  <button onClick={() => navigate("/reset-password-phone")} className="text-primary font-semibold hover:underline">Reset via Phone</button>
                </>
              ) : mode === "login" ? (
                <>Don't have an account?{" "}<button onClick={() => setMode("signup")} className="text-primary font-semibold hover:underline">Sign Up</button></>
              ) : (
                <>Already have an account?{" "}<button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">Sign In</button></>
              )}
            </p>
          </>
        )}
        </div>
      </div>
    </main>

  );
};

export default Auth;
