"use client";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "@/lib/router-adapter";
import SEOHead from "@/components/seo/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Copy, Loader2, ShieldCheck, ShieldAlert, ShieldX, Sparkles, Upload, X } from "lucide-react";
import { useMultiCurrency } from "@/contexts/CurrencyContext";

import bkashLogo from "@/assets/payments/bkash.png";
import nagadLogo from "@/assets/payments/nagad.png";
import upayLogo from "@/assets/payments/upay.jpg";
import rocketLogo from "@/assets/payments/rocket.png";
import bankLogo from "@/assets/payments/bank.png";
import wuLogo from "@/assets/payments/wu.png";
import moneygramLogo from "@/assets/payments/moneygram.png";
import riaLogo from "@/assets/payments/ria.jpeg";
import wiseAsset from "@/assets/payments/wise.png.asset.json";
const wiseLogo = wiseAsset.url;
import taptapLogo from "@/assets/payments/taptap.jpeg";
import remitlyLogo from "@/assets/payments/remitly.png";

interface OrderRow {
  id: string;
  order_number: string;
  total: number;
  advance_amount: number | null;
  is_preorder: boolean | null;
  notes: string | null;
  payment_method: string | null;
}

interface Service {
  key: string;
  label: string;
  enabledKey: string;
  logo: string;
  bg: string; // brand tile bg
}

const SERVICES: Service[] = [
  { key: "wu", label: "Western Union", enabledKey: "remittance_wu_enabled", logo: wuLogo.src, bg: "bg-[#FFDD00]" },
  { key: "mg", label: "MoneyGram", enabledKey: "remittance_mg_enabled", logo: moneygramLogo.src, bg: "bg-white" },
  { key: "ria", label: "Ria", enabledKey: "remittance_ria_enabled", logo: riaLogo.src, bg: "bg-white" },
  { key: "wise", label: "Wise", enabledKey: "remittance_wise_enabled", logo: wiseLogo, bg: "bg-[#9FE870]" },
  { key: "tts", label: "TapTap Send", enabledKey: "remittance_tts_enabled", logo: taptapLogo.src, bg: "bg-white" },
  { key: "remitly", label: "Remitly", enabledKey: "remittance_remitly_enabled", logo: remitlyLogo.src, bg: "bg-white" },
];

type MethodKey = "bkash" | "nagad" | "upay" | "rocket" | "bank";

interface Method {
  key: MethodKey;
  label: string;
  shortLabel: string;
  logo: string;
  tileBg: string;
  ring: string;
  type: "wallet" | "bank";
}

const METHODS: Method[] = [
  { key: "bkash", label: "bKash (Personal)", shortLabel: "bKash", logo: bkashLogo.src, tileBg: "bg-[#E2136E]", ring: "ring-[#E2136E]/40", type: "wallet" },
  { key: "nagad", label: "Nagad (Personal)", shortLabel: "Nagad", logo: nagadLogo.src, tileBg: "bg-white", ring: "ring-[#EC1C24]/40", type: "wallet" },
  { key: "upay", label: "Upay (Personal)", shortLabel: "Upay", logo: upayLogo.src, tileBg: "bg-white", ring: "ring-[#FFCB05]/50", type: "wallet" },
  { key: "rocket", label: "Rocket (Personal)", shortLabel: "Rocket", logo: rocketLogo.src, tileBg: "bg-[#F3EAF5]", ring: "ring-[#8B2C8B]/40", type: "wallet" },
  { key: "bank", label: "Bank Transfer", shortLabel: "Bank", logo: bankLogo.src, tileBg: "bg-white", ring: "ring-foreground/20", type: "bank" },
];

const isExplicitlyDisabled = (value?: string | null) =>
  ["disable", "disabled", "false", "0", "no", "off"].includes((value ?? "").toLowerCase());

const CopyRow = ({ label, value }: { label: string; value: string }) => {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-t border-border/40 first:border-t-0">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-medium">{label}</p>
        <p className="text-[15px] font-semibold text-foreground break-all leading-tight mt-0.5">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => { navigator.clipboard.writeText(value); toast.success(`${label} copied`); }}
        className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
      >
        <Copy size={14} /> Copy
      </button>
    </div>
  );
};

