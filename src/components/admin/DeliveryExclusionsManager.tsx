import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Ban, ChevronRight, Search, MapPin, Save } from "lucide-react";
import { useDeliveryModes } from "@/hooks/useDeliveryModes";
import { BD_DISTRICTS_THANAS } from "@/data/bdDistrictsThanas";
import { cn } from "@/lib/utils";

interface ExclusionRow {
  id: string;
  mode_id: string;
  scope: "product" | "subcategory" | "category";
  scope_id: string;
  city_name: string;
  thana: string | null;
}

interface Props {
  scope: "product" | "subcategory" | "category";
  scopeId?: string | null;
}

type Sel = { whole: boolean; thanas: Set<string> };

const sameText = (a?: string | null, b?: string | null) =>
  (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

/**
 * Tree-style picker: block individual thanas or whole districts for a delivery mode.
 * UI mirrors the "Bulk coverage" pattern (expandable districts + thana checkboxes).
 */
const DeliveryExclusionsManager = ({ scope, scopeId }: Props) => {
  const { data: modes = [] } = useDeliveryModes();
  const activeModes = useMemo(() => modes.filter((m) => m.is_active), [modes]);

  const [rows, setRows] = useState<ExclusionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modeId, setModeId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<Map<string, Sel>>(new Map()); // key = district

  const cityList = useMemo(() => Object.keys(BD_DISTRICTS_THANAS).sort(), []);
  const totalDistricts = cityList.length;
  const totalThanas = useMemo(
    () => cityList.reduce((n, d) => n + (BD_DISTRICTS_THANAS[d]?.length || 0), 0),
    [cityList]
  );

  const load = async () => {
    if (!scopeId) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("delivery_mode_exclusions" as any)
      .select("*")
      .eq("scope", scope)
      .eq("scope_id", scopeId);
    setLoading(false);
    if (error) {
      toast({ title: "Failed to load exclusions", description: error.message, variant: "destructive" });
      return;
    }
    setRows((data || []) as unknown as ExclusionRow[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, scopeId]);

  // Hydrate selection from rows whenever mode or rows change
  useEffect(() => {
    if (!modeId) {
      setSelection(new Map());
      return;
    }
    const next = new Map<string, Sel>();
    rows
      .filter((r) => r.mode_id === modeId)
      .forEach((r) => {
        // Resolve canonical district key
        const key = cityList.find((d) => sameText(d, r.city_name)) || r.city_name;
        const cur = next.get(key) || { whole: false, thanas: new Set<string>() };
        if (!r.thana) cur.whole = true;
        else cur.thanas.add(r.thana);
        next.set(key, cur);
      });
    setSelection(next);
  }, [modeId, rows, cityList]);

  const filteredDistricts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cityList;
    return cityList.filter((d) => {
      if (d.toLowerCase().includes(q)) return true;
      return (BD_DISTRICTS_THANAS[d] || []).some((t) => t.toLowerCase().includes(q));
    });
  }, [cityList, search]);

  // Auto-expand any district matched on a thana name
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) return;
    const ex = new Set(expanded);
    filteredDistricts.forEach((d) => {
      if ((BD_DISTRICTS_THANAS[d] || []).some((t) => t.toLowerCase().includes(q))) ex.add(d);
    });
    setExpanded(ex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const getSel = (d: string): Sel =>
    selection.get(d) || { whole: false, thanas: new Set<string>() };

  const districtState = (d: string): "all" | "some" | "none" => {
    const s = getSel(d);
    const total = BD_DISTRICTS_THANAS[d]?.length || 0;
    if (s.whole || s.thanas.size === total) return total > 0 ? "all" : "none";
    if (s.thanas.size > 0) return "some";
    return "none";
  };

  const toggleDistrict = (d: string) => {
    const next = new Map(selection);
    const state = districtState(d);
    if (state === "all") next.delete(d);
    else next.set(d, { whole: true, thanas: new Set<string>() });
    setSelection(next);
  };

  const toggleThana = (d: string, t: string) => {
    const next = new Map(selection);
    const cur = getSel(d);
    const thanas = new Set(cur.thanas);
    // If "whole" was on, expand to individual thanas first
    let whole = cur.whole;
    if (whole) {
      whole = false;
      (BD_DISTRICTS_THANAS[d] || []).forEach((x) => thanas.add(x));
    }
    if (thanas.has(t)) thanas.delete(t);
    else thanas.add(t);
    if (thanas.size === 0 && !whole) next.delete(d);
    else next.set(d, { whole, thanas });
    setSelection(next);
  };

  const totals = useMemo(() => {
    let dCount = 0;
    let tCount = 0;
    selection.forEach((s, d) => {
      const total = BD_DISTRICTS_THANAS[d]?.length || 0;
      if (s.whole || s.thanas.size === total) {
        dCount += 1;
        tCount += total;
      } else if (s.thanas.size > 0) {
        tCount += s.thanas.size;
      }
    });
    return { dCount, tCount };
  }, [selection]);

  const clearAll = () => setSelection(new Map());
  const selectDhakaCity = () => {
    const key = cityList.find((d) => sameText(d, "Dhaka City"));
    if (!key) {
      toast({ title: "Dhaka City not found", variant: "destructive" });
      return;
    }
    setSelection(new Map([[key, { whole: true, thanas: new Set<string>() }]]));
  };

  const save = async () => {
    if (!scopeId) {
      toast({ title: "Save the item first", description: "Create/save before adding exclusions.", variant: "destructive" });
      return;
    }
    if (!modeId) {
      toast({ title: "Pick a mode to block", variant: "destructive" });
      return;
    }
    setSaving(true);

    // Desired rows for this mode
    const desired: { city_name: string; thana: string | null }[] = [];
    selection.forEach((s, d) => {
      const total = BD_DISTRICTS_THANAS[d]?.length || 0;
      if (s.whole || (total > 0 && s.thanas.size === total)) {
        desired.push({ city_name: d, thana: null });
      } else {
        s.thanas.forEach((t) => desired.push({ city_name: d, thana: t }));
      }
    });

    // Re-fetch fresh existing rows for this mode/scope to avoid stale-state duplicate-key errors
    const { data: freshAll, error: freshErr } = await supabase
      .from("delivery_mode_exclusions" as any)
      .select("*")
      .eq("scope", scope)
      .eq("scope_id", scopeId);
    if (freshErr) {
      setSaving(false);
      toast({ title: "Failed to refresh", description: freshErr.message, variant: "destructive" });
      return;
    }
    const existing = ((freshAll || []) as unknown as ExclusionRow[]).filter((r) => r.mode_id === modeId);
    const keyOf = (city: string, thana: string | null) =>
      `${city.trim().toLowerCase()}|${(thana || "*").toLowerCase()}`;
    const existingMap = new Map(existing.map((r) => [keyOf(r.city_name, r.thana), r]));
    const desiredKeys = new Set(desired.map((d) => keyOf(d.city_name, d.thana)));

    const seen = new Set<string>();
    const toInsert = desired
      .filter((d) => {
        const k = keyOf(d.city_name, d.thana);
        if (existingMap.has(k) || seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map((d) => ({ mode_id: modeId, scope, scope_id: scopeId, city_name: d.city_name, thana: d.thana }));
    const toDelete = existing.filter((r) => !desiredKeys.has(keyOf(r.city_name, r.thana))).map((r) => r.id);

    let ok = true;
    if (toDelete.length) {
      const { error } = await supabase.from("delivery_mode_exclusions" as any).delete().in("id", toDelete);
      if (error) { ok = false; toast({ title: "Failed to remove", description: error.message, variant: "destructive" }); }
    }
    if (ok && toInsert.length) {
      const { error } = await supabase.from("delivery_mode_exclusions" as any).insert(toInsert as any);
      if (error) { ok = false; toast({ title: "Failed to add", description: error.message, variant: "destructive" }); }
    }
    setSaving(false);
    if (ok) {
      toast({ title: "Exclusions saved", description: `${desired.length} location(s) blocked.` });
      load();
    }
  };

  const modeName = (id: string) => activeModes.find((m) => m.id === id)?.name || "this mode";

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <Ban className="h-4 w-4 text-amber-600" />
        <Label className="text-sm">Block delivery mode for specific cities / upazilas</Label>
      </div>
      <p className="text-[11px] text-muted-foreground leading-tight">
        Tick the districts / upazilas where the selected mode should be <strong>blocked</strong>.
        Blocked areas will auto-fallback to the next mode for customers.
      </p>

      {/* Mode selector */}
      <Select value={modeId || undefined} onValueChange={setModeId}>
        <SelectTrigger
          style={{ fontSize: 16 }}
          className="bg-background"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <SelectValue placeholder="Mode to block" />
        </SelectTrigger>
        <SelectContent
          className="z-[100]"
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.stopPropagation()}
        >
          {activeModes.length === 0 ? (
            <SelectItem value="__none__" disabled>No active delivery modes</SelectItem>
          ) : (
            activeModes.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>


      {modeId && (
        <div className="rounded-lg border border-border bg-background">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b p-3">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-amber-600" />
              <div>
                <div className="text-sm font-semibold">Exclusion coverage (blacklist)</div>
                <div className="text-[11px] text-muted-foreground">
                  Tick areas where <strong>{modeName(modeId)}</strong> should NOT be available.
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <span className="rounded-md border px-2 py-1 text-[11px] text-muted-foreground">
                {totals.dCount}/{totalDistricts} districts
              </span>
              <span className="rounded-md border px-2 py-1 text-[11px] text-muted-foreground">
                {totals.tCount} upazilas
              </span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap items-center gap-1.5 border-b p-2">
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={selectDhakaCity}>
              Dhaka City only
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => {
                const next = new Map<string, Sel>();
                cityList.forEach((d) => next.set(d, { whole: true, thanas: new Set() }));
                setSelection(next);
              }}>
              Select all {totalDistricts}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={clearAll}>
              Clear all
            </Button>
          </div>

          {/* Search */}
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search district or upazila…"
                className="h-9 pl-7"
                style={{ fontSize: 16 }}
              />
            </div>
          </div>

          {/* Tree */}
          <div className="max-h-[420px] overflow-y-auto">
            {filteredDistricts.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">No matches</p>
            ) : (
              filteredDistricts.map((d) => {
                const thanas = BD_DISTRICTS_THANAS[d] || [];
                const state = districtState(d);
                const sel = getSel(d);
                const isOpen = expanded.has(d);
                const selCount = sel.whole ? thanas.length : sel.thanas.size;
                return (
                  <div key={d} className="border-b last:border-b-0">
                    <div className="flex items-center gap-2 px-2 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Set(expanded);
                          if (next.has(d)) next.delete(d); else next.add(d);
                          setExpanded(next);
                        }}
                        className="rounded p-0.5 hover:bg-muted"
                        aria-label={isOpen ? "Collapse" : "Expand"}
                      >
                        <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
                      </button>
                      <Checkbox
                        id={`exc-d-${d}`}
                        checked={state === "all" ? true : state === "some" ? "indeterminate" : false}
                        onCheckedChange={() => toggleDistrict(d)}
                      />
                      <label htmlFor={`exc-d-${d}`} className="flex-1 cursor-pointer text-sm">
                        {d}
                      </label>
                      <span className="text-[11px] text-muted-foreground">{selCount}/{thanas.length}</span>
                    </div>
                    {isOpen && thanas.length > 0 && (
                      <div className="bg-muted/30 px-3 pb-2">
                        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                          {thanas
                            .filter((t) => {
                              const q = search.trim().toLowerCase();
                              if (!q) return true;
                              if (d.toLowerCase().includes(q)) return true;
                              return t.toLowerCase().includes(q);
                            })
                            .map((t) => {
                              const checked = sel.whole || sel.thanas.has(t);
                              return (
                                <div key={t} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-background/60">
                                  <Checkbox
                                    id={`exc-t-${d}-${t}`}
                                    checked={checked}
                                    onCheckedChange={() => toggleThana(d, t)}
                                  />
                                  <label htmlFor={`exc-t-${d}-${t}`} className="flex-1 cursor-pointer text-xs">
                                    {t}
                                  </label>
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

          {/* Save */}
          <div className="flex items-center justify-between gap-2 border-t p-2">
            <span className="text-[11px] text-muted-foreground">
              {loading ? "Loading…" : `${totals.dCount} district(s), ${totals.tCount} upazila(s) selected`}
            </span>
            <Button type="button" size="sm" onClick={save} disabled={saving} className="h-8">
              <Save className="mr-1 h-4 w-4" /> {saving ? "Saving…" : "Save exclusions"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryExclusionsManager;
