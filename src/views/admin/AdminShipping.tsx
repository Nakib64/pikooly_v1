import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { useToast } from "@/hooks/use-toast";
import { Rocket, Package, Shield, Save, Plus, X, Truck, Flower2, ChevronRight } from "lucide-react";
import { DistrictThanaCombobox } from "@/components/admin/DistrictThanaCombobox";
import { DeliveryCoverageBulkManager } from "@/components/admin/DeliveryCoverageBulkManager";
import {
  useDeliveryModes,
  useDeliveryCities,
  useCategoryDeliveryModes,
  useSubcategoryDeliveryModes,
  type DeliveryMode,
} from "@/hooks/useDeliveryModes";

const ICONS: Record<string, any> = { rocket: Rocket, package: Package, shield: Shield, truck: Truck };

const AdminShipping = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: modes = [] } = useDeliveryModes();
  const { data: cities = [] } = useDeliveryCities();
  const { data: catModes = [] } = useCategoryDeliveryModes();
  const { data: subModes = [] } = useSubcategoryDeliveryModes();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-for-delivery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories-for-delivery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcategories")
        .select("id, name, category_id, categories(name)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const [drafts, setDrafts] = useState<Record<string, Partial<DeliveryMode>>>({});
  useEffect(() => {
    const seed: Record<string, Partial<DeliveryMode>> = {};
    modes.forEach((m) => (seed[m.id] = { ...m }));
    setDrafts(seed);
  }, [modes]);

  const [newCity, setNewCity] = useState<Record<string, { name: string; thana: string; charge: string }>>({});
  const [cityDrafts, setCityDrafts] = useState<Record<string, { thana: string; charge: string }>>({});

  const updateMode = async (id: string) => {
    const d = drafts[id];
    if (!d) return;
    const { error } = await supabase
      .from("delivery_modes")
      .update({
        name: d.name,
        delivery_time: d.delivery_time,
        badge_text: d.badge_text,
        flat_charge: Number(d.flat_charge ?? 0),
        min_charge: Number(d.min_charge ?? 0),
        max_charge: Number(d.max_charge ?? 0),
        is_active: d.is_active,
      })
      .eq("id", id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Saved" });
      qc.invalidateQueries({ queryKey: ["delivery-modes"] });
    }
  };

  const addCity = async (modeId: string) => {
    const draft = newCity[modeId] || { name: "", thana: "", charge: "" };
    const name = draft.name.trim();
    if (!name) return;
    const thana = draft.thana.trim() || null;
    const chargeOverride = draft.charge.trim() === "" ? null : Number(draft.charge);
    let existingQuery = supabase
      .from("delivery_mode_cities")
      .select("id")
      .eq("mode_id", modeId)
      .eq("city_name", name);
    existingQuery = thana ? existingQuery.eq("thana", thana) : existingQuery.is("thana", null);

    const { data: existing, error: lookupError } = await existingQuery.maybeSingle();
    if (lookupError) {
      toast({ title: "Add failed", description: lookupError.message, variant: "destructive" });
      return;
    }

    const { error } = existing?.id
      ? await supabase.from("delivery_mode_cities").update({ charge_override: chargeOverride }).eq("id", existing.id)
      : await supabase.from("delivery_mode_cities").insert({ mode_id: modeId, city_name: name, thana, charge_override: chargeOverride });
    if (error) toast({ title: "Add failed", description: error.message, variant: "destructive" });
    else {
      setNewCity((p) => ({ ...p, [modeId]: { name: "", thana: "", charge: "" } }));
      qc.invalidateQueries({ queryKey: ["delivery-mode-cities"] });
      toast({ title: "Charge override saved" });
    }
  };

  const saveCity = async (cityId: string) => {
    const d = cityDrafts[cityId];
    if (!d) return;
    const payload: any = {
      thana: d.thana.trim() || null,
      charge_override: d.charge.trim() === "" ? null : Number(d.charge),
    };
    const { error } = await supabase.from("delivery_mode_cities").update(payload).eq("id", cityId);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "City updated" });
      qc.invalidateQueries({ queryKey: ["delivery-mode-cities"] });
    }
  };

  const removeCity = async (id: string) => {
    await supabase.from("delivery_mode_cities").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["delivery-mode-cities"] });
  };

  const assignCategory = async (categoryId: string, modeId: string, fallbackModeId?: string | null) => {
    const existing = catModes.find((c) => c.category_id === categoryId);
    const payload: any = { mode_id: modeId };
    if (fallbackModeId !== undefined) payload.fallback_mode_id = fallbackModeId;
    if (existing) {
      await supabase.from("category_delivery_modes").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("category_delivery_modes").insert({ category_id: categoryId, ...payload });
    }
    qc.invalidateQueries({ queryKey: ["category-delivery-modes"] });
    toast({ title: "Updated" });
  };

  const assignSubcategory = async (subcategoryId: string, modeId: string | null, fallbackModeId?: string | null) => {
    const existing = subModes.find((s) => s.subcategory_id === subcategoryId);
    if (modeId === null) {
      if (existing) {
        await (supabase.from("subcategory_delivery_modes" as any) as any).delete().eq("id", existing.id);
      }
    } else {
      const payload: any = { mode_id: modeId };
      if (fallbackModeId !== undefined) payload.fallback_mode_id = fallbackModeId;
      if (existing) {
        await (supabase.from("subcategory_delivery_modes" as any) as any).update(payload).eq("id", existing.id);
      } else {
        await (supabase.from("subcategory_delivery_modes" as any) as any).insert({ subcategory_id: subcategoryId, ...payload });
      }
    }
    qc.invalidateQueries({ queryKey: ["subcategory-delivery-modes"] });
    toast({ title: "Updated" });
  };

  const citiesByMode = useMemo(() => {
    const m: Record<string, typeof cities> = {};
    cities.forEach((c) => {
      (m[c.mode_id] ||= [] as any).push(c);
    });
    return m;
  }, [cities]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Delivery & Shipping</h1>
        <p className="text-sm text-muted-foreground">
          Manage your 3 delivery modes, cities, and category assignments.
        </p>
      </div>

      {/* DELIVERY MODES */}
      <Accordion type="multiple" className="space-y-3">
        {modes.map((m) => {
          const Icon = ICONS[m.icon || "truck"] || Truck;
          const d = drafts[m.id] || {};
          const modeCities = citiesByMode[m.id] || [];

          // Group cities by district name
          const grouped: Record<string, typeof modeCities> = {};
          modeCities.forEach((c) => {
            (grouped[c.city_name] ||= [] as any).push(c);
          });
          const districtNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

          return (
            <AccordionItem key={m.id} value={m.id} className="border rounded-lg overflow-hidden bg-card">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{m.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {modeCities.length} entries · {d.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-end gap-2">
                    <Label className="text-xs text-muted-foreground">Active</Label>
                    <Switch
                      checked={!!d.is_active}
                      onCheckedChange={(v) => setDrafts((p) => ({ ...p, [m.id]: { ...p[m.id], is_active: v } }))}
                    />
                  </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Display name</Label>
                    <Input
                      value={d.name || ""}
                      onChange={(e) => setDrafts((p) => ({ ...p, [m.id]: { ...p[m.id], name: e.target.value } }))}
                      style={{ fontSize: 16 }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Delivery time text</Label>
                    <Input
                      value={d.delivery_time || ""}
                      placeholder="e.g. 2-3 Hours"
                      onChange={(e) =>
                        setDrafts((p) => ({ ...p, [m.id]: { ...p[m.id], delivery_time: e.target.value } }))
                      }
                      style={{ fontSize: 16 }}
                    />
                  </div>
                  {m.charge_type === "flat" ? (
                    <div>
                      <Label className="text-xs">Flat charge (৳)</Label>
                      <Input
                        type="number"
                        value={d.flat_charge ?? 0}
                        onChange={(e) =>
                          setDrafts((p) => ({ ...p, [m.id]: { ...p[m.id], flat_charge: Number(e.target.value) } }))
                        }
                        style={{ fontSize: 16 }}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                      <div>
                        <Label className="text-xs">Min charge (৳)</Label>
                        <Input
                          type="number"
                          value={d.min_charge ?? 0}
                          onChange={(e) =>
                            setDrafts((p) => ({ ...p, [m.id]: { ...p[m.id], min_charge: Number(e.target.value) } }))
                          }
                          style={{ fontSize: 16 }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Max charge (৳)</Label>
                        <Input
                          type="number"
                          value={d.max_charge ?? 0}
                          onChange={(e) =>
                            setDrafts((p) => ({ ...p, [m.id]: { ...p[m.id], max_charge: Number(e.target.value) } }))
                          }
                          style={{ fontSize: 16 }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Badge text (optional)</Label>
                    <Input
                      value={d.badge_text || ""}
                      placeholder="e.g. Protected Packaging Included"
                      onChange={(e) =>
                        setDrafts((p) => ({ ...p, [m.id]: { ...p[m.id], badge_text: e.target.value } }))
                      }
                      style={{ fontSize: 16 }}
                    />
                  </div>
                </div>

                {/* BULK WHITELIST COVERAGE */}
                <DeliveryCoverageBulkManager modeId={m.id} modeName={d.name || m.name} rows={modeCities} />

                {/* Per-city charge overrides */}
                <div className="rounded-lg border p-3 bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Charge overrides (optional)</Label>
                    <span className="text-xs text-muted-foreground">
                      {districtNames.length} districts · {modeCities.length} entries
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground -mt-1">
                    Set a custom delivery fee for specific districts/upazilas. Leave empty to use the mode's default charge above.
                  </p>


                  <div className="space-y-1.5">
                    {districtNames.map((district) => {
                      const rows = grouped[district];
                      return (
                        <details key={district} className="group bg-background rounded-md border">
                          <summary className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer list-none select-none">
                            <div className="flex items-center gap-2 min-w-0">
                              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90 shrink-0" />
                              <span className="text-sm font-medium truncate">{district}</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {rows.length} {rows.length === 1 ? "entry" : "entries"}
                            </span>
                          </summary>
                          <div className="border-t p-2 space-y-2">
                            {rows.map((c) => {
                              const draft = cityDrafts[c.id] ?? {
                                thana: c.thana || "",
                                charge: c.charge_override != null ? String(c.charge_override) : "",
                              };
                              return (
                                <div
                                  key={c.id}
                                  className="grid grid-cols-[1fr_100px_auto_auto] gap-2 items-center"
                                >
                                  <DistrictThanaCombobox
                                    value={draft.thana}
                                    onChange={(v) =>
                                      setCityDrafts((p) => ({ ...p, [c.id]: { ...draft, thana: v } }))
                                    }
                                    district={c.city_name}
                                    placeholder="Thana (optional)"
                                  />
                                  <Input
                                    type="number"
                                    placeholder="৳"
                                    value={draft.charge}
                                    onChange={(e) =>
                                      setCityDrafts((p) => ({ ...p, [c.id]: { ...draft, charge: e.target.value } }))
                                    }
                                    className="h-9"
                                    style={{ fontSize: 16 }}
                                  />
                                  <Button size="sm" variant="outline" onClick={() => saveCity(c.id)} className="h-9">
                                    <Save className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeCity(c.id)}
                                    className="h-9 text-destructive hover:text-destructive"
                                    aria-label={`Remove ${c.city_name} ${c.thana || ""}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      );
                    })}
                    {modeCities.length === 0 && (
                      <p className="text-xs text-muted-foreground">No cities yet — add below.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_100px_auto] gap-2 pt-2 border-t">
                    <DistrictThanaCombobox
                      value={newCity[m.id]?.name || ""}
                      onChange={(v) =>
                        setNewCity((p) => ({
                          ...p,
                          [m.id]: { name: v, thana: "", charge: p[m.id]?.charge || "" },
                        }))
                      }
                      placeholder="District / City"
                    />
                    <DistrictThanaCombobox
                      value={newCity[m.id]?.thana || ""}
                      onChange={(v) =>
                        setNewCity((p) => ({
                          ...p,
                          [m.id]: { name: p[m.id]?.name || "", thana: v, charge: p[m.id]?.charge || "" },
                        }))
                      }
                      district={newCity[m.id]?.name || ""}
                      placeholder="Thana / Upazila (optional)"
                    />
                    <Input
                      type="number"
                      placeholder="৳ override"
                      value={(newCity[m.id]?.charge) || ""}
                      onChange={(e) =>
                        setNewCity((p) => ({
                          ...p,
                          [m.id]: { name: p[m.id]?.name || "", thana: p[m.id]?.thana || "", charge: e.target.value },
                        }))
                      }
                      className="h-9"
                      style={{ fontSize: 16 }}
                    />
                    <Button size="sm" onClick={() => addCity(m.id)} className="h-9">
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>


                <Button onClick={() => updateMode(m.id)} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" /> Save changes
                </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>


      {/* CATEGORY ASSIGNMENT */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category → Delivery Mode</CardTitle>
          <p className="text-xs text-muted-foreground">
            <strong>Primary</strong> applies when the customer's city qualifies (e.g. Fast Delivery cities).
            <strong> Fallback</strong> auto-applies for cities outside that list. Leave Fallback empty to always use Primary.
          </p>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {([
              ...categories.map((c: any) => ({ id: c.id, name: c.name, isVirtual: false })),
              { id: "00000000-0000-0000-0000-0000000b0001", name: "Custom Bouquet", isVirtual: true },
            ]).map((c: any) => {
              const row = catModes.find((cm) => cm.category_id === c.id);
              const current = row?.mode_id || "";
              const fallback = row?.fallback_mode_id || "";
              return (
                <div key={c.id} className="py-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] items-center gap-3">
                  <span className="text-sm font-medium flex items-center gap-2">
                    {c.isVirtual && <Flower2 className="h-4 w-4 text-primary" />}
                    {c.name}
                    {c.isVirtual && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">(builder)</span>}
                  </span>
                  <div className="w-full sm:w-44">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Primary</Label>
                    <Select
                      value={current || "none"}
                      onValueChange={(v) => v !== "none" && assignCategory(c.id, v, fallback || null)}
                    >
                      <SelectTrigger style={{ fontSize: 16 }} className="h-9">
                        <SelectValue placeholder="— select —" />
                      </SelectTrigger>
                      <SelectContent>
                        {modes.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full sm:w-44">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Fallback (other cities)</Label>
                    <Select
                      value={fallback || "none"}
                      onValueChange={(v) => current && assignCategory(c.id, current, v === "none" ? null : v)}
                      disabled={!current}
                    >
                      <SelectTrigger style={{ fontSize: 16 }} className="h-9">
                        <SelectValue placeholder="— none —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None (use Primary) —</SelectItem>
                        {modes.filter((m) => m.id !== current).map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* SUBCATEGORY ASSIGNMENT */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Subcategory → Delivery Mode</CardTitle>
          <p className="text-xs text-muted-foreground">
            Overrides the parent category mapping. Leave a row as <strong>— Inherit from category —</strong> to use the category default.
            Per-product override (set on the Product edit page) still wins over this.
          </p>
        </CardHeader>
        <CardContent>
          {(() => {
            const grouped: Record<string, { catName: string; subs: any[] }> = {};
            (subcategories as any[]).forEach((s: any) => {
              const catName = s.categories?.name || "Uncategorized";
              if (!grouped[s.category_id]) grouped[s.category_id] = { catName, subs: [] };
              grouped[s.category_id].subs.push(s);
            });
            const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) => a.catName.localeCompare(b.catName));
            if (sortedGroups.length === 0) {
              return <p className="text-sm text-muted-foreground">No subcategories found.</p>;
            }
            return (
              <Accordion type="multiple" className="w-full">
                {sortedGroups.map(([catId, { catName, subs }]) => (
                  <AccordionItem key={catId} value={catId}>
                    <AccordionTrigger className="hover:no-underline">
                      <span className="text-sm font-medium">
                        {catName} <span className="text-muted-foreground">({subs.length})</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="divide-y">
                        {subs.map((s: any) => {
                          const row = subModes.find((sm) => sm.subcategory_id === s.id);
                          const current = row?.mode_id || "";
                          const fallback = row?.fallback_mode_id || "";
                          return (
                            <div key={s.id} className="py-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] items-center gap-3">
                              <span className="text-sm">{s.name}</span>
                              <div className="w-full sm:w-44">
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Primary</Label>
                                <Select
                                  value={current || "__inherit__"}
                                  onValueChange={(v) =>
                                    v === "__inherit__"
                                      ? assignSubcategory(s.id, null)
                                      : assignSubcategory(s.id, v, fallback || null)
                                  }
                                >
                                  <SelectTrigger style={{ fontSize: 16 }} className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__inherit__">— Inherit from category —</SelectItem>
                                    {modes.map((m) => (
                                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-full sm:w-44">
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Fallback (other cities)</Label>
                                <Select
                                  value={fallback || "none"}
                                  onValueChange={(v) =>
                                    current && assignSubcategory(s.id, current, v === "none" ? null : v)
                                  }
                                  disabled={!current}
                                >
                                  <SelectTrigger style={{ fontSize: 16 }} className="h-9">
                                    <SelectValue placeholder="— none —" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">— None (use Primary) —</SelectItem>
                                    {modes.filter((m) => m.id !== current).map((m) => (
                                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            );
          })()}
        </CardContent>
      </Card>

    </div>
  );
};

export default AdminShipping;
