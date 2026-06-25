import { useEffect, useState, useMemo, useRef } from "react";
import { MapPin, Check, X, Rocket, Package, Shield, Truck, ChevronDown } from "lucide-react";
import {
  useDeliveryModes,
  useDeliveryCities,
  useCategoryDeliveryModes,
  useSubcategoryDeliveryModes,
  useDeliveryExclusions,
  resolveModeForCity,
  effectiveCharge,
  isModeExcluded,
  pickFallbackMode,
} from "@/hooks/useDeliveryModes";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const ICONS: Record<string, any> = { rocket: Rocket, package: Package, shield: Shield, truck: Truck };
const STORAGE_KEY = "pikooly_delivery_city";
const THANA_STORAGE_KEY = "pikooly_delivery_thana";
const THANA_REQUIRED_KEY = "pikooly_delivery_thana_required";

interface Props {
  productId?: string;
  categoryId?: string | null;
  product?: any;
}

const DeliveryChecker = ({ productId, categoryId, product }: Props) => {
  const { data: modes = [] } = useDeliveryModes();
  const { data: cities = [] } = useDeliveryCities();
  const { data: catModes = [] } = useCategoryDeliveryModes();
  const { data: subModes = [] } = useSubcategoryDeliveryModes();
  const { data: exclusions = [] } = useDeliveryExclusions();
  const [selectedCity, setSelectedCity] = useState<string>(
    () => (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) || ""
  );
  const [selectedThana, setSelectedThana] = useState<string>(
    () => (typeof window !== "undefined" && localStorage.getItem(THANA_STORAGE_KEY)) || ""
  );
  const [districtSearch, setDistrictSearch] = useState("");
  const [thanaSearch, setThanaSearch] = useState("");
  const [districtOpen, setDistrictOpen] = useState(false);
  const [thanaOpen, setThanaOpen] = useState(false);
  const districtPanelRef = useRef<HTMLDivElement | null>(null);
  const thanaPanelRef = useRef<HTMLDivElement | null>(null);

  const activeModes = modes.filter((m) => m.is_active);
  const cityList = useMemo(
    () => Array.from(new Set(cities.map((c) => c.city_name))).sort(),
    [cities]
  );
  const thanaList = useMemo(
    () =>
      Array.from(
        new Set(
          cities
            .filter((c) => c.city_name.toLowerCase() === selectedCity.toLowerCase() && c.thana)
            .map((c) => c.thana as string)
        )
      ).sort(),
    [cities, selectedCity]
  );

  useEffect(() => {
    if (selectedCity) {
      localStorage.setItem(STORAGE_KEY, selectedCity);
      // Sync with bouquet builder + any other listeners
      localStorage.setItem("preferred_delivery_district", selectedCity);
      if (selectedThana) localStorage.setItem(THANA_STORAGE_KEY, selectedThana);
      else localStorage.removeItem(THANA_STORAGE_KEY);
      localStorage.setItem(THANA_REQUIRED_KEY, thanaList.length > 0 ? "1" : "0");
      try {
        window.dispatchEvent(new CustomEvent("delivery-district-changed", { detail: selectedCity }));
      } catch {}
    }
  }, [selectedCity, selectedThana, thanaList.length]);

  useEffect(() => {
    if (!selectedThana) return;
    if (selectedCity === "__other__" || (thanaList.length > 0 && !thanaList.includes(selectedThana))) {
      setSelectedThana("");
    }
  }, [selectedCity, selectedThana, thanaList]);

  useEffect(() => {
    if (!districtOpen) return;
    window.setTimeout(() => districtPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }, [districtOpen]);

  useEffect(() => {
    if (!thanaOpen) return;
    window.setTimeout(() => thanaPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }, [thanaOpen]);

  // Priority: per-product override > subcategory mapping > category mapping > default
  const productOverrideId: string | undefined = product?.delivery_mode_id || undefined;
  const productSubIds: string[] = useMemo(() => {
    const ids: string[] = [];
    if (product?.subcategory_id) ids.push(product.subcategory_id);
    if (Array.isArray(product?.product_subcategories)) {
      product.product_subcategories.forEach((ps: any) => {
        if (ps?.subcategory_id && !ids.includes(ps.subcategory_id)) ids.push(ps.subcategory_id);
      });
    }
    return ids;
  }, [product]);
  const subMapping = useMemo(
    () => subModes.find((sm) => productSubIds.includes(sm.subcategory_id)),
    [subModes, productSubIds]
  );
  const catMapping = useMemo(() => catModes.find((cm) => cm.category_id === categoryId), [catModes, categoryId]);
  const mapping = subMapping || catMapping;
  const productMode = useMemo(() => {
    if (productOverrideId) {
      const m = activeModes.find((a) => a.id === productOverrideId);
      if (m) return m;
    }
    if (mapping) {
      const m = activeModes.find((a) => a.id === mapping.mode_id);
      if (m) return m;
    }
    return activeModes.find((m) => m.key === "standard") || activeModes[0];
  }, [productOverrideId, mapping, activeModes]);

  const fallbackMode = useMemo(
    () => pickFallbackMode(activeModes, productMode, mapping?.fallback_mode_id),
    [activeModes, productMode, mapping]
  );

  if (!productMode) return null;

  const productModeRows = cities.filter((c) => c.mode_id === productMode.id);
  const fastCities = productModeRows.map((c) => c.city_name);

  // Step 1: city-based resolution against the primary mode's city list.
  let resolvedMode =
    resolveModeForCity(productMode, fallbackMode, selectedCity || undefined, fastCities, selectedThana, productModeRows) || productMode;

  // Step 2: per-product / per-subcategory exclusion. If the resolved (primary) mode is excluded
  // for this customer city, fall back to the safe mode.
  const effectiveProductId = productId || product?.id;
  const excluded = isModeExcluded(
    resolvedMode.id,
    exclusions,
    effectiveProductId,
    productSubIds,
    selectedCity || undefined,
    selectedThana,
    categoryId
  );
  if (excluded && fallbackMode) resolvedMode = fallbackMode;

  const fastAvailable =
    productMode.key === "fast" &&
    !!selectedCity &&
    selectedCity !== "__other__" &&
    !excluded &&
    productModeRows.some(
      (c) =>
        c.city_name.toLowerCase() === selectedCity.toLowerCase() &&
        (!selectedThana || !c.thana || c.thana.toLowerCase() === selectedThana.toLowerCase())
    );

  const Icon = ICONS[resolvedMode.icon || "truck"] || Truck;
  const areaReady = !!selectedCity && (selectedCity === "__other__" || thanaList.length === 0 || !!selectedThana);

  return (
    <div data-delivery-checker className="rounded-xl border border-border bg-muted/30 p-3 space-y-2.5 transition-shadow">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Check Delivery Availability</span>
      </div>

      <div className={`grid gap-2 ${selectedCity && selectedCity !== "__other__" && thanaList.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={districtOpen}
          onClick={() => {
            setDistrictOpen((open) => !open);
            setThanaOpen(false);
            setThanaSearch("");
          }}
          className={cn(
            "h-11 w-full justify-between bg-background px-3 text-base font-normal",
            !selectedCity && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {selectedCity === "__other__"
              ? "Other district (Bangladesh)"
              : selectedCity || "Select district"}
          </span>
          <ChevronDown className={cn("ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform", districtOpen && "rotate-180")} />
        </Button>

        {selectedCity && selectedCity !== "__other__" && thanaList.length > 0 && (
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={thanaOpen}
            onClick={() => {
              setThanaOpen((open) => !open);
              setDistrictOpen(false);
              setDistrictSearch("");
            }}
            className={cn(
              "h-11 w-full justify-between bg-background px-3 text-base font-normal",
              !selectedThana && "text-muted-foreground"
            )}
          >
            <span className="truncate">{selectedThana || "Select thana / upazila"}</span>
            <ChevronDown className={cn("ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform", thanaOpen && "rotate-180")} />
          </Button>
        )}
      </div>

      {districtOpen && (
        <div ref={districtPanelRef} className="relative z-20 scroll-mb-28 scroll-mt-24 overflow-hidden rounded-xl border border-border bg-popover shadow-sm">
          <Command>
            <CommandInput
              placeholder="Search district..."
              value={districtSearch}
              onValueChange={setDistrictSearch}
              className="h-11 text-base"
            />
            <CommandList className="max-h-56 sm:max-h-80">
              <CommandEmpty>No matches</CommandEmpty>
              <CommandGroup>
                {cityList.map((c) => (
                  <CommandItem
                    key={c}
                    value={c}
                    onSelect={() => {
                      setSelectedCity(c);
                      setSelectedThana("");
                      setDistrictOpen(false);
                      setDistrictSearch("");
                    }}
                    className="py-3 text-base"
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", selectedCity === c ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 truncate">{c}</span>
                  </CommandItem>
                ))}
                <CommandItem
                  value="Other district Bangladesh"
                  onSelect={() => {
                    setSelectedCity("__other__");
                    setSelectedThana("");
                    setDistrictOpen(false);
                    setDistrictSearch("");
                  }}
                  className="py-3 text-base"
                >
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", selectedCity === "__other__" ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0 truncate">Other district (Bangladesh)</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}

      {thanaOpen && selectedCity && selectedCity !== "__other__" && thanaList.length > 0 && (
        <div ref={thanaPanelRef} className="relative z-20 scroll-mb-28 scroll-mt-24 overflow-hidden rounded-xl border border-border bg-popover shadow-sm">
          <Command>
            <CommandInput
              placeholder="Search thana / upazila..."
              value={thanaSearch}
              onValueChange={setThanaSearch}
              className="h-11 text-base"
            />
            <CommandList className="max-h-56 sm:max-h-80">
              <CommandEmpty>No matches</CommandEmpty>
              <CommandGroup>
                {thanaList.map((thana) => (
                  <CommandItem
                    key={thana}
                    value={thana}
                    onSelect={() => {
                      setSelectedThana(thana);
                      setThanaOpen(false);
                      setThanaSearch("");
                    }}
                    className="py-3 text-base"
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", selectedThana === thana ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 truncate">{thana}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}

      {selectedCity && !areaReady && (
        <p className="rounded-lg bg-background border border-border px-3 py-2 text-xs text-muted-foreground">
          Select thana / upazila to check exact delivery availability.
        </p>
      )}

      {areaReady && (
        <div className="rounded-lg bg-background border border-border p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <p className="font-semibold text-sm">{resolvedMode.name} available</p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {resolvedMode.delivery_time}
              {selectedCity !== "__other__" && ` · ${selectedCity}`}
              {selectedThana && ` · ${selectedThana}`}
            </p>
            {resolvedMode.badge_text && (
              <p className="text-[11px] text-primary font-medium mt-1">{resolvedMode.badge_text}</p>
            )}
          </div>
          <p className="text-base font-bold text-primary tabular-nums shrink-0">
            ৳{effectiveCharge(resolvedMode, cities, selectedCity, selectedThana)}
          </p>
        </div>
      )}

      {areaReady && productMode.key === "fast" && !fastAvailable && (
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <X className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
          Fast Delivery not available in {selectedCity === "__other__" ? "this area" : selectedCity}.
          {fallbackMode ? ` ${fallbackMode.name} shown above.` : " Primary charge shown above."}
        </p>
      )}
    </div>
  );
};

export default DeliveryChecker;
