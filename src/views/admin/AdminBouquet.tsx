"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Flower2, Package, Ruler, FileText, Palette, Search, Zap, Calendar, Clock, Ban, Settings as SettingsIcon, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import PageContentEditor from "@/components/admin/PageContentEditor";
import { CloudinaryUpload } from "@/components/admin/CloudinaryUpload";
import { useState, useMemo } from "react";
import { toast } from "sonner";

type ItemType = "flowers" | "materials" | "sizes" | "colors";

interface FlowerColor {
  name: string;
  hex: string;
  image_url?: string;
}

interface FormData {
  name: string;
  image_url: string;
  price: number;
  extra_price?: number;
  description?: string;
  hex_code?: string;
  is_active: boolean;
  display_order: number;
  available_districts?: string[];
  same_day_districts?: string[];
  next_day_districts?: string[];
  // per-thana overrides, encoded as "DistrictName||ThanaName"
  available_thanas?: string[];
  same_day_thanas?: string[];
  next_day_thanas?: string[];
  colors?: FlowerColor[];
}

const defaultForm: FormData = { name: "", image_url: "", price: 0, hex_code: "#ec4899", is_active: true, display_order: 0, available_districts: [], same_day_districts: [], next_day_districts: [], available_thanas: [], same_day_thanas: [], next_day_thanas: [], colors: [] };

const thanaKey = (district: string, thana: string) => `${district}||${thana}`;

