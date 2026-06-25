import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Ruler, Palette } from "lucide-react";
import { toast } from "sonner";

interface SizeRow {
  id?: string;
  name: string;
  extra_price: number;
  display_order: number;
  is_active: boolean;
  _new?: boolean;
  _deleted?: boolean;
}

interface ColorRow {
  id?: string;
  name: string;
  hex_code: string;
  display_order: number;
  is_active: boolean;
  _new?: boolean;
  _deleted?: boolean;
}

interface Props {
  productId: string | null; // null = product not yet saved
}

/**
 * Admin variant manager — Sizes (with extra price) + Colors (swatches).
 * Loads existing variants for the product and saves on demand via `save()`.
 * Parent should call save(productId) after creating/updating the product.
 */
export interface ProductVariantsManagerHandle {
  save: (productId: string) => Promise<void>;
}

const ProductVariantsManager = ({ productId }: Props) => {
  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [colors, setColors] = useState<ColorRow[]>([]);

  useEffect(() => {
    if (!productId) {
      setSizes([]);
      setColors([]);
      return;
    }
    (async () => {
      const [sRes, cRes] = await Promise.all([
        supabase.from("product_sizes").select("*").eq("product_id", productId).order("display_order"),
        supabase.from("product_colors").select("*").eq("product_id", productId).order("display_order"),
      ]);
      if (sRes.data) setSizes(sRes.data as any);
      if (cRes.data) setColors(cRes.data as any);
    })();
  }, [productId]);

  const addSize = () =>
    setSizes((prev) => [...prev, { name: "", extra_price: 0, display_order: prev.length, is_active: true, _new: true }]);

  const addColor = () =>
    setColors((prev) => [
      ...prev,
      { name: "", hex_code: "#ec4899", display_order: prev.length, is_active: true, _new: true },
    ]);

  const updateSize = (i: number, patch: Partial<SizeRow>) =>
    setSizes((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const updateColor = (i: number, patch: Partial<ColorRow>) =>
    setColors((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const removeSize = (i: number) => {
    setSizes((prev) => {
      const row = prev[i];
      if (row.id) return prev.map((s, idx) => (idx === i ? { ...s, _deleted: true } : s));
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const removeColor = (i: number) => {
    setColors((prev) => {
      const row = prev[i];
      if (row.id) return prev.map((c, idx) => (idx === i ? { ...c, _deleted: true } : c));
      return prev.filter((_, idx) => idx !== i);
    });
  };

  // Expose imperative save via window callback isn't ideal — we'll let parent call
  // the exported helper directly. For simplicity attach to dataset.
  // Parent uses a global save fn we expose through a ref hack:
  (ProductVariantsManager as any)._save = async (pid: string) => {
    // Sizes
    for (const s of sizes) {
      if (s._deleted && s.id) {
        await supabase.from("product_sizes").delete().eq("id", s.id);
        continue;
      }
      if (!s.name.trim()) continue;
      const payload = {
        product_id: pid,
        name: s.name.trim(),
        extra_price: Number(s.extra_price) || 0,
        display_order: s.display_order,
        is_active: s.is_active,
      };
      if (s.id) {
        await supabase.from("product_sizes").update(payload).eq("id", s.id);
      } else {
        await supabase.from("product_sizes").insert(payload);
      }
    }
    // Colors
    for (const c of colors) {
      if (c._deleted && c.id) {
        await supabase.from("product_colors").delete().eq("id", c.id);
        continue;
      }
      if (!c.name.trim()) continue;
      const payload = {
        product_id: pid,
        name: c.name.trim(),
        hex_code: c.hex_code || "#cccccc",
        display_order: c.display_order,
        is_active: c.is_active,
      };
      if (c.id) {
        await supabase.from("product_colors").update(payload).eq("id", c.id);
      } else {
        await supabase.from("product_colors").insert(payload);
      }
    }
  };

  const visibleSizes = sizes.filter((s) => !s._deleted);
  const visibleColors = colors.filter((c) => !c._deleted);

  return (
    <div className="space-y-5 border-t pt-4 mt-2">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        🎁 Variants — Size & Color
      </h3>
      <p className="text-xs text-muted-foreground -mt-2">
        Optional. Customers will see size buttons and color swatches on the product page.
      </p>

      {/* SIZES */}
      <div className="space-y-2 rounded-lg border border-border/60 p-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <Ruler className="h-4 w-4 text-primary" /> Sizes
          </Label>
          <Button type="button" size="sm" variant="outline" onClick={addSize}>
            <Plus className="h-3 w-3 mr-1" /> Add Size
          </Button>
        </div>
        {visibleSizes.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-1">No sizes added.</p>
        ) : (
          visibleSizes.map((s) => {
            const realIdx = sizes.indexOf(s);
            return (
              <div key={realIdx} className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[120px]">
                  <Label className="text-[11px] text-muted-foreground">Name</Label>
                  <Input
                    value={s.name}
                    placeholder="Small / Medium / Large"
                    onChange={(e) => updateSize(realIdx, { name: e.target.value })}
                  />
                </div>
                <div className="w-[120px]">
                  <Label className="text-[11px] text-muted-foreground">Extra Price (৳)</Label>
                  <Input
                    type="number"
                    value={s.extra_price}
                    onChange={(e) => updateSize(realIdx, { extra_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => removeSize(realIdx)}
                  aria-label="Remove size"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      {/* COLORS */}
      <div className="space-y-2 rounded-lg border border-border/60 p-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm font-semibold">
            <Palette className="h-4 w-4 text-primary" /> Colors
          </Label>
          <Button type="button" size="sm" variant="outline" onClick={addColor}>
            <Plus className="h-3 w-3 mr-1" /> Add Color
          </Button>
        </div>
        {visibleColors.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-1">No colors added.</p>
        ) : (
          visibleColors.map((c) => {
            const realIdx = colors.indexOf(c);
            return (
              <div key={realIdx} className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[120px]">
                  <Label className="text-[11px] text-muted-foreground">Name</Label>
                  <Input
                    value={c.name}
                    placeholder="Red / Pink / Yellow"
                    onChange={(e) => updateColor(realIdx, { name: e.target.value })}
                  />
                </div>
                <div className="w-[120px]">
                  <Label className="text-[11px] text-muted-foreground">Color</Label>
                  <div className="flex items-center gap-1.5 border border-border rounded-md h-10 px-2 bg-background">
                    <input
                      type="color"
                      value={c.hex_code}
                      onChange={(e) => updateColor(realIdx, { hex_code: e.target.value })}
                      className="h-7 w-7 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <Input
                      value={c.hex_code}
                      onChange={(e) => updateColor(realIdx, { hex_code: e.target.value })}
                      className="border-0 px-1 text-xs h-7 focus-visible:ring-0"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => removeColor(realIdx)}
                  aria-label="Remove color"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export const saveProductVariants = async (productId: string) => {
  const fn = (ProductVariantsManager as any)._save;
  if (typeof fn === "function") {
    try {
      await fn(productId);
    } catch (err: any) {
      toast.error(`Variant save failed: ${err.message}`);
    }
  }
};

export default ProductVariantsManager;
