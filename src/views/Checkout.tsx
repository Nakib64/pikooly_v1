"use client";
import { useState, useMemo, useEffect } from "react";
import { BD_DISTRICTS_THANAS } from "@/data/bdDistrictsThanas";
import paymentMethodsImg from "@/assets/payment-methods.webp";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { Loader2, ShoppingBag, Truck, CreditCard, Minus, Plus, X, Ticket, Check, ChevronsUpDown, Banknote, Wallet, Smartphone, CalendarDays, Clock, MapPin, Sparkles, ShieldCheck, AlertTriangle, Globe, Copy, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMultiCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { shouldSendMail, shouldSendSms, shouldSendPush, shouldSendAdminMail, sendBrowserPush } from "@/lib/notificationHelper";
import { SameDayAnimation, NextDayAnimation } from "@/components/checkout/DeliveryAnimations";
import SEOHead from "@/components/seo/SEOHead";
import { AddressAutocomplete } from "@/components/checkout/AddressAutocomplete";
import { resolveEffectiveDeliveryFees, type CategoryDeliveryFee, type DistrictFees } from "@/lib/deliveryResolver";
import { useCheckoutDelivery } from "@/hooks/useCheckoutDelivery";
import DeliveryModeCards from "@/components/checkout/DeliveryModeCards";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

const countryPhoneCodes: Record<string, string> = {
  "Afghanistan": "+93", "Albania": "+355", "Algeria": "+213", "Andorra": "+376", "Angola": "+244",
  "Argentina": "+54", "Armenia": "+374", "Australia": "+61", "Austria": "+43", "Azerbaijan": "+994",
  "Bahamas": "+1-242", "Bahrain": "+973", "Bangladesh": "+880", "Barbados": "+1-246", "Belarus": "+375",
  "Belgium": "+32", "Belize": "+501", "Benin": "+229", "Bhutan": "+975", "Bolivia": "+591",
  "Bosnia and Herzegovina": "+387", "Botswana": "+267", "Brazil": "+55", "Brunei": "+673", "Bulgaria": "+359",
  "Burkina Faso": "+226", "Burundi": "+257", "Cambodia": "+855", "Cameroon": "+237", "Canada": "+1",
  "Chad": "+235", "Chile": "+56", "China": "+86", "Colombia": "+57", "Comoros": "+269", "Congo": "+243",
  "Costa Rica": "+506", "Croatia": "+385", "Cuba": "+53", "Cyprus": "+357", "Czech Republic": "+420",
  "Denmark": "+45", "Djibouti": "+253", "Dominican Republic": "+1-809", "Ecuador": "+593", "Egypt": "+20",
  "El Salvador": "+503", "Estonia": "+372", "Ethiopia": "+251", "Fiji": "+679", "Finland": "+358",
  "France": "+33", "Gabon": "+241", "Gambia": "+220", "Georgia": "+995", "Germany": "+49", "Ghana": "+233",
  "Greece": "+30", "Guatemala": "+502", "Guinea": "+224", "Guyana": "+592", "Haiti": "+509", "Honduras": "+504",
  "Hungary": "+36", "Iceland": "+354", "India": "+91", "Indonesia": "+62", "Iran": "+98", "Iraq": "+964",
  "Ireland": "+353", "Israel": "+972", "Italy": "+39", "Jamaica": "+1-876", "Japan": "+81", "Jordan": "+962",
  "Kazakhstan": "+7", "Kenya": "+254", "Kuwait": "+965", "Kyrgyzstan": "+996", "Laos": "+856", "Latvia": "+371",
  "Lebanon": "+961", "Liberia": "+231", "Libya": "+218", "Lithuania": "+370", "Luxembourg": "+352",
  "Madagascar": "+261", "Malawi": "+265", "Malaysia": "+60", "Maldives": "+960", "Mali": "+223", "Malta": "+356",
  "Mauritania": "+222", "Mauritius": "+230", "Mexico": "+52", "Moldova": "+373", "Mongolia": "+976",
  "Montenegro": "+382", "Morocco": "+212", "Mozambique": "+258", "Myanmar": "+95", "Namibia": "+264",
  "Nepal": "+977", "Netherlands": "+31", "New Zealand": "+64", "Nicaragua": "+505", "Niger": "+227",
  "Nigeria": "+234", "North Macedonia": "+389", "Norway": "+47", "Oman": "+968", "Pakistan": "+92",
  "Palestine": "+970", "Panama": "+507", "Papua New Guinea": "+675", "Paraguay": "+595", "Peru": "+51",
  "Philippines": "+63", "Poland": "+48", "Portugal": "+351", "Qatar": "+974", "Romania": "+40", "Russia": "+7",
  "Rwanda": "+250", "Saudi Arabia": "+966", "Senegal": "+221", "Serbia": "+381", "Sierra Leone": "+232",
  "Singapore": "+65", "Slovakia": "+421", "Slovenia": "+386", "Somalia": "+252", "South Africa": "+27",
  "South Korea": "+82", "Spain": "+34", "Sri Lanka": "+94", "Sudan": "+249", "Suriname": "+597",
  "Sweden": "+46", "Switzerland": "+41", "Syria": "+963", "Taiwan": "+886", "Tajikistan": "+992",
  "Tanzania": "+255", "Thailand": "+66", "Togo": "+228", "Trinidad and Tobago": "+1-868", "Tunisia": "+216",
  "Turkey": "+90", "Turkmenistan": "+993", "Uganda": "+256", "Ukraine": "+380", "United Arab Emirates": "+971",
  "United Kingdom": "+44", "United States": "+1", "Uruguay": "+598", "Uzbekistan": "+998",
  "Venezuela": "+58", "Vietnam": "+84", "Yemen": "+967", "Zambia": "+260", "Zimbabwe": "+263",
};

const countries = Object.keys(countryPhoneCodes);

const deliveryTimeSlots = [
  "09:00 AM - 01:00 PM",
  "01:00 PM - 05:00 PM",
  "05:00 PM - 09:00 PM",
];

const PREFERRED_DELIVERY_DISTRICT_KEY = "preferred_delivery_district";

interface CheckoutDistrict extends DistrictFees {
  name: string;
  postal_code?: string | null;
  same_day_label?: string | null;
  next_day_label?: string | null;
}

const CopyRow = ({ label, value }: { label: string; value: string }) => {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-t border-border/40 first:border-t-0">
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

const RemittanceInfoCard = ({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Smartphone;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl bg-card border border-border px-4 py-3 shadow-sm">
    <div className="flex items-center gap-2.5 mb-1">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
        <Icon size={15} className="text-primary" />
      </span>
      <p className="text-[15px] font-bold text-foreground">{title}</p>
    </div>
    <div className="pl-[42px]">{children}</div>
  </div>
);

const RemittanceDetails = ({ settings, serviceLabel }: { settings: Record<string, string>; serviceLabel: string }) => {
  const hasBkash = !!settings.remittance_bkash_personal;
  const hasNagad = !!settings.remittance_nagad_personal;
  const hasBank = !!(settings.remittance_bank_account_number || settings.remittance_bank_name);
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-5 space-y-3.5">
      <div className="flex items-start gap-2.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Globe size={16} className="text-primary" />
        </span>
        <p className="text-[15px] font-bold text-foreground leading-snug pt-1">
          Send via {serviceLabel} to any of the receivers below
        </p>
      </div>
      {settings.remittance_instructions && (
        <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed pl-[46px]">
          {settings.remittance_instructions}
        </p>
      )}
      {hasBkash && (
        <RemittanceInfoCard icon={Smartphone} title="bKash (Personal)">
          <CopyRow label="Number" value={settings.remittance_bkash_personal} />
        </RemittanceInfoCard>
      )}
      {hasNagad && (
        <RemittanceInfoCard icon={Smartphone} title="Nagad (Personal)">
          <CopyRow label="Number" value={settings.remittance_nagad_personal} />
        </RemittanceInfoCard>
      )}
      {hasBank && (
        <RemittanceInfoCard icon={Building2} title="Bank Transfer">
          <CopyRow label="Bank" value={settings.remittance_bank_name} />
          <CopyRow label="A/C Name" value={settings.remittance_bank_account_name} />
          <CopyRow label="A/C Number" value={settings.remittance_bank_account_number} />
          <CopyRow label="Routing / SWIFT" value={settings.remittance_bank_routing} />
          <CopyRow label="Branch" value={settings.remittance_bank_branch} />
        </RemittanceInfoCard>
      )}
    </div>
  );
};



const Checkout = () => {
  const { items, totalPrice, clearCart, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();
  const { formatPrice } = useMultiCurrency();
  const { settings: siteSettings } = useSiteSettings();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [postalStatus, setPostalStatus] = useState<"idle" | "matched" | "not_found">("idle");
  const [countryOpen, setCountryOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [selectedThana, setSelectedThana] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("pikooly_delivery_thana") || "";
  });
  const [phoneCode, setPhoneCode] = useState("+1");
  const [phoneCodeOpen, setPhoneCodeOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [deliveryType, setDeliveryType] = useState<"same_day" | "next_day">("same_day");
  const [form, setForm] = useState({
    fullName: "",
    billingCountry: "Bangladesh",
    phone: "+1",
    email: "",
    recipientName: "",
    recipientPhone: "",
    giftMessage: "",
    address: "",
    notes: "",
    deliveryDate: "",
    deliveryTime: "",
    paymentMethod: "eps",
    remittanceService: "",
    remittanceTxnRef: "",
  });
  

  // Auto-fill form for logged-in users
  const { data: userProfile } = useQuery({
    queryKey: ["checkout-profile", user?.id],
    enabled: !!user,
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: defaultAddress } = useQuery({
    queryKey: ["checkout-default-address", user?.id],
    enabled: !!user,
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_addresses")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_default", true)
        .maybeSingle();
      if (!data) {
        const { data: latest } = await supabase
          .from("saved_addresses")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return latest;
      }
      return data;
    },
  });

  useEffect(() => {
    if (!user) return;
    if (userProfile || defaultAddress) {
      setForm((prev) => ({
        ...prev,
        fullName: userProfile?.full_name || user.user_metadata?.full_name || prev.fullName || "",
        phone: (() => {
          const raw = userProfile?.phone || defaultAddress?.phone || prev.phone || "";
          if (!raw) return "+1";
          const digits = raw.replace(/^\+[\d-]+/, "").replace(/^0+/, "");
          return digits ? `+1${digits}` : "+1";
        })(),
        email: user.email || prev.email || "",
        billingCountry: prev.billingCountry || "Bangladesh",
        recipientName: defaultAddress?.full_name || userProfile?.full_name || prev.recipientName || "",
        recipientPhone: defaultAddress?.phone || userProfile?.phone || prev.recipientPhone || "",
        address: defaultAddress?.address || prev.address || "",
      }));
    }
  }, [user, userProfile, defaultAddress]);

  const isGatewayEnabled = (value?: string | null) =>
    ["enable", "enabled", "true", "1", "yes", "on"].includes((value ?? "").toLowerCase());

  const isExplicitlyDisabled = (value?: string | null) =>
    ["disable", "disabled", "false", "0", "no", "off"].includes((value ?? "").toLowerCase());

  const allPaymentMethods = [
    { value: "cod", label: "Cash on Delivery", desc: "Pay when you receive your order", statusKeys: ["cod_enabled", "cod_status"], icon: "Banknote" as const },
    { value: "paypal", label: "PayPal", desc: "Pay securely via PayPal", statusKeys: ["paypal_status"], icon: "Wallet" as const },
    { value: "stripe", label: "Stripe", desc: "Pay with credit/debit card via Stripe", statusKeys: ["stripe_status"], icon: "CreditCard" as const },
    { value: "eps", label: "Local & Global Payment", desc: "Pay with Cards, Bkash, Nagad, Upay, etc.", statusKeys: ["eps_status"], icon: "Smartphone" as const },
    { value: "remittance", label: "Global Remittance", desc: "Western Union, MoneyGram, Ria, Wise, TapTap Send", statusKeys: ["remittance_status"], icon: "Globe" as const },
  ];

  const { data: gatewaySettings = {} } = useQuery({
    queryKey: ["payment-gateway-settings"],
    queryFn: async () => {
      const keys = [
        "cod_enabled", "cod_status", "paypal_status", "stripe_status", "eps_status", "store_email", "admin_notification_email", "checkout_billing_visible",
        "remittance_status", "remittance_wu_enabled", "remittance_mg_enabled", "remittance_ria_enabled", "remittance_wise_enabled", "remittance_tts_enabled",
        "remittance_bkash_personal", "remittance_nagad_personal", "remittance_bank_name", "remittance_bank_account_name", "remittance_bank_account_number",
        "remittance_bank_routing", "remittance_bank_branch", "remittance_instructions",
      ];
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", keys);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((s) => { map[s.key] = s.value || ""; });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const hasRemittanceReceiverDetails = !!(
    gatewaySettings.remittance_bkash_personal ||
    gatewaySettings.remittance_nagad_personal ||
    gatewaySettings.remittance_bank_name ||
    gatewaySettings.remittance_bank_account_number
  );

  const isRemittanceGatewayEnabled =
    isGatewayEnabled(gatewaySettings.remittance_status) ||
    (!isExplicitlyDisabled(gatewaySettings.remittance_status) && hasRemittanceReceiverDetails);

  // Fetch category flags (cod_enabled / hide_delivery_datetime) for cart items.
  // Considers both primary product.categoryId and product_categories link rows.
  const cartProductIds = useMemo(() => items.map((i) => i.product.id).filter(Boolean), [items]);
  const { data: cartCategoryFlags = { perItem: [] as { productId: string; codAllowed: boolean; hideDateTime: boolean }[] } } = useQuery({
    queryKey: ["checkout-cart-category-flags", cartProductIds.sort().join(",")],
    enabled: cartProductIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const primaryIds = items.map((i) => (i.product as any).categoryId).filter(Boolean) as string[];
      const { data: pcRows } = await supabase
        .from("product_categories")
        .select("product_id, category_id")
        .in("product_id", cartProductIds);
      const linkMap = new Map<string, string[]>();
      (pcRows || []).forEach((r: any) => {
        const arr = linkMap.get(r.product_id) || [];
        arr.push(r.category_id);
        linkMap.set(r.product_id, arr);
      });
      const allCatIds = Array.from(new Set([
        ...primaryIds,
        ...((pcRows || []).map((r: any) => r.category_id)),
      ]));
      let flagsMap = new Map<string, { cod: boolean; hide: boolean }>();
      if (allCatIds.length > 0) {
        const { data: catRows } = await supabase
          .from("categories")
          .select("id, cod_enabled, hide_delivery_datetime")
          .in("id", allCatIds);
        (catRows || []).forEach((c: any) => {
          flagsMap.set(c.id, {
            cod: c.cod_enabled !== false,
            hide: !!c.hide_delivery_datetime,
          });
        });
      }
      const perItem = items.map((it) => {
        const catIds = new Set<string>();
        const primary = (it.product as any).categoryId;
        if (primary) catIds.add(primary);
        (linkMap.get(it.product.id) || []).forEach((c) => catIds.add(c));
        // If product has NO categories at all, treat as cod-allowed + no hide (don't break checkout)
        if (catIds.size === 0) return { productId: it.product.id, codAllowed: true, hideDateTime: false };
        let codAllowed = true;
        let hideDateTime = false;
        let anyMatched = false;
        catIds.forEach((cid) => {
          const f = flagsMap.get(cid);
          if (!f) return;
          anyMatched = true;
          // If ANY category disables COD, the product is COD-disabled.
          if (!f.cod) codAllowed = false;
          // If ANY category hides the date/time picker, hide it.
          if (f.hide) hideDateTime = true;
        });
        // If no matching category rows found (rare), default to allowed
        if (!anyMatched) {
          codAllowed = true;
        }
        return { productId: it.product.id, codAllowed, hideDateTime };
      });
      return { perItem };
    },
  });

  // Custom Bouquet items never allow COD (require advance payment).
  const hasCustomBouquet = items.some(
    (it) => String((it.product as any).category || "").toLowerCase() === "custom bouquet"
  );
  // COD is shown only if EVERY cart item belongs to a COD-enabled category and no custom bouquet is in cart.
  const cartAllowsCOD =
    !hasCustomBouquet &&
    (cartCategoryFlags.perItem.length === 0 ||
      cartCategoryFlags.perItem.every((f) => f.codAllowed));
  // Hide date/time picker if ANY cart item is in a category flagged to hide it.
  const hideDeliveryDateTime = cartCategoryFlags.perItem.some((f) => f.hideDateTime);

  const enabledPaymentMethods = allPaymentMethods.filter((method) => {
    if (method.value === "remittance") return isRemittanceGatewayEnabled;
    if (method.value === "cod") return cartAllowsCOD;
    return method.statusKeys.some((key) => isGatewayEnabled(gatewaySettings[key]));
  });

  const remittanceServices = [
    { key: "wu", label: "Western Union", enabledKey: "remittance_wu_enabled" },
    { key: "mg", label: "MoneyGram", enabledKey: "remittance_mg_enabled" },
    { key: "ria", label: "Ria", enabledKey: "remittance_ria_enabled" },
    { key: "wise", label: "Wise", enabledKey: "remittance_wise_enabled" },
    { key: "tts", label: "TapTap Send", enabledKey: "remittance_tts_enabled" },
  ].filter((s) => !isExplicitlyDisabled(gatewaySettings[s.enabledKey]));

  // Auto-select first enabled method if current selection is disabled
  const selectedMethodEnabled = enabledPaymentMethods.some((m) => m.value === form.paymentMethod);
  if (!selectedMethodEnabled && enabledPaymentMethods.length > 0 && form.paymentMethod !== enabledPaymentMethods[0].value) {
    setForm((prev) => ({ ...prev, paymentMethod: enabledPaymentMethods[0].value }));
  }

  const { data: districts = [] } = useQuery({
    queryKey: ["shipping-districts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_districts")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Auto-select district in the same order customers see fees:
  // Product Details saved location → saved address → first available district.
  useEffect(() => {
    if (selectedDistrict || !districts.length) return;

    const savedLocation =
      typeof window !== "undefined" ? localStorage.getItem(PREFERRED_DELIVERY_DISTRICT_KEY) : null;
    const savedMatch = savedLocation
      ? districts.find((d: any) => d.name.toLowerCase() === savedLocation.toLowerCase())
      : null;

    if (savedMatch) {
      setSelectedDistrict((savedMatch as any).id);
      return;
    }

    const district = defaultAddress?.district;
    if (district) {
      const addressMatch = districts.find(
        (d: any) => d.name.toLowerCase() === district.toLowerCase()
      );
      if (addressMatch) {
        setSelectedDistrict(addressMatch.id);
        return;
      }
    }

    setSelectedDistrict((districts[0] as any).id);
  }, [districts, defaultAddress, selectedDistrict]);

  // Auto-detect district from postal code (debounced)
  useEffect(() => {
    const code = postalCode.trim();
    if (!code) {
      setPostalStatus("idle");
      return;
    }
    if (!districts.length) return;
    const t = setTimeout(() => {
      const match = districts.find(
        (d: any) => (d.postal_code || "").toString().trim() === code
      );
      if (match) {
        setSelectedDistrict(match.id);
        setPostalStatus("matched");
      } else {
        setPostalStatus("not_found");
      }
    }, 250);
    return () => clearTimeout(t);
  }, [postalCode, districts]);

  // Keep postal code in sync when district is changed manually
  useEffect(() => {
    if (!selectedDistrict || !districts.length) return;
    const d: any = districts.find((x: any) => x.id === selectedDistrict);
    if (d?.name && typeof window !== "undefined") {
      localStorage.setItem(PREFERRED_DELIVERY_DISTRICT_KEY, d.name);
    }
    if (d?.postal_code && d.postal_code !== postalCode) {
      setPostalCode(d.postal_code);
      setPostalStatus("matched");
    }
  }, [selectedDistrict, districts]);

  // Fetch category-specific shipping fees
  const { data: categoryFees = [] } = useQuery({
    queryKey: ["shipping-category-fees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_category_fees")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch product delivery_time for each cart item (to validate same/next day)
  const { data: productDeliveryInfo = [] } = useQuery({
    queryKey: ["checkout-product-delivery", items.map((i) => i.product.id).join(",")],
    queryFn: async () => {
      if (items.length === 0) return [];
      const productIds = items.map((i) => i.product.id);
      const { data, error } = await supabase
        .from("products")
        .select("id, name, delivery_time")
        .in("id", productIds);
      if (error) throw error;
      return data || [];
    },
    enabled: items.length > 0,
  });

  // Classify each product: supports same_day if delivery_time mentions "same"; otherwise next_day only
  const productSupports = useMemo(() => {
    const map = new Map<string, { name: string; sameDay: boolean; nextDay: boolean; label: string }>();
    productDeliveryInfo.forEach((p: any) => {
      const txt = (p.delivery_time || "").toLowerCase().trim();
      // Default: if no delivery_time set, allow both (admin hasn't restricted)
      const hasInfo = txt.length > 0;
      const sameDay = !hasInfo || txt.includes("same");
      const nextDay = !hasInfo || txt.includes("next") || txt.includes("day") || !txt.includes("same");
      map.set(p.id, { name: p.name, sameDay, nextDay, label: p.delivery_time || "" });
    });
    return map;
  }, [productDeliveryInfo]);

  // Find products that don't support the selected delivery type
  const incompatibleItems = useMemo(() => {
    return items
      .map((i) => {
        const info = productSupports.get(i.product.id);
        if (!info) return null;
        const ok = deliveryType === "same_day" ? info.sameDay : info.nextDay;
        if (ok) return null;
        return { id: i.product.id, name: i.product.name, label: info.label };
      })
      .filter(Boolean) as Array<{ id: string; name: string; label: string }>;
  }, [items, productSupports, deliveryType]);

  const hasDeliveryMismatch = incompatibleItems.length > 0;

  // Fetch each cart product's primary category. Category delivery fees follow
  // the product's main category only, so unrelated browsing categories won't
  // accidentally force a higher/lower shipping charge.
  const { data: productCategoryIds = [] } = useQuery({
    queryKey: ["checkout-product-categories", items.map((i) => i.product.id).join(",")],
    queryFn: async () => {
      if (items.length === 0) return [];
      const cartCategoryIds = new Set<string>();
      items.forEach((item) => {
        const categoryId = (item.product as any).categoryId || (item.product as any).category_id;
        if (categoryId) cartCategoryIds.add(categoryId);
      });
      const productIds = items
        .map((i) => i.product.id)
        .filter((productId) => !productId.startsWith("bouquet-"));
      if (productIds.length === 0) {
        return Array.from(cartCategoryIds);
      }
      const { data: pData, error: pError } = await supabase
        .from("products")
        .select("id, category_id")
        .in("id", productIds);
      if (pError) throw pError;
      const catIds = new Set<string>();
      cartCategoryIds.forEach((categoryId) => catIds.add(categoryId));
      (pData || []).forEach((p) => { if (p.category_id) catIds.add(p.category_id); });
      return Array.from(catIds);
    },
    enabled: items.length > 0,
  });

  const activeDistrict = districts.find((d: CheckoutDistrict) => d.id === selectedDistrict) as CheckoutDistrict | undefined;

  // Thanas for the active district (case-insensitive key match)
  const thanaOptions = useMemo(() => {
    if (!activeDistrict?.name) return [] as string[];
    const key = Object.keys(BD_DISTRICTS_THANAS).find(
      (k) => k.toLowerCase() === activeDistrict.name.toLowerCase()
    );
    return key ? BD_DISTRICTS_THANAS[key] : [];
  }, [activeDistrict?.name]);

  // Reset thana if not available for new district
  useEffect(() => {
    if (selectedThana && thanaOptions.length > 0 && !thanaOptions.some((t) => t.toLowerCase() === selectedThana.toLowerCase())) {
      setSelectedThana("");
    }
  }, [thanaOptions, selectedThana]);

  // Helper: pick fee field based on delivery type
  const pickFee = (row: DistrictFees | null, type: "same_day" | "next_day") => {
    if (!row) return 0;
    if (type === "same_day") return Number(row.same_day_fee ?? row.delivery_fee ?? 0);
    return Number(row.next_day_fee ?? 0);
  };

  const effectiveDistrictFees = useMemo(() => {
    if (!activeDistrict) return null;
    return resolveEffectiveDeliveryFees(activeDistrict, categoryFees as CategoryDeliveryFee[], productCategoryIds);
  }, [activeDistrict, categoryFees, productCategoryIds]);

  const sameDayFee = useMemo(() => pickFee(effectiveDistrictFees, "same_day"), [effectiveDistrictFees]);
  const nextDayFee = useMemo(() => pickFee(effectiveDistrictFees, "next_day"), [effectiveDistrictFees]);

  // Availability: an option is available when admin explicitly configured it.
  // A fee of 0 means free delivery, not unavailable.
  const sameDayAvailable = useMemo(() => {
    if (!activeDistrict) return false;
    const raw = effectiveDistrictFees?.same_day_fee;
    return raw !== null && raw !== undefined;
  }, [activeDistrict, effectiveDistrictFees]);
  const nextDayAvailable = useMemo(() => {
    if (!activeDistrict) return false;
    const raw = effectiveDistrictFees?.next_day_fee;
    return raw !== null && raw !== undefined;
  }, [activeDistrict, effectiveDistrictFees]);

  // Auto-select the only available option when district changes
  useEffect(() => {
    if (!activeDistrict) return;
    if (deliveryType === "same_day" && !sameDayAvailable && nextDayAvailable) {
      setDeliveryType("next_day");
    } else if (deliveryType === "next_day" && !nextDayAvailable && sameDayAvailable) {
      setDeliveryType("same_day");
    }
  }, [activeDistrict, sameDayAvailable, nextDayAvailable, deliveryType]);

  // NEW: split-shipment delivery (3-mode system) — overrides legacy district-based fee
  const { groups: deliveryGroups, totalDeliveryFee, isSplit, primaryLabel } = useCheckoutDelivery(items as any);
  const deliveryFee = totalDeliveryFee;
  const deliveryLabel = primaryLabel || "Delivery";

  // Coupon discount calculation
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? Math.round((totalPrice * appliedCoupon.discount_value) / 100)
      : Math.min(appliedCoupon.discount_value, totalPrice)
    : 0;

  const grandTotal = totalPrice + deliveryFee - couponDiscount;

  // Pre-order: compute weighted advance based on per-item advance percent
  // Items with isPreorder=true contribute (line_total * pct/100) as advance.
  // Non pre-order items contribute their full price as advance (must be paid now).
  const hasPreorder = items.some((it: any) => it.product?.isPreorder);
  const preorderAdvanceItems = items.reduce((sum: number, it: any) => {
    const lineUnit = it.product.price + (it.variant?.size?.extraPrice || 0);
    const lineTotal = lineUnit * it.quantity;
    if (it.product?.isPreorder) {
      const pct = it.product?.preorderAdvancePercent ?? 50;
      return sum + Math.round((lineTotal * pct) / 100);
    }
    return sum + lineTotal;
  }, 0);
  // Final amount due now: advance for items + delivery fee - discount
  const advanceDueNow = hasPreorder
    ? Math.max(0, preorderAdvanceItems + deliveryFee - couponDiscount)
    : grandTotal;
  const dueOnDelivery = hasPreorder ? Math.max(0, grandTotal - advanceDueNow) : 0;

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Invalid coupon code");
        setCouponLoading(false);
        return;
      }

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error("This coupon has expired");
        setCouponLoading(false);
        return;
      }

      // Check min order
      if (data.min_order_amount && totalPrice < data.min_order_amount) {
        toast.error(`Minimum order ৳${data.min_order_amount} required for this coupon`);
        setCouponLoading(false);
        return;
      }

      // Check max uses
      if (data.max_uses && data.used_count >= data.max_uses) {
        toast.error("This coupon has reached its usage limit");
        setCouponLoading(false);
        return;
      }

      setAppliedCoupon(data);
      toast.success(`Coupon "${data.code}" applied!`);
    } catch (err: any) {
      toast.error("Failed to apply coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const billingVisible = gatewaySettings.checkout_billing_visible !== "false";

    if (billingVisible && (!form.phone.trim() || form.phone.trim() === phoneCode || !form.email.trim())) {
      toast.error("Please enter your WhatsApp number and email");
      return;
    }

    if (!form.address.trim() || !form.recipientName.trim() || !form.recipientPhone.trim()) {
      toast.error("Please fill in all required delivery fields");
      return;
    }

    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id || null;

      // Resolve affiliate (if a referral cookie exists)
      let affiliateCode: string | null = null;
      let affiliateId: string | null = null;
      try {
        const { getStoredAffiliateCode } = await import("@/components/layout/AffiliateTracker");
        const code = getStoredAffiliateCode();
        if (code) {
          const { data: affRows } = await supabase.rpc("lookup_affiliate_by_code", { _code: code });
          const aff = Array.isArray(affRows) ? affRows[0] : affRows;
          if (aff && aff.user_id !== userId) {
            affiliateCode = code;
            affiliateId = aff.id;
          }
        }
      } catch {}

      const isRemittance = form.paymentMethod === "remittance";
      const mergedNotes = form.notes.trim() || "";

      const orderData = {
        customer_name: (form.fullName.trim() || form.recipientName.trim()),
        customer_phone: form.phone.trim(),
        customer_email: form.email.trim() || null,
        billing_country: form.billingCountry.trim() || 'Bangladesh',
        delivery_address: `${activeDistrict?.name ? activeDistrict.name + " - " : ""}${selectedThana ? selectedThana + ", " : ""}${form.address.trim()}`,
        notes: mergedNotes || null,
        recipient_name: form.recipientName.trim() || null,
        alt_phone: form.recipientPhone.trim() || null,
        gift_message: form.giftMessage.trim() || null,
        delivery_date: form.deliveryDate || null,
        delivery_time: form.deliveryTime || null,
        delivery_type: deliveryGroups.map((g) => g.mode.key).join("+") || "standard",
        payment_method: isRemittance ? "remittance" : form.paymentMethod,
        subtotal: totalPrice,
        delivery_fee: deliveryFee,
        discount: couponDiscount,
        total: grandTotal,
        is_preorder: hasPreorder,
        advance_amount: hasPreorder ? advanceDueNow : 0,
        due_amount: hasPreorder ? dueOnDelivery : 0,
        user_id: userId,
        order_number: "temp",
        affiliate_code: affiliateCode,
        affiliate_id: affiliateId,
        district_id: selectedDistrict || null,
        upazila_name: selectedThana || null,
      };

      const { data: order, error: orderError } = await (supabase as any)
        .rpc("create_checkout_order", { _order: orderData })
        .maybeSingle();

      if (orderError) {
        console.error("Order create error:", orderError);
        throw orderError;
      }
      if (!order) throw new Error("Order was not created");

      // Upload custom images to storage and build order items
      const orderItems = [];
      for (const item of items) {
        let customImageUrls: string[] = [];
        if (item.customImages?.length) {
          const { convertToWebP } = await import("@/lib/imageUtils");
          const { uploadToCloudinary } = await import("@/lib/cloudinaryUpload");
          for (const file of item.customImages) {
            try {
              const webpFile = await convertToWebP(file);
              const res = await uploadToCloudinary(webpFile, { folder: `custom-images/${order.id}/${item.product.id}`, resourceType: "image" });
              customImageUrls.push(res.url);
            } catch (e) {
              console.error("Custom image upload failed:", e);
            }
          }
        }
        if (item.extraImageUrls?.length) {
          customImageUrls.push(...item.extraImageUrls);
        }

        const lineUnit = item.product.price + (item.variant?.size?.extraPrice || 0);
        orderItems.push({
          order_id: order.id,
          product_id: item.product.id.startsWith("bouquet-") ? null : item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          price: lineUnit,
          total: lineUnit * item.quantity,
          custom_images: customImageUrls.length > 0 ? customImageUrls : undefined,
          selected_size: item.variant?.size?.name || null,
          selected_color: item.variant?.color?.name || null,
        });
      }

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Fire-and-forget Google Sheets sync (admin-controlled)
      supabase.functions.invoke("google-sheets-sync", {
        body: { order_id: order.id },
      }).catch((e) => console.error("google-sheets-sync error", e));

      // Fire-and-forget seller notification (must not block order)
      supabase.functions.invoke("notify-seller", {
        body: { order_id: order.id },
      }).catch((e) => console.error("notify-seller error", e));

      // Increment coupon used_count
      if (appliedCoupon) {
        await supabase
          .from("coupons")
          .update({ used_count: (appliedCoupon.used_count || 0) + 1 })
          .eq("id", appliedCoupon.id);
      }

      // If EPS payment, redirect to EPS gateway
      if (form.paymentMethod === "eps") {
        try {
          const { data: epsData, error: epsError } = await supabase.functions.invoke("eps-payment", {
            body: { action: "initialize", order_id: order.id },
          });

          if (epsError || !epsData?.redirectUrl) {
            toast.error(epsData?.error || "EPS payment initialization failed. Please try again.");
            setLoading(false);
            return;
          }

          // Redirect to EPS payment page
          window.location.href = epsData.redirectUrl;
          return;
        } catch (epsErr: any) {
          console.error("EPS error:", epsErr);
          toast.error("Failed to connect to EPS payment gateway.");
          setLoading(false);
          return;
        }
      }

      // Stripe checkout redirect
      if (form.paymentMethod === "stripe") {
        try {
          const { data: stripeData, error: stripeError } = await supabase.functions.invoke("stripe-payment", {
            body: { action: "initialize", order_id: order.id },
          });
          if (stripeError || !stripeData?.redirectUrl) {
            toast.error(stripeData?.error || "Stripe payment initialization failed.");
            setLoading(false);
            return;
          }
          window.location.href = stripeData.redirectUrl;
          return;
        } catch (err: any) {
          console.error("Stripe error:", err);
          toast.error("Failed to connect to Stripe.");
          setLoading(false);
          return;
        }
      }

      // PayPal checkout redirect
      if (form.paymentMethod === "paypal") {
        try {
          const { data: ppData, error: ppError } = await supabase.functions.invoke("paypal-payment", {
            body: { action: "initialize", order_id: order.id },
          });
          if (ppError || !ppData?.redirectUrl) {
            toast.error(ppData?.error || "PayPal payment initialization failed.");
            setLoading(false);
            return;
          }
          window.location.href = ppData.redirectUrl;
          return;
        } catch (err: any) {
          console.error("PayPal error:", err);
          toast.error("Failed to connect to PayPal.");
          setLoading(false);
          return;
        }
      }

      // Global Remittance — redirect to dedicated payment page
      if (isRemittance) {
        clearCart();
        toast.success("Order created! Complete your payment below.");
        navigate(`/remittance-payment/${order.id}`);
        return;
      }

      // COD orders go straight to success


      // Fetch alert settings for notification toggles
      const alertSettings = siteSettings;

      // Send order confirmation email (fire & forget) — respects admin toggle
      if (form.email.trim() && shouldSendMail(alertSettings, "pending")) {
        const { buildOrderConfirmationEmail } = await import("@/lib/emailTemplates");
        const emailHtml = buildOrderConfirmationEmail({
          customerName: form.fullName || form.recipientName,
          orderNumber: order.order_number,
          deliveryAddress: `${activeDistrict?.name || ""}${selectedThana ? " - " + selectedThana : ""} - ${form.address}`,
          deliveryDate: form.deliveryDate || undefined,
          deliveryTime: form.deliveryTime || undefined,
          recipientName: form.recipientName || undefined,
          paymentMethod: form.paymentMethod === "cod" ? "Cash on Delivery" : form.paymentMethod.toUpperCase(),
          subtotal: totalPrice,
          deliveryFee,
          discount: couponDiscount,
          couponCode: appliedCoupon?.code,
          total: grandTotal,
          note: form.notes || undefined,
          items: items.map((item) => {
            const u = item.product.price + (item.variant?.size?.extraPrice || 0);
            const variantSuffix = [item.variant?.size?.name, item.variant?.color?.name].filter(Boolean).join(" / ");
            return {
              name: variantSuffix ? `${item.product.name} (${variantSuffix})` : item.product.name,
              quantity: item.quantity,
              total: u * item.quantity,
              imageUrl: (item.product as any).image_url || item.product.image || "",
            };
          }),
          trackOrderUrl: `${(siteSettings.public_site_url || window.location.origin).replace(/\/$/, '')}/track-order`,
          logoUrl: gatewaySettings.company_logo || "",
        });

        supabase.functions.invoke("send-email", {
          body: {
            to: form.email.trim(),
            subject: `Order Confirmed - ${order.order_number} | Pikooly`,
            html: emailHtml,
          },
        }).catch(console.error);
      }

      // Send order SMS to customer (fire & forget) — respects admin toggle
      if (form.phone.trim() && shouldSendSms(alertSettings, "pending")) {
        const publicBase = (siteSettings.public_site_url || window.location.origin).replace(/\/$/, '');
        const trackUrl = `${publicBase}/track-order`;
        const smsMessage = `✅ Order Confirmed!\n\nOrder: ${order.order_number}\nTotal: ৳${grandTotal.toFixed(2)}\nDelivery: ${activeDistrict?.name || ""}${selectedThana ? " - " + selectedThana : ""} - ${form.address.trim()}\n\n📦 Track your order:\n${trackUrl}\n\nThank you for shopping with Pikooly! 🌸`;

        supabase.functions.invoke("send-sms", {
          body: {
            to: form.phone.trim(),
            message: smsMessage,
          },
        }).catch(console.error);
      }

      // Send browser push notification — respects admin toggle
      if (shouldSendPush(alertSettings, "pending")) {
        sendBrowserPush(
          "Order Placed! ✅",
          `Order ${order.order_number} has been placed successfully. Total: ৳${grandTotal.toFixed(2)}`
        );
      }

      // Send admin notification email (fire & forget) — respects admin toggle
      const adminEmail = gatewaySettings.admin_notification_email || gatewaySettings.store_email;
      if (adminEmail && shouldSendAdminMail(alertSettings)) {
        const { buildAdminNewOrderEmail } = await import("@/lib/emailTemplates");
        const adminHtml = buildAdminNewOrderEmail({
          customerName: form.fullName || form.recipientName,
          orderNumber: order.order_number,
          deliveryAddress: `${activeDistrict?.name || ""}${selectedThana ? " - " + selectedThana : ""} - ${form.address}`,
          deliveryDate: form.deliveryDate || undefined,
          deliveryTime: form.deliveryTime || undefined,
          recipientName: form.recipientName || undefined,
          paymentMethod: form.paymentMethod === "cod" ? "Cash on Delivery" : form.paymentMethod.toUpperCase(),
          subtotal: totalPrice,
          deliveryFee,
          discount: couponDiscount,
          couponCode: appliedCoupon?.code,
          total: grandTotal,
          note: form.notes || undefined,
          items: items.map((item) => {
            const u = item.product.price + (item.variant?.size?.extraPrice || 0);
            const variantSuffix = [item.variant?.size?.name, item.variant?.color?.name].filter(Boolean).join(" / ");
            return {
              name: variantSuffix ? `${item.product.name} (${variantSuffix})` : item.product.name,
              quantity: item.quantity,
              total: u * item.quantity,
              imageUrl: (item.product as any).image_url || item.product.image || "",
            };
          }),
          trackOrderUrl: `${window.location.origin}/admin`,
          customerPhone: form.phone,
          customerEmail: form.email || undefined,
          billingCountry: form.billingCountry || undefined,
          logoUrl: gatewaySettings.company_logo || "",
        });

        supabase.functions.invoke("send-email", {
          body: {
            to: adminEmail,
            subject: `🛒 New Order - ${order.order_number} | Pikooly`,
            html: adminHtml,
          },
        }).catch(console.error);
      }

      clearCart();
      toast.success("Order placed successfully! 🎉");
      navigate(`/order-success/${order.order_number}`);
    } catch (error: any) {
      console.error("Order error:", error);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="section-container py-10 pb-24 md:pb-16">
        <SEOHead
          title="Checkout — Pikooly"
          description="Securely complete your order on Pikooly. Fast same-day & next-day delivery, multiple payment methods, and gift personalization."
          noindex
        />
        <div className="max-w-md mx-auto text-center py-12 luxe-panel p-10">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center bg-[hsl(var(--gold-light))] border border-[hsl(var(--gold)/0.3)]">
            <ShoppingBag size={32} className="text-[hsl(var(--gold-deep))]" />
          </div>
          <span className="eyebrow">Empty Cart</span>
          <h2 className="display-heading text-2xl mt-2 mb-2">Nothing to checkout yet</h2>
          <p className="text-muted-foreground mb-6 text-sm">Add a few thoughtful gifts to begin.</p>
          <Button onClick={() => navigate("/")} className="btn-luxe">
            Explore the Collection
          </Button>
        </div>
      </main>
    );
  }

  // Step indicator state derived from form completeness
  const billingStepDone = !!(form.phone.trim() && form.phone.trim() !== phoneCode && form.email.trim());
  const deliveryStepDone = !!(form.recipientName.trim() && form.recipientPhone.trim() && form.address.trim() && selectedDistrict);
  const paymentStepDone = !!form.paymentMethod;

  return (
    <main className="section-container py-4 md:py-8 pb-24 md:pb-10">
      <SEOHead
        title="Secure Checkout — Pikooly"
        description="Securely complete your order on Pikooly. Fast same-day & next-day delivery, multiple payment methods (bKash, Nagad, Cards), and free gift personalization."
        noindex
      />
      <div>
        {/* Header */}
        <div className="text-center mb-5 sm:mb-7 px-2">
          <span className="gold-rule mb-2.5">Secure Checkout</span>
          <h1
            className="display-heading text-foreground break-words"
            style={{ fontSize: "clamp(1.375rem, 4.5vw + 0.25rem, 2.5rem)", letterSpacing: "-0.02em", lineHeight: 1.15 }}
          >
            Complete Your Order
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 min-[900px]:grid-cols-3 gap-5 sm:gap-8">
            {/* Left - Billing & Delivery (scrolls internally on desktop/laptop) */}
            <div className="min-[900px]:col-span-2 space-y-5 sm:space-y-8 min-[900px]:max-h-[calc(100vh-7rem)] min-[900px]:overflow-y-auto scrollbar-hide min-[900px]:pr-2 min-[900px]:pb-8">
              {/* Billing Details */}
              {gatewaySettings.checkout_billing_visible !== "false" && (
              <section className="luxe-panel p-4 sm:p-6">
                <div className="luxe-panel-header mb-4 sm:mb-6">
                  <span className="icon-wrap"><CreditCard size={17} /></span>
                  <span>Billing Details</span>
                </div>
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="phone">WhatsApp Number <span className="text-destructive">*</span></Label>
                    <div className="relative mt-1.5 flex">
                      <Popover open={phoneCodeOpen} onOpenChange={setPhoneCodeOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm font-medium hover:bg-muted/80 transition-colors min-w-[78px]"
                          >
                            {phoneCode}
                            <ChevronsUpDown size={12} className="opacity-60" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[260px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search country..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>No country found.</CommandEmpty>
                              <CommandGroup>
                                {countries.map((c) => {
                                  const code = countryPhoneCodes[c];
                                  return (
                                    <CommandItem
                                      key={c}
                                      value={`${c} ${code}`}
                                      onSelect={() => {
                                        const digits = form.phone.replace(/^\+[\d-]+/, "");
                                        setPhoneCode(code);
                                        handleChange("phone", code + digits);
                                        setPhoneCodeOpen(false);
                                      }}
                                    >
                                      <Check size={14} className={cn("mr-2", phoneCode === code ? "opacity-100" : "opacity-0")} />
                                      <span className="flex-1 truncate">{c}</span>
                                      <span className="text-muted-foreground text-xs ml-2">{code}</span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your number"
                        value={form.phone.startsWith(phoneCode) ? form.phone.slice(phoneCode.length) : form.phone.replace(/^\+[\d-]+/, "")}
                        onChange={(e) => {
                          const val = e.target.value.replace(/^0+/, "").replace(/[^0-9]/g, "");
                          handleChange("phone", phoneCode + val);
                        }}
                        className="flex-1 rounded-l-none"
                        required
                        maxLength={20}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
                    <Input id="email" type="email" placeholder="example@email.com" value={form.email} onChange={(e) => handleChange("email", e.target.value)} className="mt-1.5" required maxLength={255} />
                  </div>
                </div>
              </section>
              )}

              {/* Delivery Information */}
              <section className="luxe-panel p-4 sm:p-6">
                <div className="luxe-panel-header mb-4 sm:mb-6">
                  <span className="icon-wrap"><Truck size={17} /></span>
                  <span>Delivery Information</span>
                </div>
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="recipientName">Recipient Name <span className="text-destructive">*</span></Label>
                    <Input id="recipientName" placeholder="Name of the person receiving the gift" value={form.recipientName} onChange={(e) => handleChange("recipientName", e.target.value)} className="mt-1.5" required maxLength={100} />
                  </div>
                  <div>
                    <Label htmlFor="recipientPhone">Recipient Number <span className="text-destructive">*</span></Label>
                    <Input id="recipientPhone" type="tel" placeholder="01XXXXXXXXX" value={form.recipientPhone} onChange={(e) => handleChange("recipientPhone", e.target.value)} className="mt-1.5" required maxLength={15} />
                  </div>
                  <div>
                    <Label>Country / Region</Label>
                    <div className="mt-1.5 px-3 py-2.5 bg-muted rounded-md text-sm font-medium">Bangladesh</div>
                  </div>
                  <div>
                    <Label htmlFor="address">Recipient Address <span className="text-destructive">*</span></Label>
                    <AddressAutocomplete
                      id="address"
                      placeholder="Search address on Google Maps..."
                      value={form.address}
                      onChange={(v) => handleChange("address", v)}
                      className="mt-1.5"
                      required
                      maxLength={500}
                      countryRestriction={["bd"]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="giftMessage">Gift Message (Optional)</Label>
                    <Textarea id="giftMessage" placeholder="Write a special message for the recipient..." value={form.giftMessage} onChange={(e) => handleChange("giftMessage", e.target.value)} className="mt-1.5 min-h-[80px]" maxLength={500} />
                  </div>
                  {!hideDeliveryDateTime && (
                  <div>
                    <Label className="mb-1.5 block">Select Delivery Date & Time Slot <span className="text-muted-foreground text-xs font-normal">(Optional)</span></Label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "flex items-center gap-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm hover:bg-muted/50 cursor-pointer text-left",
                              !form.deliveryDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarDays size={16} className="text-primary shrink-0" />
                            <span className="flex-1 text-left truncate">
                              {form.deliveryDate
                                ? new Date(form.deliveryDate + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
                                : "Select date"}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[60]" align="start">
                          <Calendar
                            mode="single"
                            selected={form.deliveryDate ? new Date(form.deliveryDate + "T00:00:00") : undefined}
                            onSelect={(d) => {
                              handleChange("deliveryDate", d ? format(d, "yyyy-MM-dd") : "");
                              if (d) setDatePickerOpen(false);
                            }}
                            disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                          <Clock size={16} className="text-primary" />
                        </div>
                        <Select value={form.deliveryTime} onValueChange={(v) => handleChange("deliveryTime", v)}>
                          <SelectTrigger className="h-11 text-sm pl-9"><SelectValue placeholder="Select time" /></SelectTrigger>
                          <SelectContent>
                            {deliveryTimeSlots.map((slot) => (
                              <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              </section>

              {/* Payment Method */}
              <section className="luxe-panel p-4 sm:p-6">
                <div className="luxe-panel-header mb-3 sm:mb-4">
                  <span className="icon-wrap"><ShieldCheck size={17} /></span>
                  <span>Payment Method</span>
                </div>
                <div className="space-y-2.5">
                  {enabledPaymentMethods.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No payment methods available.</p>
                  ) : enabledPaymentMethods.map((method) => (
                    <label
                      key={method.value}
                      className={`relative flex items-center gap-3 p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                        form.paymentMethod === method.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
                          : "border-border hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      <input type="radio" name="paymentMethod" value={method.value} checked={form.paymentMethod === method.value} onChange={(e) => handleChange("paymentMethod", e.target.value)} className="sr-only" />
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${form.paymentMethod === method.value ? "bg-primary/15" : "bg-muted"}`}>
                        {method.icon === "Banknote" && <Banknote size={20} className="text-primary" />}
                        {method.icon === "Wallet" && <Wallet size={20} className="text-primary" />}
                        {method.icon === "CreditCard" && <CreditCard size={20} className="text-primary" />}
                        {method.icon === "Smartphone" && <Smartphone size={20} className="text-primary" />}
                        {method.icon === "Globe" && <Globe size={20} className="text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-tight">{method.label}</p>
                        <p className="text-xs text-muted-foreground leading-snug">{method.desc}</p>
                      </div>
                      {form.paymentMethod === method.value && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <Check size={12} className="text-primary-foreground" />
                        </div>
                      )}
                    </label>
                  ))}
                </div>
                {form.paymentMethod === "eps" && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <img src={paymentMethodsImg.src} alt="Accepted payment methods - Visa, Mastercard, bKash, Nagad, Rocket, EPS and more" className="w-full h-auto object-contain" loading="lazy" />
                  </div>
                )}
                {form.paymentMethod === "remittance" && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="rounded-xl bg-primary/5 border border-primary/20 px-3.5 py-3 flex items-start gap-2.5">
                      <Globe size={16} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-foreground leading-relaxed">
                        After placing your order, you'll be taken to a secure page to choose your remittance service (Western Union, MoneyGram, Ria, Wise, TapTap Send) and submit the MTCN reference.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Right - Order Summary */}
            <div className="min-[900px]:col-span-1 min-[900px]:self-start min-[900px]:sticky min-[900px]:top-24">
              <div className="luxe-panel p-4 sm:p-6 overflow-hidden min-[900px]:max-h-[calc(100vh-7rem)] min-[900px]:overflow-y-auto scrollbar-hide">
                {/* Decorative gold corner */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-[hsl(var(--gold)/0.06)] rounded-full blur-2xl pointer-events-none" />
                <div className="relative">
                  <div className="luxe-panel-header mb-4 sm:mb-5">
                    <span className="icon-wrap"><Sparkles size={16} /></span>
                    <span>Order Summary</span>
                  </div>

                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 -mr-1 scrollbar-hide">
                    {items.map((item) => {
                      const variantKey = [item.variant?.size?.name || "", item.variant?.color?.name || ""].join("|");
                      const lineUnit = item.product.price + (item.variant?.size?.extraPrice || 0);
                      return (
                      <div key={`${item.product.id}-${variantKey}`} className="flex gap-3 items-start group p-3 rounded-xl border border-border/60 bg-[hsl(var(--ivory))]/40 hover:border-[hsl(var(--gold)/0.35)] transition-colors">
                        <div className="relative shrink-0">
                          <img src={getOptimizedImageUrl((item.product as any).image_url || item.product.image, { width: 128 })} alt={item.product.name} loading="lazy" decoding="async" className="w-16 h-16 object-cover rounded-lg bg-muted shadow-sm" />
                          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 text-[10px] font-bold rounded-full bg-foreground text-background flex items-center justify-center tabular-nums">{item.quantity}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold leading-snug line-clamp-2 text-foreground">{item.product.name}</p>
                          {(item.variant?.size || item.variant?.color) && (
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              {item.variant?.size && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold uppercase tracking-wide">{item.variant.size.name}</span>
                              )}
                              {item.variant?.color && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">
                                  <span className="w-2 h-2 rounded-full ring-1 ring-border" style={{ backgroundColor: item.variant.color.hex }} />
                                  {item.variant.color.name}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex items-center bg-background border border-border/70 rounded-full">
                              <button type="button" onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1), variantKey)} className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><Minus size={11} /></button>
                              <span className="text-[11px] font-bold w-5 text-center tabular-nums">{item.quantity}</span>
                              <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1, variantKey)} className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><Plus size={11} /></button>
                            </div>
                            <button type="button" onClick={() => removeItem(item.product.id, variantKey)} className="text-muted-foreground hover:text-destructive ml-auto" aria-label="Remove item"><X size={13} /></button>
                          </div>
                          <p className="text-[13px] font-semibold text-primary mt-1 tabular-nums">{formatPrice(lineUnit * item.quantity)}</p>
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  <div className="gold-divider my-5" />

                  {/* Delivery Speed selector removed per request */}

                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Ticket size={12} className="text-[hsl(var(--gold-deep))]" />
                      Coupon Code
                    </Label>
                    {appliedCoupon ? (
                      <div className="luxe-ticket mt-2">
                        <div className="flex items-center gap-2">
                          <Check size={15} className="text-[hsl(var(--gold-deep))]" />
                          <span className="text-sm font-bold text-foreground tracking-wider">{appliedCoupon.code}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            (-{appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}%` : `৳${appliedCoupon.discount_value}`})
                          </span>
                        </div>
                        <button type="button" onClick={handleRemoveCoupon} className="text-muted-foreground hover:text-destructive transition-colors">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 flex gap-2">
                        <Input
                          placeholder="Enter code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="uppercase text-sm tracking-wider rounded-xl border-border/70 focus-visible:ring-[hsl(var(--gold)/0.5)]"
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyCoupon(); } }}
                        />
                        <Button type="button" variant="outline" size="sm" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()} className="shrink-0 px-4 rounded-xl border-[hsl(var(--gold)/0.4)] hover:bg-[hsl(var(--gold-light))] hover:border-[hsl(var(--gold)/0.6)] transition-colors">
                          {couponLoading ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="gold-divider my-5" />

                  {/* Summary */}
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium tabular-nums">{formatPrice(totalPrice)}</span>
                    </div>
                    {deliveryGroups.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Delivery{isSplit ? ` (${deliveryGroups.length} shipments)` : ""}
                        </span>
                        <span className="font-medium tabular-nums">{formatPrice(deliveryFee)}</span>
                      </div>
                    )}
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-[hsl(var(--gold-deep))]">
                        <span className="font-semibold">Discount</span>
                        <span className="font-semibold tabular-nums">-{formatPrice(couponDiscount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="gold-divider my-4" />

                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{hasPreorder ? "Order Total" : "Total"}</span>
                    <span className="text-2xl sm:text-3xl font-bold text-primary tabular-nums" style={{ fontFamily: "'Lora', serif" }}>{formatPrice(grandTotal)}</span>
                  </div>

                  {hasPreorder && (
                    <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-900 font-semibold">📦 Pay Now (Advance)</span>
                        <span className="font-bold tabular-nums text-amber-900">{formatPrice(advanceDueNow)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-amber-800">
                        <span>Due on Delivery</span>
                        <span className="tabular-nums">{formatPrice(dueOnDelivery)}</span>
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="btn-luxe w-full mt-5 h-12 sm:h-13 text-sm sm:text-base" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="animate-spin mr-2" size={18} /> Processing…</>
                    ) : (
                      <>{hasPreorder ? "Place Pre-order · " : "Place Order · "}<span className="tabular-nums ml-1">{formatPrice(hasPreorder ? advanceDueNow : grandTotal)}</span></>
                    )}
                  </Button>

                  <p className="text-[11px] text-center text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
                    <ShieldCheck size={12} className="text-[hsl(var(--gold-deep))]" />
                    Secure SSL checkout · 100% safe payments
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

    </main>
  );
};

export default Checkout;