const AdminBouquet = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<ItemType | "seo" | "settings">("flowers");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [districtSearch, setDistrictSearch] = useState("");
  const [expandedDistricts, setExpandedDistricts] = useState<Record<string, boolean>>({});

  const tableName = `bouquet_${tab}` as "bouquet_flowers" | "bouquet_materials" | "bouquet_sizes" | "bouquet_colors";

  const isItemTab = (["flowers", "materials", "sizes", "colors"] as string[]).includes(tab);
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["bouquet", tab],
    queryFn: async () => {
      const { data, error } = await supabase.from(tableName).select("*").order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: isItemTab,
  });

  const { data: districts = [] } = useQuery({
    queryKey: ["shipping-districts-admin-bouquet"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_districts")
        .select("id, name")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: upazilas = [] } = useQuery({
    queryKey: ["upazilas-admin-bouquet"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("upazilas")
        .select("id, name, district_id")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as Array<{ id: string; name: string; district_id: string }>;
    },
  });

  // Group thanas by district name
  const thanasByDistrict = useMemo(() => {
    const byId: Record<string, string> = {};
    (districts as Array<{ id: string; name: string }>).forEach((d) => { byId[d.id] = d.name; });
    const map: Record<string, string[]> = {};
    upazilas.forEach((u) => {
      const dn = byId[u.district_id];
      if (!dn) return;
      (map[dn] ||= []).push(u.name);
    });
    return map;
  }, [districts, upazilas]);

  const { data: aiPreviewSetting } = useQuery({
    queryKey: ["site_setting", "bouquet_ai_preview_enabled"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "bouquet_ai_preview_enabled").maybeSingle();
      return (data?.value as any) ?? "true";
    },
  });
  const aiPreviewEnabled = String(aiPreviewSetting ?? "true") !== "false";

  const toggleAiPreview = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.from("site_settings").upsert(
        { key: "bouquet_ai_preview_enabled", value: enabled ? "true" : "false" },
        { onConflict: "key" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site_setting", "bouquet_ai_preview_enabled"] });
      qc.invalidateQueries({ queryKey: ["site_setting_public", "bouquet_ai_preview_enabled"] });
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });



  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: form.name,
        image_url: form.image_url || null,
        is_active: form.is_active,
        display_order: form.display_order,
      };
      if (tab === "sizes") {
        payload.extra_price = form.extra_price || 0;
        payload.description = form.description || null;
      } else if (tab === "colors") {
        payload.hex_code = form.hex_code || "#cccccc";
      } else {
        payload.price = form.price;
        if (tab === "flowers") {
          payload.available_districts = form.available_districts || [];
          payload.same_day_districts = form.same_day_districts || [];
          payload.next_day_districts = form.next_day_districts || [];
          payload.available_thanas = form.available_thanas || [];
          payload.same_day_thanas = form.same_day_thanas || [];
          payload.next_day_thanas = form.next_day_thanas || [];
          payload.colors = (form.colors || []).filter((c) => c.name && c.hex);
        }
      }

      if (editId) {
        const { error } = await supabase.from(tableName).update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(tableName).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Updated!" : "Created!");
      qc.invalidateQueries({ queryKey: ["bouquet", tab] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted!");
      qc.invalidateQueries({ queryKey: ["bouquet", tab] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => { setForm(defaultForm); setEditId(null); };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      image_url: item.image_url || "",
      price: item.price || 0,
      extra_price: item.extra_price || 0,
      description: item.description || "",
      hex_code: item.hex_code || "#ec4899",
      is_active: item.is_active,
      display_order: item.display_order,
      available_districts: item.available_districts || [],
      same_day_districts: item.same_day_districts || [],
      next_day_districts: item.next_day_districts || [],
      available_thanas: item.available_thanas || [],
      same_day_thanas: item.same_day_thanas || [],
      next_day_thanas: item.next_day_thanas || [],
      colors: Array.isArray(item.colors) ? item.colors : [],
    });
    setDialogOpen(true);
  };

  type SpeedTier = "off" | "same_day" | "next_day" | "available";
  // Compute current tier for a district based on the 3 arrays
  const getDistrictTier = (name: string): SpeedTier => {
    if ((form.same_day_districts || []).includes(name)) return "same_day";
    if ((form.next_day_districts || []).includes(name)) return "next_day";
    if ((form.available_districts || []).includes(name)) return "available";
    return "off";
  };
  // Set a district to exactly one tier (mutually exclusive)
  const setDistrictTier = (name: string, tier: SpeedTier) => {
    const strip = (arr: string[] = []) => arr.filter((d) => d !== name);
    const next: FormData = {
      ...form,
      same_day_districts: strip(form.same_day_districts),
      next_day_districts: strip(form.next_day_districts),
      available_districts: strip(form.available_districts),
    };
    if (tier === "same_day") next.same_day_districts = [...(next.same_day_districts || []), name];
    else if (tier === "next_day") next.next_day_districts = [...(next.next_day_districts || []), name];
    else if (tier === "available") next.available_districts = [...(next.available_districts || []), name];
    setForm(next);
  };
  // Bulk: set ALL visible (filtered) districts to one tier at once
  const bulkSetTier = (names: string[], tier: SpeedTier) => {
    const stripSet = new Set(names);
    const strip = (arr: string[] = []) => arr.filter((d) => !stripSet.has(d));
    const next: FormData = {
      ...form,
      same_day_districts: strip(form.same_day_districts),
      next_day_districts: strip(form.next_day_districts),
      available_districts: strip(form.available_districts),
    };
    if (tier === "same_day") next.same_day_districts = [...(next.same_day_districts || []), ...names];
    else if (tier === "next_day") next.next_day_districts = [...(next.next_day_districts || []), ...names];
    else if (tier === "available") next.available_districts = [...(next.available_districts || []), ...names];
    setForm(next);
  };

  // ===== Thana-level helpers =====
  const getThanaTier = (district: string, thana: string): SpeedTier => {
    const key = thanaKey(district, thana);
    if ((form.same_day_thanas || []).includes(key)) return "same_day";
    if ((form.next_day_thanas || []).includes(key)) return "next_day";
    if ((form.available_thanas || []).includes(key)) return "available";
    return "off";
  };
  const setThanaTier = (district: string, thana: string, tier: SpeedTier) => {
    const key = thanaKey(district, thana);
    const strip = (arr: string[] = []) => arr.filter((k) => k !== key);
    const next: FormData = {
      ...form,
      same_day_thanas: strip(form.same_day_thanas),
      next_day_thanas: strip(form.next_day_thanas),
      available_thanas: strip(form.available_thanas),
    };
    if (tier === "same_day") next.same_day_thanas = [...(next.same_day_thanas || []), key];
    else if (tier === "next_day") next.next_day_thanas = [...(next.next_day_thanas || []), key];
    else if (tier === "available") next.available_thanas = [...(next.available_thanas || []), key];
    setForm(next);
  };
  const bulkSetThanaTier = (district: string, thanas: string[], tier: SpeedTier) => {
    const keys = new Set(thanas.map((t) => thanaKey(district, t)));
    const strip = (arr: string[] = []) => arr.filter((k) => !keys.has(k));
    const next: FormData = {
      ...form,
      same_day_thanas: strip(form.same_day_thanas),
      next_day_thanas: strip(form.next_day_thanas),
      available_thanas: strip(form.available_thanas),
    };
    const newKeys = Array.from(keys);
    if (tier === "same_day") next.same_day_thanas = [...(next.same_day_thanas || []), ...newKeys];
    else if (tier === "next_day") next.next_day_thanas = [...(next.next_day_thanas || []), ...newKeys];
    else if (tier === "available") next.available_thanas = [...(next.available_thanas || []), ...newKeys];
    setForm(next);
  };

  const tabLabels: Record<ItemType, string> = { flowers: "Flowers", materials: "Materials", sizes: "Sizes", colors: "Colors" };
  const tabIcons: Record<ItemType, any> = { flowers: Flower2, materials: Package, sizes: Ruler, colors: Palette };

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Custom Bouquet Builder</h1>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className={isItemTab ? "" : "hidden"}><Plus className="h-4 w-4 mr-2" />Add {(tabLabels[tab as ItemType] ?? "Item").slice(0, -1)}</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit" : "Add"} {(tabLabels[tab as ItemType] ?? "Item").slice(0, -1)}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Image</Label>
                  <CloudinaryUpload
                    value={form.image_url}
                    onChange={(url) => setForm({ ...form, image_url: url })}
                    folder={`bouquet-${tab}`}
                    label="Upload Image"
                  />
                </div>
                {tab === "sizes" ? (
                  <>
                    <div>
                      <Label>Extra Price (৳)</Label>
                      <Input type="number" value={form.extra_price || 0} onChange={(e) => setForm({ ...form, extra_price: +e.target.value })} />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                  </>
                ) : tab === "colors" ? (
                  <div>
                    <Label>Color (Hex)</Label>
                    <div className="flex items-center gap-2 border border-border rounded-md h-10 px-2 bg-background">
                      <input
                        type="color"
                        value={form.hex_code || "#ec4899"}
                        onChange={(e) => setForm({ ...form, hex_code: e.target.value })}
                        className="h-7 w-9 rounded cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <Input
                        value={form.hex_code || ""}
                        onChange={(e) => setForm({ ...form, hex_code: e.target.value })}
                        className="border-0 px-1 text-sm h-8 focus-visible:ring-0"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label>Price (৳)</Label>
                    <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} />
                  </div>
                )}
                {tab === "flowers" && (
                  <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/20">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">Delivery availability per district</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary ring-1 ring-primary/20">
                          {districts.length} districts
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900">
                          {upazilas.length} thanas
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Set one speed per district. <strong>Off</strong> = not available. Customer's chosen district decides what shows up.
                      </p>
                    </div>


                    {/* Search */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search districts..."
                          value={districtSearch}
                          onChange={(e) => setDistrictSearch(e.target.value)}
                          className="pl-8 h-9 text-sm"
                        />
                      </div>
                    </div>

                    {(() => {
                      const filtered = districts.filter((d: any) =>
                        !districtSearch || d.name.toLowerCase().includes(districtSearch.toLowerCase())
                      );
                      const filteredNames = filtered.map((d: any) => d.name);
                      return (
                        <>
                          <div className="flex flex-wrap gap-1.5 items-center text-[11px]">
                            <span className="text-muted-foreground mr-1">
                              Set {districtSearch ? `${filtered.length} visible` : "ALL"}:
                            </span>
                            <button type="button" onClick={() => bulkSetTier(filteredNames, "same_day")}
                              className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">Same-Day</button>
                            <button type="button" onClick={() => bulkSetTier(filteredNames, "next_day")}
                              className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 font-semibold">Next-Day</button>
                            <button type="button" onClick={() => bulkSetTier(filteredNames, "available")}
                              className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 font-semibold">2-3 Days</button>
                            <button type="button" onClick={() => bulkSetTier(filteredNames, "off")}
                              className="px-2 py-0.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 font-semibold">Off</button>
                          </div>

                          <div className="max-h-72 overflow-y-auto border border-border rounded-md bg-background divide-y divide-border">
                            {filtered.length === 0 ? (
                              <p className="text-xs text-muted-foreground p-3">No districts match.</p>
                            ) : (
                              filtered.map((d: any) => {
                                const tier = getDistrictTier(d.name);
                                const opts: Array<{ key: SpeedTier; label: string; cls: string; activeCls: string; Icon: any }> = [
                                  { key: "off", label: "Off", Icon: Ban, cls: "text-muted-foreground hover:bg-muted", activeCls: "bg-destructive/15 text-destructive ring-1 ring-destructive/40" },
                                  { key: "same_day", label: "Same", Icon: Zap, cls: "text-muted-foreground hover:bg-emerald-50 dark:hover:bg-emerald-950", activeCls: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900 dark:text-emerald-200" },
                                  { key: "next_day", label: "Next", Icon: Calendar, cls: "text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-950", activeCls: "bg-blue-100 text-blue-700 ring-1 ring-blue-300 dark:bg-blue-900 dark:text-blue-200" },
                                  { key: "available", label: "2-3d", Icon: Clock, cls: "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800", activeCls: "bg-slate-200 text-slate-700 ring-1 ring-slate-400 dark:bg-slate-700 dark:text-slate-200" },
                                ];
                                const thanas = thanasByDistrict[d.name] || [];
                                const isExpanded = !!expandedDistricts[d.name];
                                const thanaCount = thanas.length;
                                return (
                                  <div key={d.id}>
                                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                                      <button
                                        type="button"
                                        onClick={() => thanaCount > 0 && setExpandedDistricts((s) => ({ ...s, [d.name]: !s[d.name] }))}
                                        className="flex items-center gap-1.5 text-xs font-medium text-foreground truncate flex-1 text-left disabled:cursor-default"
                                        disabled={thanaCount === 0}
                                      >
                                        {thanaCount > 0 ? (
                                          isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                        ) : (
                                          <span className="w-3.5" />
                                        )}
                                        <span className="truncate">{d.name}</span>
                                      </button>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {opts.map((o) => {
                                          const active = tier === o.key;
                                          return (
                                            <button
                                              key={o.key}
                                              type="button"
                                              onClick={() => setDistrictTier(d.name, o.key)}
                                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md transition-colors ${active ? o.activeCls : o.cls}`}
                                              title={o.label}
                                            >
                                              <o.Icon className="h-3 w-3" />
                                              <span className="hidden sm:inline">{o.label}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    {isExpanded && thanaCount > 0 && (
                                      <div className="bg-muted/30 border-t border-border">
                                        <div className="flex flex-wrap gap-1.5 items-center text-[10px] px-3 py-1.5 border-b border-border/60">
                                          <span className="text-muted-foreground mr-1">Set all thanas:</span>
                                          {opts.slice(1).map((o) => (
                                            <button
                                              key={o.key}
                                              type="button"
                                              onClick={() => bulkSetThanaTier(d.name, thanas, o.key)}
                                              className={`px-2 py-0.5 rounded-md font-semibold ${o.activeCls}`}
                                            >
                                              {o.label}
                                            </button>
                                          ))}
                                          <button
                                            type="button"
                                            onClick={() => bulkSetThanaTier(d.name, thanas, "off")}
                                            className="px-2 py-0.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 font-semibold"
                                          >
                                            Off
                                          </button>
                                        </div>
                                        <div className="divide-y divide-border/60">
                                          {thanas.map((t) => {
                                            const ttier = getThanaTier(d.name, t);
                                            return (
                                              <div key={t} className="flex items-center justify-between gap-2 pl-7 pr-2.5 py-1">
                                                <span className="text-[11px] text-foreground/80 truncate flex-1">{t}</span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                  {opts.map((o) => {
                                                    const active = ttier === o.key;
                                                    return (
                                                      <button
                                                        key={o.key}
                                                        type="button"
                                                        onClick={() => setThanaTier(d.name, t, o.key)}
                                                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition-colors ${active ? o.activeCls : o.cls}`}
                                                        title={o.label}
                                                      >
                                                        <o.Icon className="h-2.5 w-2.5" />
                                                        <span className="hidden md:inline">{o.label}</span>
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
                {tab === "flowers" && (
                  <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Color Variants</p>
                        <p className="text-[11px] text-muted-foreground">Same flower in different colors (e.g. Red Rose, White Rose). Customers can pick a color.</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setForm({
                            ...form,
                            colors: [...(form.colors || []), { name: "", hex: "#ec4899", image_url: "" }],
                          })
                        }
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Color
                      </Button>
                    </div>
                    {(form.colors || []).length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No color variants. Add one to let customers pick.</p>
                    )}
                    <div className="space-y-2">
                      {(form.colors || []).map((c, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-md border border-border bg-background p-2">
                          <div className="flex flex-col items-center gap-1.5 shrink-0">
                            <input
                              type="color"
                              value={c.hex || "#ec4899"}
                              onChange={(e) => {
                                const next = [...(form.colors || [])];
                                next[i] = { ...next[i], hex: e.target.value };
                                setForm({ ...form, colors: next });
                              }}
                              className="h-9 w-9 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                            />
                            {c.image_url ? (
                              <img src={c.image_url} alt="" className="h-9 w-9 rounded object-cover border" />
                            ) : null}
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <Input
                              placeholder="Color name (e.g. Red, White)"
                              value={c.name}
                              onChange={(e) => {
                                const next = [...(form.colors || [])];
                                next[i] = { ...next[i], name: e.target.value };
                                setForm({ ...form, colors: next });
                              }}
                              className="h-8 text-sm"
                            />
                            <CloudinaryUpload
                              value={c.image_url || ""}
                              onChange={(url) => {
                                const next = [...(form.colors || [])];
                                next[i] = { ...next[i], image_url: url };
                                setForm({ ...form, colors: next });
                              }}
                              folder="bouquet-flower-colors"
                              label="Variant image (optional)"
                            />
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="text-destructive shrink-0"
                            onClick={() => {
                              const next = (form.colors || []).filter((_, idx) => idx !== i);
                              setForm({ ...form, colors: next });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label>Display Order</Label>
                  <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: +e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending} className="w-full">
                  {saveMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <div className="overflow-x-auto -mx-1 px-1 mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <TabsList className="inline-flex w-max">
              {(["flowers", "materials", "sizes", "colors"] as ItemType[]).map((t) => {
                const Icon = tabIcons[t];
                return (
                  <TabsTrigger key={t} value={t} className="gap-1.5 whitespace-nowrap">
                    <Icon className="h-4 w-4" />{tabLabels[t]}
                  </TabsTrigger>
                );
              })}
              <TabsTrigger value="seo" className="gap-1.5 whitespace-nowrap">
                <FileText className="h-4 w-4" />Page SEO
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5 whitespace-nowrap">
                <SettingsIcon className="h-4 w-4" />Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {(["flowers", "materials", "sizes", "colors"] as ItemType[]).map((t) => (
            <TabsContent key={t} value={t}>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t === "colors" ? "Swatch" : "Image"}</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>{t === "sizes" ? "Extra Price" : t === "colors" ? "Hex" : "Price"}</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : items.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No items yet</TableCell></TableRow>
                    ) : (
                      items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {t === "colors" ? (
                              <span
                                className="inline-block w-10 h-10 rounded-full border-2 border-border shadow-sm"
                                style={{ backgroundColor: item.hex_code || "#cccccc" }}
                              />
                            ) : item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">No img</div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            {t === "sizes" ? `৳${item.extra_price}` : t === "colors" ? <code className="text-xs">{item.hex_code}</code> : `৳${item.price}`}
                          </TableCell>
                          <TableCell>{item.display_order}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {item.is_active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(item.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}

          <TabsContent value="seo">
            <PageContentEditor prefix="bouquet" title="Custom Bouquet" />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-4 max-w-2xl">
              <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">AI Bouquet Preview</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Allow customers to generate an AI preview of their custom bouquet on the design step.
                        </p>
                      </div>
                      <Switch
                        checked={aiPreviewEnabled}
                        disabled={toggleAiPreview.isPending}
                        onCheckedChange={(v) => toggleAiPreview.mutate(v)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Status: <span className={`font-medium ${aiPreviewEnabled ? "text-green-600" : "text-red-600"}`}>
                        {aiPreviewEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default AdminBouquet;