const RemittancePayment = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState<string>("");
  const [method, setMethod] = useState<MethodKey | "">("");
  const [mtcn, setMtcn] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // AI fraud verification
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!orderId) return;
      const [orderRes, settingsRes] = await Promise.all([
        (supabase as any).rpc("get_remittance_checkout_order", { _order_id: orderId }).maybeSingle(),
        supabase.from("site_settings").select("key, value").in("key", [
          "company_name", "company_logo",
          "remittance_wu_enabled", "remittance_mg_enabled", "remittance_ria_enabled", "remittance_wise_enabled", "remittance_tts_enabled", "remittance_remitly_enabled",
          "remittance_bkash_personal", "remittance_nagad_personal", "remittance_upay_personal", "remittance_rocket_personal",
          "remittance_bkash_name", "remittance_nagad_name", "remittance_upay_name", "remittance_rocket_name",
          "remittance_bank_name", "remittance_bank_account_name", "remittance_bank_account_number",
          "remittance_bank_routing", "remittance_bank_branch", "remittance_instructions",
        ]),
      ]);
      if (orderRes.error) console.error("Remittance order load error:", orderRes.error);
      if (orderRes.data) setOrder(orderRes.data as OrderRow);
      const map: Record<string, string> = {};
      (settingsRes.data || []).forEach((s: any) => { map[s.key] = s.value || ""; });
      setSettings(map);
      setLoading(false);
    })();
  }, [orderId]);

  const enabledServices = useMemo(
    () => SERVICES.filter((s) => !isExplicitlyDisabled(settings[s.enabledKey])),
    [settings]
  );

  useEffect(() => { setMethod(""); }, [service]);

  const availableMethods = useMemo(() => {
    return METHODS.filter((m) => {
      if (m.key === "bkash") return !!settings.remittance_bkash_personal;
      if (m.key === "nagad") return !!settings.remittance_nagad_personal;
      if (m.key === "upay") return !!settings.remittance_upay_personal;
      if (m.key === "rocket") return !!settings.remittance_rocket_personal;
      if (m.key === "bank") return !!(settings.remittance_bank_account_number || settings.remittance_bank_name);
      return false;
    });
  }, [settings]);

  const { selectedCurrency, convert } = useMultiCurrency();
  const amount = order ? Number(order.is_preorder ? (order.advance_amount || order.total) : order.total) : 0;
  const isForeign = !!selectedCurrency && !selectedCurrency.is_default;
  const convertedAmount = convert(amount);
  const fxDecimals = isForeign ? 2 : 0;
  const fxSymbol = selectedCurrency?.symbol || "৳";
  const displayAmount = `${fxSymbol}${convertedAmount.toLocaleString(undefined, { minimumFractionDigits: fxDecimals, maximumFractionDigits: fxDecimals })}`;
  const bdtAmount = `৳${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const selectedService = enabledServices.find((s) => s.key === service);
  const selectedMethod = METHODS.find((m) => m.key === method);

  const handleProofUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB."); return; }
    setUploading(true);
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinaryUpload");
      const res = await uploadToCloudinary(file, { folder: `remittance-proofs/${order?.order_number || "order"}`, resourceType: "image" });
      setProofUrl(res.url);
      toast.success("Screenshot uploaded ✓");
    } catch (e: any) {
      console.error(e);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Auto-run AI fraud verification when both screenshot + MTCN are present
  useEffect(() => {
    setVerifyResult(null);
    setVerifyError(null);
    if (!proofUrl || !mtcn.trim() || mtcn.trim().length < 4 || !selectedService || !selectedMethod) return;
    const t = setTimeout(async () => {
      setVerifying(true);
      setVerifyError(null);
      try {
        const { data, error } = await supabase.functions.invoke("verify-remittance-proof", {
          body: {
            imageUrl: proofUrl,
            mtcn: mtcn.trim(),
            service: selectedService.label,
            method: selectedMethod.label,
            amount,
            currency: "BDT",
            orderNumber: order?.order_number,
          },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setVerifyResult(data);
      } catch (e: any) {
        console.error("verify error", e);
        setVerifyError(e?.message || "AI verification failed");
      } finally {
        setVerifying(false);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [proofUrl, mtcn, selectedService?.key, selectedMethod?.key, amount, order?.order_number]);

  const handleConfirm = async () => {
    if (!order) return;
    if (!service) { toast.error("Please select a remittance service."); return; }
    if (!method) { toast.error("Please select a payment method."); return; }
    if (!mtcn.trim()) { toast.error("Please enter the MTCN / reference number."); return; }
    if (!proofUrl) { toast.error("Please upload your payment screenshot."); return; }
    if (verifying) { toast.error("Please wait — AI fraud check is running…"); return; }
    if (verifyResult?.verdict === "likely_fake") {
      toast.error("This screenshot looks fake. Please upload a genuine transfer receipt.");
      return;
    }
    setSubmitting(true);
    try {
      const aiLine = verifyResult
        ? ` | AI: ${verifyResult.verdict} (${verifyResult.confidence}%) — ${verifyResult.summary || ""}`
        : verifyError ? ` | AI: skipped (${verifyError})` : "";
      const { data, error } = await (supabase as any).rpc("submit_remittance_payment", {
        _order_id: order.id,
        _service_key: service,
        _service_label: selectedService?.label || service,
        _method_key: method,
        _method_label: selectedMethod?.label || method,
        _mtcn: mtcn.trim(),
        _proof_url: proofUrl,
        _ai_line: aiLine,
      }).maybeSingle();
      if (error) throw error;
      toast.success("Payment details submitted! We'll verify shortly. 🎉");
      navigate(`/order-success/${data?.order_number || order.order_number}`);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to submit payment details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-[45vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold mb-2">Order not found</h1>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </main>
    );
  }

  const brand = settings.company_name || "Pikooly";

  return (
    <main className="bg-gradient-to-b from-muted/40 to-background py-4 sm:py-8 px-3 sm:px-4">
      <SEOHead title={`Global Remittance Payment — ${brand}`} description="Complete your order via Global Remittance." noindex />

      <div className="max-w-xl mx-auto space-y-4">
        {/* Brand header */}
        <div className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3.5 flex items-center gap-3">
          {settings.company_logo ? (
            <img src={settings.company_logo} alt={brand} className="h-10 w-10 rounded-lg object-contain bg-muted/40" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
              {brand.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-bold text-foreground leading-tight">{brand}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Order: {order.order_number} · {displayAmount}{isForeign ? ` (≈ ${bdtAmount})` : ""}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/checkout")}
            aria-label="Cancel and return"
            className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* STEP 1: Choose remittance service */}
        {!service && (
          <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 space-y-4 shadow-sm">
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-semibold">Step 1</p>
              <h2 className="text-[17px] font-bold text-foreground mt-0.5">Choose remittance service</h2>
            </div>

            {enabledServices.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-6">
                No remittance services are enabled. Please contact support.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {enabledServices.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setService(s.key)}
                    className="group flex flex-col items-center gap-2.5 p-3 rounded-2xl border-2 border-border bg-background hover:border-primary hover:shadow-md transition-all"
                  >
                    <span className={`h-16 w-16 rounded-2xl ${s.bg} flex items-center justify-center overflow-hidden ring-1 ring-border/50 group-hover:scale-105 transition-transform`}>
                      <img src={s.logo} alt={s.label} className="h-full w-full object-contain p-1.5" loading="lazy" />
                    </span>
                    <span className="text-[13px] font-semibold text-foreground text-center leading-tight">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Pick a payment method */}
        {service && selectedService && !method && (
          <>
            <div className="rounded-2xl bg-card border border-border p-4 shadow-sm flex items-center gap-3">
              <button
                type="button"
                onClick={() => setService("")}
                className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0"
                aria-label="Back to services"
              >
                <ArrowLeft size={18} />
              </button>
              <span className={`h-11 w-11 rounded-xl ${selectedService.bg} flex items-center justify-center overflow-hidden ring-1 ring-border/50 shrink-0`}>
                <img src={selectedService.logo} alt={selectedService.label} className="h-full w-full object-contain p-1" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Sending via</p>
                <p className="text-[15px] font-bold text-foreground leading-tight">{selectedService.label}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 space-y-4 shadow-sm">
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-semibold">Step 2</p>
                <h2 className="text-[17px] font-bold text-foreground mt-0.5">Choose payment method</h2>
              </div>

              {settings.remittance_instructions && (
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                  {settings.remittance_instructions}
                </p>
              )}

              {availableMethods.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-4">
                  No receiver methods configured. Please contact support.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {availableMethods.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMethod(m.key)}
                      className="group flex flex-col items-center gap-2 p-2.5 rounded-2xl border-2 border-border bg-background hover:border-primary hover:shadow-md transition-all"
                    >
                      <span className={`h-14 w-14 rounded-2xl ${m.tileBg} flex items-center justify-center overflow-hidden ring-1 ring-border/40 group-hover:scale-105 transition-transform`}>
                        <img src={m.logo} alt={m.shortLabel} className="h-full w-full object-contain p-1" loading="lazy" />
                      </span>
                      <span className="text-[12px] font-semibold text-foreground text-center leading-tight">
                        {m.shortLabel}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* STEP 3: details + MTCN */}
        {service && selectedService && method && selectedMethod && (
          <>
            <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMethod("")}
                  className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0"
                  aria-label="Back to methods"
                >
                  <ArrowLeft size={18} />
                </button>
                <span className={`h-12 w-12 rounded-xl ${selectedMethod.tileBg} flex items-center justify-center overflow-hidden ring-1 ring-border/40 shrink-0`}>
                  <img src={selectedMethod.logo} alt={selectedMethod.shortLabel} className="h-full w-full object-contain p-1" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-foreground leading-tight">{selectedMethod.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 size={11} className="text-primary" />
                    via {selectedService.label} · {displayAmount}{isForeign ? ` (≈ ${bdtAmount})` : ""}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-muted/40 px-4 py-1">
                {method === "bkash" && (<>
                  <CopyRow label="Account Name" value={settings.remittance_bkash_name || "Md Ripon"} />
                  <CopyRow label="Number" value={settings.remittance_bkash_personal} />
                </>)}
                {method === "nagad" && (<>
                  <CopyRow label="Account Name" value={settings.remittance_nagad_name || "Md Ripon"} />
                  <CopyRow label="Number" value={settings.remittance_nagad_personal} />
                </>)}
                {method === "upay" && (<>
                  <CopyRow label="Account Name" value={settings.remittance_upay_name || "Md Ripon"} />
                  <CopyRow label="Number" value={settings.remittance_upay_personal} />
                </>)}
                {method === "rocket" && (<>
                  <CopyRow label="Account Name" value={settings.remittance_rocket_name || "Md Ripon"} />
                  <CopyRow label="Number" value={settings.remittance_rocket_personal} />
                </>)}
                {method === "bank" && (
                  <>
                    <CopyRow label="Bank" value={settings.remittance_bank_name} />
                    <CopyRow label="A/C Name" value={settings.remittance_bank_account_name} />
                    <CopyRow label="A/C Number" value={settings.remittance_bank_account_number} />
                    <CopyRow label="Routing / SWIFT" value={settings.remittance_bank_routing} />
                    <CopyRow label="Branch" value={settings.remittance_bank_branch} />
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 space-y-2 shadow-sm">
              <Label htmlFor="mtcn" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Transaction / Sender Reference (MTCN) *
              </Label>
              <Input
                id="mtcn"
                placeholder="Enter the reference number you received"
                value={mtcn}
                onChange={(e) => setMtcn(e.target.value)}
                className="h-12 text-base"
              />
              <p className="text-[11px] text-muted-foreground">
                After sending, paste the tracking/MTCN number here so we can verify your payment.
              </p>
            </div>

            <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 space-y-3 shadow-sm">
              <Label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Payment Screenshot (Proof) *
              </Label>
              {proofUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30">
                  <img src={proofUrl} alt="Payment proof" className="w-full max-h-64 object-contain" />
                  <button
                    type="button"
                    onClick={() => setProofUrl("")}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/90 backdrop-blur flex items-center justify-center text-foreground shadow-md hover:bg-background"
                    aria-label="Remove screenshot"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="proof-upload"
                  className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 hover:border-primary cursor-pointer transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="animate-spin text-primary" size={24} />
                  ) : (
                    <>
                      <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload size={20} className="text-primary" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Upload screenshot</p>
                      <p className="text-[11px] text-muted-foreground">PNG or JPG, up to 5MB</p>
                    </>
                  )}
                </label>
              )}
              <input
                id="proof-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProofUpload(f); e.target.value = ""; }}
              />
              <p className="text-[11px] text-muted-foreground">
                Share a screenshot of your successful transfer so we can verify quickly.
              </p>
            </div>

            {/* AI Fraud Verification */}
            {(verifying || verifyResult || verifyError) && (() => {
              const v = verifyResult?.verdict as "likely_real" | "suspicious" | "likely_fake" | undefined;
              const tone =
                v === "likely_real"
                  ? { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-900", text: "text-emerald-700 dark:text-emerald-300", chip: "bg-emerald-600 text-white", Icon: ShieldCheck, label: "Looks genuine" }
                  : v === "suspicious"
                  ? { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-900", text: "text-amber-800 dark:text-amber-300", chip: "bg-amber-500 text-white", Icon: ShieldAlert, label: "Needs review" }
                  : v === "likely_fake"
                  ? { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-900", text: "text-red-700 dark:text-red-300", chip: "bg-red-600 text-white", Icon: ShieldX, label: "Likely fake" }
                  : { bg: "bg-card", border: "border-border", text: "text-foreground", chip: "bg-muted text-foreground", Icon: Sparkles, label: "Analysing" };
              const Icon = tone.Icon;
              return (
                <div className={`rounded-2xl border ${tone.border} ${tone.bg} p-4 sm:p-5 shadow-sm space-y-3`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`h-9 w-9 rounded-xl ${tone.chip} flex items-center justify-center shrink-0`}>
                        {verifying ? <Loader2 className="animate-spin" size={16} /> : <Icon size={18} />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-semibold flex items-center gap-1">
                          <Sparkles size={10} /> AI Fraud Check
                        </p>
                        <p className={`text-[15px] font-bold leading-tight ${tone.text}`}>
                          {verifying ? "Analysing screenshot…" : verifyError ? "Could not verify" : tone.label}
                        </p>
                      </div>
                    </div>
                    {verifyResult && (
                      <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${tone.chip}`}>
                        {verifyResult.confidence}%
                      </span>
                    )}
                  </div>

                  {verifyError && (
                    <p className="text-xs text-muted-foreground">{verifyError}. You can still submit — our team will manually review.</p>
                  )}

                  {verifyResult && !verifying && (
                    <>
                      {verifyResult.summary && (
                        <p className="text-[13px] text-foreground/90 leading-relaxed">{verifyResult.summary}</p>
                      )}

                      {verifyResult.checks && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {[
                            ["Amount", verifyResult.checks.amount_matches],
                            ["Reference", verifyResult.checks.reference_matches],
                            ["Service", verifyResult.checks.service_matches],
                            ["Authentic UI", verifyResult.checks.looks_authentic_ui],
                          ].map(([label, val]) => (
                            <div key={label as string} className="flex items-center gap-2 text-[12px] bg-background/60 rounded-lg px-2.5 py-1.5 border border-border/60">
                              {val === true ? (
                                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                              ) : val === false ? (
                                <X size={14} className="text-red-600 shrink-0" />
                              ) : (
                                <span className="h-3.5 w-3.5 rounded-full bg-muted shrink-0" />
                              )}
                              <span className="font-medium text-foreground/80">{label as string}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {Array.isArray(verifyResult.reasons) && verifyResult.reasons.length > 0 && (
                        <ul className="text-[12px] text-foreground/80 space-y-1 pt-1">
                          {verifyResult.reasons.slice(0, 5).map((r: string, i: number) => (
                            <li key={i} className="flex gap-1.5"><span className="text-muted-foreground">•</span><span>{r}</span></li>
                          ))}
                        </ul>
                      )}

                      {v === "likely_fake" && (
                        <p className="text-[12px] font-semibold text-red-700 dark:text-red-300 pt-1">
                          ⚠ You cannot submit this screenshot. Please upload a real transfer receipt.
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })()}

            <div className="sticky bottom-3 sm:bottom-4 z-10">
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={submitting || verifying || verifyResult?.verdict === "likely_fake"}
                className="w-full h-14 rounded-2xl text-base font-bold shadow-lg"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} />
                  : verifying ? "Running AI fraud check…"
                  : verifyResult?.verdict === "likely_fake" ? "Blocked — fake screenshot"
                  : `Confirm Payment ${displayAmount}`}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground mt-2 px-4">
                Every screenshot is auto-checked by AI for tampering & matched against your reference and amount.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default RemittancePayment;
