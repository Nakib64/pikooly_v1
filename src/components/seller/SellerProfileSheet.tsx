import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { SellerRecord } from "@/hooks/useSeller";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import {
  Loader2, Mail, Phone, MapPin, User, KeyRound, Save, Camera, X,
  Check, AlertCircle, Eye, EyeOff, Clock, Wallet, Landmark, Smartphone,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { z } from "zod";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seller: SellerRecord;
  districtName: string;
  onUpdated?: () => void;
}

const nameSchema = z
  .string()
  .trim()
  .min(2, "Business name must be at least 2 characters")
  .max(80, "Business name must be less than 80 characters")
  .regex(/^[\p{L}\p{M}0-9.,'&\-\s]+$/u, "Business name contains invalid characters");

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Phone is too short")
  .max(20, "Phone is too long")
  .regex(/^[+\d][\d\s\-()]{6,}$/, "Enter a valid phone number");

// bKash: 11 digits starting with 01
const bkashSchema = z
  .string()
  .trim()
  .regex(/^01[3-9]\d{8}$/, "Enter a valid 11-digit bKash number (e.g. 01XXXXXXXXX)");

const bankNameSchema = z.string().trim().min(2, "Bank name is required").max(80);
const bankAccNameSchema = z
  .string()
  .trim()
  .min(2, "Account holder name is required")
  .max(80)
  .regex(/^[\p{L}\p{M}.'\-\s]+$/u, "Only letters, spaces, . ' -");
const bankAccNumSchema = z
  .string()
  .trim()
  .regex(/^\d{6,20}$/, "Account number must be 6-20 digits");
const bankBranchSchema = z.string().trim().max(80).optional().or(z.literal(""));
const bankRoutingSchema = z
  .string()
  .trim()
  .regex(/^\d{6,12}$/, "Routing must be 6-12 digits")
  .optional()
  .or(z.literal(""));

// Format helpers
const formatBkash = (v: string) => v.replace(/\D/g, "").slice(0, 11);
const formatDigits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);

function scorePassword(pw: string) {
  let score = 0;
  const checks = {
    length: pw.length >= 8,
    longer: pw.length >= 12,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    number: /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
  if (checks.length) score++;
  if (checks.longer) score++;
  if (checks.lower && checks.upper) score++;
  if (checks.number) score++;
  if (checks.special) score++;
  // score: 0-5
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong", "Very strong"];
  const colors = ["bg-red-500", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500", "bg-emerald-600"];
  return { score, label: labels[score], color: colors[score], checks };
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB

export const SellerProfileSheet = ({ open, onOpenChange, seller, districtName, onUpdated }: Props) => {
  const { user } = useAuth();

  const [name, setName] = useState(seller.name);
  const [phone, setPhone] = useState(seller.phone);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(seller.avatar_url ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Activity timestamps (local state to reflect immediately after save)
  const [nameUpdatedAt, setNameUpdatedAt] = useState<string | null>(seller.name_updated_at ?? null);
  const [phoneUpdatedAt, setPhoneUpdatedAt] = useState<string | null>(seller.phone_updated_at ?? null);
  const [passwordChangedAt, setPasswordChangedAt] = useState<string | null>(seller.password_changed_at ?? null);
  const [avatarUpdatedAt, setAvatarUpdatedAt] = useState<string | null>(seller.avatar_updated_at ?? null);

  // Payout details
  const [payoutMethod, setPayoutMethod] = useState<string>(seller.payout_method ?? "");
  const [bkashNumber, setBkashNumber] = useState(seller.bkash_number ?? "");
  const [bankName, setBankName] = useState(seller.bank_name ?? "");
  const [bankAccName, setBankAccName] = useState(seller.bank_account_name ?? "");
  const [bankAccNum, setBankAccNum] = useState(seller.bank_account_number ?? "");
  const [bankBranch, setBankBranch] = useState(seller.bank_branch ?? "");
  const [bankRouting, setBankRouting] = useState(seller.bank_routing_number ?? "");
  const [payoutUpdatedAt, setPayoutUpdatedAt] = useState<string | null>(seller.payout_updated_at ?? null);
  const [payoutSaving, setPayoutSaving] = useState(false);


  useEffect(() => {
    if (open) {
      setName(seller.name);
      setPhone(seller.phone);
      setNameError(null);
      setPhoneError(null);
      setNewPassword("");
      setConfirmPassword("");
      setShowPw(false);
      setShowPw2(false);
      setAvatarUrl(seller.avatar_url ?? null);
      setNameUpdatedAt(seller.name_updated_at ?? null);
      setPhoneUpdatedAt(seller.phone_updated_at ?? null);
      setPasswordChangedAt(seller.password_changed_at ?? null);
      setAvatarUpdatedAt(seller.avatar_updated_at ?? null);
      setPayoutMethod(seller.payout_method ?? "");
      setBkashNumber(seller.bkash_number ?? "");
      setBankName(seller.bank_name ?? "");
      setBankAccName(seller.bank_account_name ?? "");
      setBankAccNum(seller.bank_account_number ?? "");
      setBankBranch(seller.bank_branch ?? "");
      setBankRouting(seller.bank_routing_number ?? "");
      setPayoutUpdatedAt(seller.payout_updated_at ?? null);
    }
  }, [open, seller]);

  // Live validation
  useEffect(() => {
    if (name === seller.name) { setNameError(null); return; }
    const r = nameSchema.safeParse(name);
    setNameError(r.success ? null : r.error.issues[0].message);
  }, [name, seller.name]);

  useEffect(() => {
    if (phone === seller.phone) { setPhoneError(null); return; }
    const r = phoneSchema.safeParse(phone);
    setPhoneError(r.success ? null : r.error.issues[0].message);
  }, [phone, seller.phone]);

  const initials = (seller.name || seller.email || "S")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const nameDirty = name.trim() !== seller.name;
  const phoneDirty = phone.trim() !== seller.phone;
  const profileDirty = nameDirty || phoneDirty;
  const canSaveProfile = profileDirty && !nameError && !phoneError;

  const pwStrength = useMemo(() => scorePassword(newPassword), [newPassword]);
  const pwTooWeak = newPassword.length > 0 && pwStrength.score < 3;
  const pwMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmitPw =
    newPassword.length >= 8 &&
    !pwTooWeak &&
    confirmPassword === newPassword &&
    !pwSaving;

  const saveProfile = async () => {
    const nameRes = nameSchema.safeParse(name);
    const phoneRes = phoneSchema.safeParse(phone);
    if (!nameRes.success) { setNameError(nameRes.error.issues[0].message); return; }
    if (!phoneRes.success) { setPhoneError(phoneRes.error.issues[0].message); return; }

    setSaving(true);
    const now = new Date().toISOString();
    const patch: Record<string, any> = {};
    if (nameDirty) { patch.name = nameRes.data; patch.name_updated_at = now; }
    if (phoneDirty) { patch.phone = phoneRes.data; patch.phone_updated_at = now; }

    const { error } = await supabase.from("sellers").update(patch).eq("id", seller.id);
    setSaving(false);
    if (error) return toast.error("Failed to update: " + error.message);

    if (nameDirty) setNameUpdatedAt(now);
    if (phoneDirty) setPhoneUpdatedAt(now);
    onUpdated?.();
    toast.success("Profile updated");
  };

  const changePassword = async () => {
    if (newPassword.length < 8) return toast.error("Password must be at least 8 characters");
    if (pwStrength.score < 3) return toast.error("Please choose a stronger password");
    if (newPassword !== confirmPassword) return toast.error("Passwords don't match");

    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwSaving(false);
      return toast.error("Failed: " + error.message);
    }
    const now = new Date().toISOString();
    await supabase.from("sellers").update({ password_changed_at: now }).eq("id", seller.id);
    setPwSaving(false);
    setPasswordChangedAt(now);
    setNewPassword("");
    setConfirmPassword("");
    onUpdated?.();
    toast.success("Password updated");
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > MAX_AVATAR_BYTES) return toast.error("Image must be 2MB or smaller");

    setAvatarUploading(true);
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinaryUpload");
      const res = await uploadToCloudinary(file, { folder: `sellers/${user.id}`, resourceType: "image" });
      const url = res.url;
      const now = new Date().toISOString();
      const { error: dbErr } = await supabase
        .from("sellers")
        .update({ avatar_url: url, avatar_updated_at: now })
        .eq("id", seller.id);
      if (dbErr) throw dbErr;

      setAvatarUrl(url);
      setAvatarUpdatedAt(now);
      onUpdated?.();
      toast.success("Avatar updated");
    } catch (e: any) {
      toast.error("Upload failed: " + (e.message || "unknown error"));
    } finally {
      setAvatarUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAvatar = async () => {
    setAvatarUploading(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("sellers")
      .update({ avatar_url: null, avatar_updated_at: now })
      .eq("id", seller.id);
    setAvatarUploading(false);
    if (error) return toast.error("Failed to remove: " + error.message);
    setAvatarUrl(null);
    setAvatarUpdatedAt(now);
    onUpdated?.();
    toast.success("Avatar removed");
  };

  const savePayout = async () => {
    if (!payoutMethod) return toast.error("Please select a payout method");

    if (payoutMethod === "bkash") {
      const r = bkashSchema.safeParse(bkashNumber);
      if (!r.success) return toast.error(r.error.issues[0].message);
    }

    if (payoutMethod === "bank") {
      const checks: Array<[string, z.SafeParseReturnType<any, any>]> = [
        ["Bank name", bankNameSchema.safeParse(bankName)],
        ["Account holder name", bankAccNameSchema.safeParse(bankAccName)],
        ["Account number", bankAccNumSchema.safeParse(bankAccNum)],
        ["Branch", bankBranchSchema.safeParse(bankBranch)],
        ["Routing", bankRoutingSchema.safeParse(bankRouting)],
      ];
      for (const [, r] of checks) {
        if (!r.success) return toast.error(r.error.issues[0].message);
      }
    }

    setPayoutSaving(true);
    const now = new Date().toISOString();
    const patch: Record<string, any> = {
      payout_method: payoutMethod,
      bkash_number: payoutMethod === "bkash" ? bkashNumber.trim() : null,
      bank_name: payoutMethod === "bank" ? bankName.trim() : null,
      bank_account_name: payoutMethod === "bank" ? bankAccName.trim() : null,
      bank_account_number: payoutMethod === "bank" ? bankAccNum.trim() : null,
      bank_branch: payoutMethod === "bank" ? (bankBranch.trim() || null) : null,
      bank_routing_number: payoutMethod === "bank" ? (bankRouting.trim() || null) : null,
      payout_updated_at: now,
    };
    const { error } = await supabase.from("sellers").update(patch).eq("id", seller.id);
    setPayoutSaving(false);
    if (error) return toast.error("Failed to save: " + error.message);
    setPayoutUpdatedAt(now);
    await loadPayoutHistory();
    onUpdated?.();
    toast.success("Payout details saved");
  };

  // Payout method change history
  const [payoutHistory, setPayoutHistory] = useState<Array<{
    id: string; method: string; details: any; changed_at: string;
  }>>([]);

  const loadPayoutHistory = async () => {
    const { data } = await supabase
      .from("seller_payout_method_history")
      .select("id, method, details, changed_at")
      .eq("seller_id", seller.id)
      .order("changed_at", { ascending: false })
      .limit(20);
    setPayoutHistory((data as any) || []);
  };

  useEffect(() => {
    if (open) loadPayoutHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seller.id]);



  const fmtAgo = (iso: string | null) =>
    iso ? `${formatDistanceToNow(new Date(iso), { addSuffix: true })} · ${format(new Date(iso), "MMM d, yyyy h:mm a")}` : "Never";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>My Profile</SheetTitle>
          <SheetDescription>Manage your seller account details.</SheetDescription>
        </SheetHeader>

        {/* Avatar */}
        <div className="mt-5 flex items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-lg overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={seller.name} className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
              title="Change avatar"
            >
              {avatarUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAvatar(f);
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">{seller.name}</div>
            <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Mail className="h-3 w-3" /> {seller.email}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant={seller.is_active ? "default" : "secondary"} className="text-[10px] h-5">
                {seller.is_active ? "Active" : "Inactive"}
              </Badge>
              {districtName && (
                <Badge variant="outline" className="text-[10px] h-5 gap-1">
                  <MapPin className="h-2.5 w-2.5" /> {districtName}
                </Badge>
              )}
              {avatarUrl && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  disabled={avatarUploading}
                  className="text-[10px] text-muted-foreground hover:text-destructive inline-flex items-center gap-0.5"
                >
                  <X className="h-2.5 w-2.5" /> Remove
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">JPG, PNG, WebP · max 2MB</p>
          </div>
        </div>

        <Separator className="my-5" />

        {/* Personal details */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-1.5"><User className="h-4 w-4" /> Business details</h4>

          <div className="space-y-1.5">
            <Label htmlFor="seller-name" className="text-xs">Business name</Label>
            <Input
              id="seller-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!nameError}
              className={cn("h-10 text-base md:text-sm", nameError && "border-destructive focus-visible:ring-destructive")}
            />
            {nameError && (
              <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {nameError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seller-phone" className="text-xs">Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="seller-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={!!phoneError}
                inputMode="tel"
                className={cn("h-10 pl-9 text-base md:text-sm", phoneError && "border-destructive focus-visible:ring-destructive")}
              />
            </div>
            {phoneError && (
              <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {phoneError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Business email</Label>
            <Input value={seller.email} disabled className="h-10 text-base md:text-sm bg-muted/50" />
            <p className="text-[11px] text-muted-foreground">Business email can't be changed. Contact admin if needed.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Assigned district</Label>
            <Input value={districtName || "—"} disabled className="h-10 text-base md:text-sm bg-muted/50" />
          </div>

          <Button onClick={saveProfile} disabled={!canSaveProfile || saving} className="w-full h-10">
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save changes
          </Button>
        </div>

        <Separator className="my-6" />

        {/* Change password */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-1.5"><KeyRound className="h-4 w-4" /> Change password</h4>

          <div className="space-y-1.5">
            <Label htmlFor="seller-pw" className="text-xs">New password</Label>
            <div className="relative">
              <Input
                id="seller-pw"
                type={showPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                aria-invalid={pwTooWeak}
                className={cn("h-10 pr-10 text-base md:text-sm", pwTooWeak && "border-destructive focus-visible:ring-destructive")}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {newPassword.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn("h-full transition-all", pwStrength.color)}
                      style={{ width: `${(pwStrength.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-[11px] font-medium tabular-nums",
                    pwStrength.score >= 4 ? "text-emerald-600" : pwStrength.score >= 3 ? "text-yellow-600" : "text-destructive"
                  )}>
                    {pwStrength.label}
                  </span>
                </div>
                <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px] text-muted-foreground">
                  <PwCheck ok={pwStrength.checks.length} text="8+ characters" />
                  <PwCheck ok={pwStrength.checks.longer} text="12+ characters" />
                  <PwCheck ok={pwStrength.checks.upper && pwStrength.checks.lower} text="Upper & lower" />
                  <PwCheck ok={pwStrength.checks.number} text="Number" />
                  <PwCheck ok={pwStrength.checks.special} text="Symbol" />
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seller-pw2" className="text-xs">Confirm password</Label>
            <div className="relative">
              <Input
                id="seller-pw2"
                type={showPw2 ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={pwMismatch}
                className={cn("h-10 pr-10 text-base md:text-sm", pwMismatch && "border-destructive focus-visible:ring-destructive")}
              />
              <button
                type="button"
                onClick={() => setShowPw2((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPw2 ? "Hide password" : "Show password"}
              >
                {showPw2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwMismatch && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Passwords don't match
              </p>
            )}
          </div>

          <Button onClick={changePassword} disabled={!canSubmitPw} variant="outline" className="w-full h-10">
            {pwSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <KeyRound className="h-4 w-4 mr-1.5" />}
            Update password
          </Button>
        </div>

        <Separator className="my-6" />

        {/* Payout method */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Wallet className="h-4 w-4" /> Payout method
          </h4>
          <p className="text-[11px] text-muted-foreground -mt-2">
            Choose where you want to receive your earnings. Admin will pay you using these details.
          </p>

          <RadioGroup value={payoutMethod} onValueChange={setPayoutMethod} className="grid grid-cols-2 gap-2">
            <label
              htmlFor="po-bkash"
              className={cn(
                "flex items-center gap-2 rounded-lg border p-3 cursor-pointer text-sm transition-colors",
                payoutMethod === "bkash" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              )}
            >
              <RadioGroupItem value="bkash" id="po-bkash" />
              <Smartphone className="h-4 w-4 text-pink-600" />
              <span className="font-medium">bKash</span>
            </label>
            <label
              htmlFor="po-bank"
              className={cn(
                "flex items-center gap-2 rounded-lg border p-3 cursor-pointer text-sm transition-colors",
                payoutMethod === "bank" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              )}
            >
              <RadioGroupItem value="bank" id="po-bank" />
              <Landmark className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Bank</span>
            </label>
          </RadioGroup>

          {payoutMethod === "bkash" && (
            <div className="space-y-1.5">
              <Label htmlFor="bkash-num" className="text-xs">bKash number</Label>
              <Input
                id="bkash-num"
                value={bkashNumber}
                onChange={(e) => setBkashNumber(formatBkash(e.target.value))}
                maxLength={11}
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                className="h-10 text-base md:text-sm"
              />
              <p className="text-[11px] text-muted-foreground">Personal or Merchant bKash number</p>
            </div>
          )}

          {payoutMethod === "bank" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Bank name</Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Dutch-Bangla Bank"
                    className="h-10 text-base md:text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Branch</Label>
                  <Input
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    placeholder="Optional"
                    className="h-10 text-base md:text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Account holder name</Label>
                <Input
                  value={bankAccName}
                  onChange={(e) => setBankAccName(e.target.value)}
                  placeholder="As per bank record"
                  className="h-10 text-base md:text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Account number</Label>
                  <Input
                    value={bankAccNum}
                    onChange={(e) => setBankAccNum(formatDigits(e.target.value, 20))}
                    inputMode="numeric"
                    maxLength={20}
                    placeholder="Account number (6-20 digits)"
                    className="h-10 text-base md:text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Routing number</Label>
                  <Input
                    value={bankRouting}
                    onChange={(e) => setBankRouting(formatDigits(e.target.value, 12))}
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="Optional (6-12 digits)"
                    className="h-10 text-base md:text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <Button onClick={savePayout} disabled={payoutSaving || !payoutMethod} className="w-full h-10">
            {payoutSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save payout details
          </Button>

          {payoutHistory.length > 0 && (
            <div className="mt-2 space-y-2">
              <h5 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Payout method history
              </h5>
              <ul className="rounded-lg border border-border divide-y divide-border bg-card text-xs max-h-60 overflow-y-auto">
                {payoutHistory.map((h) => {
                  const d = h.details || {};
                  const label =
                    h.method === "bkash"
                      ? `bKash · ${d.bkash_number || "—"}`
                      : h.method === "bank"
                      ? `${d.bank_name || "Bank"} · A/C ${d.bank_account_number ? "•••" + String(d.bank_account_number).slice(-4) : "—"}`
                      : h.method;
                  return (
                    <li key={h.id} className="px-3 py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{label}</div>
                      </div>
                      <span className="text-[10.5px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(h.changed_at), { addSuffix: true })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <Separator className="my-6" />

        {/* Activity / History */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-1.5"><Clock className="h-4 w-4" /> Profile activity</h4>
          <ul className="rounded-xl border border-border divide-y divide-border bg-card overflow-hidden">
            <ActivityRow icon={<User className="h-3.5 w-3.5" />} label="Name updated" when={fmtAgo(nameUpdatedAt)} />
            <ActivityRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone updated" when={fmtAgo(phoneUpdatedAt)} />
            <ActivityRow icon={<Camera className="h-3.5 w-3.5" />} label="Avatar updated" when={fmtAgo(avatarUpdatedAt)} />
            <ActivityRow icon={<KeyRound className="h-3.5 w-3.5" />} label="Password changed" when={fmtAgo(passwordChangedAt)} />
            <ActivityRow icon={<Wallet className="h-3.5 w-3.5" />} label="Payout details updated" when={fmtAgo(payoutUpdatedAt)} />
            {seller.created_at && (
              <ActivityRow icon={<Check className="h-3.5 w-3.5" />} label="Account created" when={fmtAgo(seller.created_at)} />
            )}
          </ul>
        </div>

        <div className="mt-6 text-[11px] text-muted-foreground">
          Seller ID: <span className="font-mono">{seller.id.slice(0, 8)}</span>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const PwCheck = ({ ok, text }: { ok: boolean; text: string }) => (
  <li className={cn("flex items-center gap-1", ok && "text-emerald-600")}>
    {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-50" />}
    {text}
  </li>
);

const ActivityRow = ({ icon, label, when }: { icon: React.ReactNode; label: string; when: string }) => (
  <li className="flex items-center justify-between gap-3 px-3 py-2.5">
    <div className="flex items-center gap-2 text-sm">
      <span className="h-6 w-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
    <span className="text-[11px] text-muted-foreground text-right">{when}</span>
  </li>
);
