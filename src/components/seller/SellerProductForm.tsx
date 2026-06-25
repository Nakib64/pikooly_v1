import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CloudinaryUpload } from "@/components/admin/CloudinaryUpload";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { Lock, X, GripVertical, Loader2, Star, ImageIcon, Info, Tag, Truck, Search, Plus, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export interface SellerLite {
  id: string;
  can_edit_seo: boolean | null;
}

export interface ProductRowLite {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  stock: number;
  image_url: string | null;
  images: string[] | null;
  category_id: string | null;
  subcategory_id: string | null;
  short_description: string | null;
  description: string | null;
  instructions: string | null;
  delivery_time: string | null;
  delivery_info: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

interface Category { id: string; name: string; }
interface Subcategory { id: string; name: string; category_id: string; }

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  short_description: z.string().trim().max(5000).optional().or(z.literal("")),
  description: z.string().trim().max(20000).optional().or(z.literal("")),
  instructions: z.string().trim().max(20000).optional().or(z.literal("")),
  category_id: z.string().uuid("Pick a category"),
  subcategory_id: z.string().uuid().optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Price must be ≥ 0"),
  original_price: z.coerce.number().min(0).optional().or(z.nan()),
  stock: z.coerce.number().int().min(0),
  unlimited_stock: z.boolean(),
  delivery_time: z.string().trim().max(80).optional().or(z.literal("")),
  delivery_charge: z.string().trim().max(40).optional().or(z.literal("")),
  delivery_areas: z.string().trim().max(300).optional().or(z.literal("")),
  delivery_info_html: z.string().trim().max(20000).optional().or(z.literal("")),
  seo_title: z.string().trim().max(160).optional().or(z.literal("")),
  seo_description: z.string().trim().max(300).optional().or(z.literal("")),
});

type FormState = z.infer<typeof schema> & { images: string[] };

const blankForm: FormState = {
  name: "", short_description: "", description: "", instructions: "",
  category_id: "", subcategory_id: "",
  price: 0, original_price: undefined as any, stock: 0, unlimited_stock: false,
  delivery_time: "", delivery_charge: "", delivery_areas: "", delivery_info_html: "",
  seo_title: "", seo_description: "", images: [],
};

function fromProduct(p: ProductRowLite): FormState {
  let dCharge = "", dAreas = "", dHtml = "";
  if (p.delivery_info) {
    const raw = p.delivery_info.trim();
    if (raw.startsWith("{")) {
      try {
        const parsed = JSON.parse(raw);
        dCharge = parsed.charge ?? "";
        dAreas = parsed.areas ?? "";
      } catch { dHtml = p.delivery_info; }
    } else {
      dHtml = p.delivery_info;
    }
  }
  return {
    name: p.name,
    short_description: p.short_description ?? "",
    description: p.description ?? "",
    instructions: p.instructions ?? "",
    category_id: p.category_id ?? "",
    subcategory_id: p.subcategory_id ?? "",
    price: Number(p.price) || 0,
    original_price: p.original_price != null ? Number(p.original_price) : (undefined as any),
    stock: p.stock,
    unlimited_stock: p.stock >= 999999,
    delivery_time: p.delivery_time ?? "",
    delivery_charge: dCharge,
    delivery_areas: dAreas,
    delivery_info_html: dHtml,
    seo_title: p.seo_title ?? "",
    seo_description: p.seo_description ?? "",
    images: (p.images && p.images.length ? p.images : (p.image_url ? [p.image_url] : [])).slice(0, 5),
  };
}

