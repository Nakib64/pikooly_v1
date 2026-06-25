import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Loader2, Save, Search, MapPin } from "lucide-react";
import { BD_DISTRICTS_THANAS } from "@/data/bdDistrictsThanas";
import type { DeliveryModeCity } from "@/hooks/useDeliveryModes";

interface Props {
  modeId: string;
  modeName: string;
  rows: DeliveryModeCity[]; // existing rows for this mode
}

const sameText = (a?: string | null, b?: string | null) =>
  (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

/**
 * Whitelist coverage manager:
 * - Default: nothing checked → mode unavailable everywhere (falls back).
 * - Tick "Whole district" → mode covers every upazila in that district.
 * - Or tick individual upazilas only.
 */
export const DeliveryCoverageBulkManager = ({ modeId, modeName, rows }: Props) => {
  const { toast } = useToast();
  const qc = useQueryClient();

  // selected[district] = Set of upazilas, OR "*" meaning every upazila in that district
  type Selection = Set<string> | "*";
  const [selected, setSelected] = useState<Record<string, Selection>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Hydrate from existing rows
  useEffect(() => {
    const next: Record<string, Selection> = {};
    rows.forEach((r) => {
      const district = Object.keys(BD_DISTRICTS_THANAS).find((d) => sameText(d, r.city_name));
      if (!district) return;
      if (!r.thana) {
        next[district] = "*";
      } else {
        if (next[district] === "*") return;
        const set = (next[district] as Set<string>) || new Set<string>();
        const upa = BD_DISTRICTS_THANAS[district].find((u) => sameText(u, r.thana));
        if (upa) set.add(upa);
        next[district] = set;
      }
    });
    Object.entries(next).forEach(([district, value]) => {
      if (value !== "*" && (value as Set<string>).size === BD_DISTRICTS_THANAS[district].length) {
        next[district] = "*";
      }
    });
    setSelected(next);
  }, [rows, modeId]);

  const districts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = Object.keys(BD_DISTRICTS_THANAS).sort();
    if (!q) return all;
    return all.filter(
      (d) =>
        d.toLowerCase().includes(q) ||
        BD_DISTRICTS_THANAS[d].some((u) => u.toLowerCase().includes(q))
    );
  }, [search]);

  const selectedDistrictCount = useMemo(
    () => Object.values(selected).filter((v) => v === "*" || (v as Set<string>).size > 0).length,
    [selected]
  );
  const selectedUpazilaCount = useMemo(
    () =>
      Object.entries(selected).reduce((acc, [d, v]) => {
        if (v === "*") return acc + BD_DISTRICTS_THANAS[d].length;
        return acc + (v as Set<string>).size;
      }, 0),
    [selected]
  );

  const toggleWhole = (district: string, on: boolean) => {
    setSelected((p) => {
      const next = { ...p };
      if (on) next[district] = "*";
      else delete next[district];
      return next;
    });
  };

  const toggleUpazila = (district: string, upa: string, on: boolean) => {
    setSelected((p) => {
      const cur = p[district];
      const set: Set<string> =
        cur === "*"
          ? new Set(BD_DISTRICTS_THANAS[district])
          : cur
            ? new Set(cur as Set<string>)
            : new Set();
      if (on) set.add(upa);
      else set.delete(upa);
      const next = { ...p };
      if (set.size === 0) delete next[district];
      else if (set.size === BD_DISTRICTS_THANAS[district].length) next[district] = "*";
      else next[district] = set;
      return next;
    });
  };

  const selectAll = () => {
    const next: Record<string, Selection> = {};
    Object.keys(BD_DISTRICTS_THANAS).forEach((d) => (next[d] = "*"));
    setSelected(next);
  };
  const clearAll = () => setSelected({});

  // Quick presets
  const presetInsideDhaka = () => {
    const next: Record<string, Selection> = {};
    ["Dhaka City"].forEach((c) => {
      if (BD_DISTRICTS_THANAS[c]) next[c] = "*";
    });
    setSelected(next);
  };
  const presetMetroCities = () => {
    const cities = ["Dhaka City", "Dhaka Sub-Urban", "Chittagong", "Khulna", "Rajshahi", "Sylhet", "Barishal", "Rangpur", "Mymensingh"];
    const next: Record<string, Selection> = {};
    cities.forEach((c) => {
      if (BD_DISTRICTS_THANAS[c]) next[c] = "*";
    });
    setSelected(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      // Build target rows. Whole-district selection expands to each thana/upazila
      // so it can be managed/removed one-by-one in Charge overrides too.
      const target: { city_name: string; thana: string | null; charge_override?: number | null }[] = [];
      Object.entries(selected).forEach(([d, v]) => {
        if (v === "*") {
          const districtRow = rows.find((r) => sameText(r.city_name, d) && !r.thana);
          BD_DISTRICTS_THANAS[d].forEach((u) =>
            target.push({ city_name: d, thana: u, charge_override: districtRow?.charge_override ?? null })
          );
        }
        else (v as Set<string>).forEach((u) => target.push({ city_name: d, thana: u }));
      });

      // Re-fetch fresh existing rows for this mode to avoid stale-prop duplicate-key errors
      const { data: freshRows, error: fetchErr } = await supabase
        .from("delivery_mode_cities")
        .select("*")
        .eq("mode_id", modeId);
      if (fetchErr) throw fetchErr;
      const currentRows = (freshRows || []) as DeliveryModeCity[];

      // Diff against fresh rows (preserve charge_override on unchanged rows)
      const existingKey = (r: DeliveryModeCity) =>
        `${r.city_name.trim().toLowerCase()}|${(r.thana || "").trim().toLowerCase()}`;
      const targetKey = (r: { city_name: string; thana: string | null }) =>
        `${r.city_name.trim().toLowerCase()}|${(r.thana || "").trim().toLowerCase()}`;

      const existingMap = new Map(currentRows.map((r) => [existingKey(r), r]));
      const targetSet = new Set(target.map(targetKey));

      const toDelete = currentRows.filter((r) => !targetSet.has(existingKey(r))).map((r) => r.id);
      // de-dupe toInsert by key as well, in case BD list has dupes
      const seen = new Set<string>();
      const toInsert = target
        .filter((t) => {
          const k = targetKey(t);
          if (existingMap.has(k) || seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .map((t) => ({
          mode_id: modeId,
          city_name: t.city_name,
          thana: t.thana,
          ...(t.charge_override != null ? { charge_override: t.charge_override } : {}),
        }));

      if (toDelete.length) {
        const { error } = await supabase.from("delivery_mode_cities").delete().in("id", toDelete);
        if (error) throw error;
      }
      if (toInsert.length) {
        for (let i = 0; i < toInsert.length; i += 200) {
          const chunk = toInsert.slice(i, i + 200);
          const { error } = await supabase.from("delivery_mode_cities").insert(chunk);
          if (error) throw error;
        }
      }

      toast({
        title: "Coverage saved",
        description: `${modeName}: +${toInsert.length} added, −${toDelete.length} removed.`,
      });
      qc.invalidateQueries({ queryKey: ["delivery-mode-cities"] });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-background p-3 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Bulk coverage (whitelist)</Label>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Tick the districts / upazilas where <strong>{modeName}</strong> should be available.
            Unchecked areas auto-fallback to the next mode (e.g. Premium Safe Delivery).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[11px]">
            {selectedDistrictCount}/64 districts
          </Badge>
          <Badge variant="secondary" className="text-[11px]">
            {selectedUpazilaCount} upazilas
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={presetInsideDhaka} className="h-8 text-xs">
          Dhaka City only
        </Button>
        <Button size="sm" variant="outline" onClick={presetMetroCities} className="h-8 text-xs">
          8 Metro cities
        </Button>
        <Button size="sm" variant="outline" onClick={selectAll} className="h-8 text-xs">
          Select all 64
        </Button>
        <Button size="sm" variant="ghost" onClick={clearAll} className="h-8 text-xs text-destructive">
          Clear all
        </Button>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search district or upazila…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9"
          style={{ fontSize: 16 }}
        />
      </div>

      <div className="max-h-[420px] overflow-y-auto rounded-md border divide-y">
        {districts.map((d) => {
          const upas = BD_DISTRICTS_THANAS[d];
          const sel = selected[d];
          const isWhole = sel === "*";
          const setSel = !isWhole && sel instanceof Set ? sel : null;
          const partialCount = isWhole ? upas.length : setSel ? setSel.size : 0;
          const isOpen = !!open[d];
          return (
            <div key={d} className="bg-card">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => setOpen((p) => ({ ...p, [d]: !p[d] }))}
                  className="p-1 -ml-1 hover:bg-muted rounded"
                  aria-label={`Toggle ${d}`}
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <Checkbox
                  id={`whole-${modeId}-${d}`}
                  checked={isWhole ? true : partialCount > 0 ? "indeterminate" : false}
                  onCheckedChange={(v) => toggleWhole(d, v === true)}
                />
                <Label
                  htmlFor={`whole-${modeId}-${d}`}
                  className="text-sm font-medium flex-1 cursor-pointer truncate"
                >
                  {d}
                </Label>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {partialCount}/{upas.length}
                </span>
              </div>
              {isOpen && (
                <div className="px-3 pb-2 pl-9 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1.5">
                  {upas.map((u) => {
                    const checked = isWhole || !!setSel?.has(u);
                    return (
                      <label
                        key={u}
                        className="flex items-center gap-2 text-xs cursor-pointer hover:text-foreground text-muted-foreground"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => toggleUpazila(d, u, v === true)}
                        />
                        <span className="truncate">{u}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {districts.length === 0 && (
          <p className="text-xs text-muted-foreground p-3">No districts match your search.</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="sm" className="h-9">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save coverage
        </Button>
      </div>
    </div>
  );
};

export default DeliveryCoverageBulkManager;