interface Props {
  seller: SellerLite;
  product?: ProductRowLite | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function SectionCard({ icon: Icon, title, hint, right, children }: any) {
  return (
    <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight truncate">{title}</h3>
            {hint && <p className="text-[11px] text-muted-foreground truncate">{hint}</p>}
          </div>
        </div>
        {right}
      </header>
      <div className="p-4 space-y-3">{children}</div>
    </section>
  );
}

export default function SellerProductForm({ seller, product, onSuccess, onCancel }: Props) {
  const canEditSeo = !!seller.can_edit_seo;
  const [form, setForm] = useState<FormState>(product ? fromProduct(product) : blankForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const runAiGenerate = async () => {
    const productName = form.name.trim();
    if (productName.length < 2) {
      toast.error("Enter the product name first");
      return;
    }
    setAiLoading(true);
    try {
      const categoryName = categories.find((c) => c.id === form.category_id)?.name;
      const { data, error } = await supabase.functions.invoke("ai-generate-product", {
        body: {
          name: productName,
          keywords: aiKeywords || undefined,
          category: categoryName,
          price: form.price || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setForm((f) => ({
        ...f,
        short_description: (data as any).short_description || f.short_description,
        description: (data as any).description || f.description,
        instructions: (data as any).instructions || f.instructions,
        delivery_info_html: (data as any).delivery_info || f.delivery_info_html,
        seo_title: canEditSeo ? ((data as any).seo_title || f.seo_title) : f.seo_title,
        seo_description: canEditSeo ? ((data as any).seo_description || f.seo_description) : f.seo_description,
      }));
      toast.success("AI content generated");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "AI generation failed");
    } finally {
      setAiLoading(false);
    }
  };


  useEffect(() => {
    (async () => {
      const [scRes, ssRes] = await Promise.all([
        supabase.from("seller_categories").select("category_id, categories(id, name)").eq("seller_id", seller.id),
        supabase.from("seller_subcategories").select("subcategory_id, subcategories(id, name, category_id)").eq("seller_id", seller.id),
      ]);
      setCategories((scRes.data || []).map((r: any) => r.categories).filter(Boolean));
      setSubcategories((ssRes.data || []).map((r: any) => r.subcategories).filter(Boolean));
    })();
  }, [seller.id]);

  const filteredSubcats = useMemo(
    () => subcategories.filter((s) => !form.category_id || s.category_id === form.category_id),
    [subcategories, form.category_id]
  );

  const handleImageAdd = (url: string) => {
    if (!url) return;
    setForm((f) => f.images.length >= 5 ? f : { ...f, images: [...f.images, url] });
  };
  const handleImageRemove = (i: number) =>
    setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
  const makeCover = (i: number) =>
    setForm((f) => {
      if (i === 0) return f;
      const next = [...f.images];
      const [pick] = next.splice(i, 1);
      next.unshift(pick);
      return { ...f, images: next };
    });

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    setForm((f) => {
      const next = [...f.images];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return { ...f, images: next };
    });
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message || "Please fix the form"); return; }
    if (form.images.length === 0) { toast.error("Add at least one product image"); return; }
    setSaving(true);
    try {
      const main = form.images[0];
      const finalStock = form.unlimited_stock ? 999999 : form.stock;
      const deliveryInfoValue = form.delivery_info_html?.trim()
        ? form.delivery_info_html
        : ((form.delivery_charge || form.delivery_areas)
            ? JSON.stringify({ charge: form.delivery_charge || "", areas: form.delivery_areas || "" })
            : null);
      const payload: Record<string, any> = {
        seller_id: seller.id,
        name: form.name.trim(),
        short_description: form.short_description || null,
        description: form.description || null,
        instructions: form.instructions || null,
        category_id: form.category_id || null,
        subcategory_id: form.subcategory_id || null,
        price: form.price,
        original_price: form.original_price != null && !isNaN(form.original_price as any) ? form.original_price : null,
        stock: finalStock,
        image_url: main,
        images: form.images,
        delivery_time: form.delivery_time || null,
        delivery_info: deliveryInfoValue,
      };
      if (canEditSeo) {
        payload.seo_title = form.seo_title || null;
        payload.seo_description = form.seo_description || null;
      }
      if (product) {
        const { error } = await supabase.from("products").update(payload as any).eq("id", product.id);
        if (error) throw error;
        toast.success("Submitted for re-approval");
      } else {
        const base = slugify(form.name);
        const slug = `${base}-${Date.now().toString(36).slice(-5)}`;
        const { error } = await supabase.from("products").insert({ ...payload, slug } as any);
        if (error) throw error;
        toast.success("Product submitted for admin approval");
      }
      onSuccess?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to save product");
    } finally { setSaving(false); }
  };

  // SEO preview values (what will be saved)
  const previewTitle = (canEditSeo ? form.seo_title : "") || form.name || "Untitled product";
  const previewDesc = (canEditSeo ? form.seo_description : "") || form.short_description || form.description?.slice(0, 160) || "—";
  const previewSlug = product?.slug || slugify(form.name) || "your-product";

  return (
    <div className="space-y-4 pb-8">
      {/* Images */}
      <SectionCard icon={ImageIcon} title="Product images" hint="Up to 5 — drag to reorder. First image is the cover.">
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2.5">
          {form.images.map((url, i) => (
            <div
              key={url + i}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => { e.preventDefault(); setOverIndex(i); }}
              onDragLeave={() => setOverIndex((o) => (o === i ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) reorder(dragIndex, i);
                setDragIndex(null); setOverIndex(null);
              }}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 bg-muted cursor-move transition-all ${
                overIndex === i && dragIndex !== i ? "ring-2 ring-primary scale-[1.02]" : "border-transparent"
              } ${dragIndex === i ? "opacity-50" : ""}`}
            >
              <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
              <div className="absolute top-1 left-1 bg-background/80 rounded p-0.5">
                <GripVertical className="h-3 w-3 text-muted-foreground" />
              </div>
              <button
                type="button"
                onClick={() => handleImageRemove(i)}
                className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5 shadow hover:bg-background"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {i === 0 ? (
                <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground rounded px-1.5 py-0.5 flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-current" /> Cover
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(i)}
                  className="absolute bottom-1 left-1 text-[10px] bg-background/90 rounded px-1.5 py-0.5 hover:bg-background border"
                >
                  Set cover
                </button>
              )}
            </div>
          ))}
          {form.images.length < 5 && (
            <div className="aspect-square relative rounded-lg border-2 border-dashed border-border bg-muted/40 hover:border-primary/60 hover:bg-muted/60 transition flex items-center justify-center">
              <div className="absolute inset-0 [&_button]:!h-full [&_button]:!w-full [&_button]:!border-0 [&_button]:!bg-transparent [&_button]:!rounded-lg [&_button]:flex [&_button]:flex-col [&_button]:items-center [&_button]:justify-center [&_button]:gap-1 [&_button]:text-muted-foreground">
                <CloudinaryUpload key={form.images.length} folder="seller-products" label="Add" onChange={handleImageAdd} />
              </div>
              <Plus className="h-5 w-5 text-muted-foreground/60 pointer-events-none" />
            </div>
          )}
          {/* Empty placeholder squares for visual structure (reference style) */}
          {Array.from({ length: Math.max(0, 4 - form.images.length - (form.images.length < 5 ? 1 : 0)) }).map((_, idx) => (
            <div key={`ph-${idx}`} className="aspect-square rounded-lg border-2 border-dashed border-border/60 bg-muted/20 flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">First image becomes the cover on the product card.</p>
      </SectionCard>

      {/* AI Content Generator */}
      <section className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm overflow-hidden">
        <header className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-primary/5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-tight truncate flex items-center gap-1.5">
                AI Content Generator
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/15 text-primary">Beta</span>
              </h3>
              <p className="text-[11px] text-muted-foreground truncate">
                Auto-fill descriptions, SEO title, meta and tags from the product name.
              </p>
            </div>
          </div>
        </header>
        <div className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Focus keywords <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              value={aiKeywords}
              onChange={(e) => setAiKeywords(e.target.value)}
              placeholder="e.g. birthday, red roses, same-day delivery"
              className="h-11 text-base md:text-sm"
            />
          </div>
          <Button
            type="button"
            onClick={runAiGenerate}
            disabled={aiLoading || form.name.trim().length < 2}
            className="w-full h-11"
          >
            {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
            {aiLoading ? "Generating…" : "Generate with AI"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Enter your product name above first. AI will fill Short Description, Long Description{canEditSeo ? ", SEO title and meta description" : ""}.
          </p>
        </div>
      </section>

      {/* Basic info */}
      <SectionCard icon={Info} title="Basic info">

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Product name *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="h-11 text-base md:text-sm"
            placeholder="Your title"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Short Description <span className="text-muted-foreground font-normal">(shown on product card)</span>
          </Label>
          <RichTextEditor
            value={form.short_description || ""}
            onChange={(html) => setForm((f) => ({ ...f, short_description: html }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Long Description <span className="text-muted-foreground font-normal">(full product details)</span>
          </Label>
          <RichTextEditor
            value={form.description || ""}
            onChange={(html) => setForm((f) => ({ ...f, description: html }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Instructions <span className="text-muted-foreground font-normal">(Care/usage instructions — leave empty for default)</span>
          </Label>
          <RichTextEditor
            value={form.instructions || ""}
            onChange={(html) => setForm((f) => ({ ...f, instructions: html }))}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Category *</Label>
            <Select
              value={form.category_id || undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, category_id: v, subcategory_id: "" }))}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder={categories.length ? "Select category" : "No categories assigned"} />
              </SelectTrigger>
              <SelectContent>
                {categories.length === 0 ? (
                  <SelectItem value="none" disabled>No categories assigned</SelectItem>
                ) : categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {categories.length === 0 && (
              <p className="text-[11px] text-muted-foreground">Ask admin to assign categories to your seller account.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Subcategory</Label>
            <Select
              value={form.subcategory_id || undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, subcategory_id: v }))}
              disabled={!form.category_id || filteredSubcats.length === 0}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder={!form.category_id ? "Pick category first" : (filteredSubcats.length ? "Optional" : "None available")} />
              </SelectTrigger>
              <SelectContent>
                {filteredSubcats.length === 0 ? (
                  <SelectItem value="none" disabled>No subcategories</SelectItem>
                ) : filteredSubcats.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* Pricing & stock */}
      <SectionCard icon={Tag} title="Pricing & stock">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Price (BDT) *</Label>
            <Input type="number" inputMode="decimal" min={0} value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="h-10 text-base md:text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Original price (optional)</Label>
            <Input type="number" inputMode="decimal" min={0} value={form.original_price ?? ""}
              onChange={(e) => setForm({ ...form, original_price: e.target.value === "" ? (undefined as any) : Number(e.target.value) })}
              className="h-10 text-base md:text-sm" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3 bg-muted/20">
          <div className="min-w-0">
            <div className="text-sm font-medium">Unlimited stock</div>
            <div className="text-[11px] text-muted-foreground">Hide the stock counter and always show in-stock.</div>
          </div>
          <Switch checked={form.unlimited_stock} onCheckedChange={(v) => setForm({ ...form, unlimited_stock: v })} />
        </div>
        {!form.unlimited_stock && (
          <div className="space-y-1.5">
            <Label className="text-xs">Stock quantity</Label>
            <Input type="number" inputMode="numeric" min={0} value={form.stock}
              onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="h-10 text-base md:text-sm" />
          </div>
        )}
      </SectionCard>

      {/* Delivery */}
      <SectionCard icon={Truck} title="Delivery options">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Delivery time</Label>
            <Input placeholder="e.g. Same-day, 1-2 days" value={form.delivery_time}
              onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} className="h-10 text-base md:text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Delivery charge</Label>
            <Input placeholder="e.g. ৳60 or Free" value={form.delivery_charge}
              onChange={(e) => setForm({ ...form, delivery_charge: e.target.value })} className="h-10 text-base md:text-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Delivery areas</Label>
          <Textarea rows={2} placeholder="e.g. Dhaka city, Gulshan, Banani" value={form.delivery_areas}
            onChange={(e) => setForm({ ...form, delivery_areas: e.target.value })} className="text-base md:text-sm" />
          <p className="text-[11px] text-muted-foreground">Final routing still uses your assigned district. This is shown to customers.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">
            Delivery Info <span className="text-muted-foreground font-normal">(Custom delivery details — leave empty for default)</span>
          </Label>
          <RichTextEditor
            value={form.delivery_info_html || ""}
            onChange={(html) => setForm((f) => ({ ...f, delivery_info_html: html }))}
          />
          <p className="text-[11px] text-muted-foreground">If filled, this rich content overrides the charge/areas fields above on the product page.</p>
        </div>
      </SectionCard>

      {/* SEO */}
      <SectionCard
        icon={Search}
        title="SEO"
        right={!canEditSeo && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
            <Lock className="h-3 w-3" /> Locked
          </span>
        )}
      >
        {canEditSeo ? (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">SEO title <span className="text-muted-foreground">({(form.seo_title || "").length}/60 recommended)</span></Label>
              <Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                className="h-10 text-base md:text-sm" maxLength={160} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Meta description <span className="text-muted-foreground">({(form.seo_description || "").length}/160 recommended)</span></Label>
              <Textarea rows={2} value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                className="text-base md:text-sm" maxLength={300} />
            </div>
          </>
        ) : (
          <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2.5 text-[12px]">
            <Lock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <div className="font-medium text-foreground">SEO editing is locked</div>
              <p className="text-muted-foreground mt-0.5">
                Contact admin to enable SEO editing for your account. We'll auto-generate SEO from your product name and short description.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Search preview</Label>
          <div className="rounded-md border bg-background p-3 space-y-1">
            <div className="text-[11px] text-emerald-700 truncate">pikooly.com › products › {previewSlug}</div>
            <div className="text-[15px] text-[#1a0dab] leading-snug line-clamp-1">{previewTitle}</div>
            <div className="text-[12px] text-muted-foreground line-clamp-2">{previewDesc}</div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            This is what Google and social previews will display. {canEditSeo ? "Edit the fields above to customize." : "Falls back to product name + description while SEO is locked."}
          </p>
        </div>
      </SectionCard>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
        {product
          ? "Editing a product re-submits it for admin approval."
          : "New products go to admin for approval before becoming visible on the storefront."}
      </div>

      <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur border-t flex flex-col-reverse sm:flex-row gap-2">
        {onCancel && (
          <Button variant="ghost" className="sm:flex-1" onClick={onCancel} disabled={saving}>Cancel</Button>
        )}
        <Button className="sm:flex-1" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
          {product ? "Save changes" : "Submit for approval"}
        </Button>
      </div>
    </div>
  );
}
