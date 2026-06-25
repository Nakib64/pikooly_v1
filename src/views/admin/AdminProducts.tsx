import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Package, Sparkles, Loader2 } from "lucide-react";
import { CloudinaryUpload } from "@/components/admin/CloudinaryUpload";
import { ensureAdminSession } from "@/lib/ensureAdmin";
import ProductVariantsManager, { saveProductVariants } from "@/components/admin/ProductVariantsManager";
import { useCurrency } from "@/hooks/useCurrency";
import { useDeliveryModes } from "@/hooks/useDeliveryModes";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Category = Tables<"categories">;

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

const AdminProducts = () => {
  const { formatCurrency } = useCurrency();
  const { data: deliveryModes = [] } = useDeliveryModes();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [productCategoryMap, setProductCategoryMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterApproval, setFilterApproval] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiKeywords, setAiKeywords] = useState("");
  const [rejectDialog, setRejectDialog] = useState<{ ids: string[] } | null>(null);
  const [rejectReason, setRejectReason] = useState("");


  const handleAiGenerate = async () => {
    if (!form.name.trim()) {
      toast({ title: "Product name required", description: "Enter a product name first.", variant: "destructive" });
      return;
    }
    setAiGenerating(true);
    try {
      const catName = categories.find((c) => c.id === form.category_id)?.name || "";
      const { data, error } = await supabase.functions.invoke("ai-generate-product", {
        body: { name: form.name, keywords: aiKeywords, category: catName, price: form.price },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const d = data as any;
      setForm((prev) => ({
        ...prev,
        slug: d.slug || prev.slug,
        short_description: d.short_description || prev.short_description,
        description: d.description || prev.description,
        instructions: d.instructions || prev.instructions,
        delivery_info: d.delivery_info || prev.delivery_info,
        seo_title: d.seo_title || prev.seo_title,
        seo_description: d.seo_description || prev.seo_description,
        tags: Array.isArray(d.tags) && d.tags.length ? d.tags.join(", ") : prev.tags,
      }));
      toast({ title: "✨ AI content generated", description: "Review and edit before saving." });
    } catch (e: any) {
      toast({ title: "AI failed", description: e.message || "Try again", variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const defaultForm = {
    name: "", slug: "", short_description: "", description: "", price: 0, original_price: 0, seller_price: 0,
    image_url: "", category_id: "", category_ids: [] as string[], subcategory_ids: [] as string[], is_active: true, is_featured: false, stock: 0, tags: "",
    allow_custom_image: false, allow_custom_text: false,
    specifications: [] as Array<{ item: string; value: string }>,
    seo_title: "", seo_description: "", delivery_time: "",
    instructions: "", delivery_info: "",
    is_preorder: false, preorder_note: "", preorder_advance_percent: 50,
    bulk_order_enabled: false, bulk_min_quantity: 10,
    bulk_pricing_tiers: [] as Array<{ min_qty: number; discount_percent: number }>,
  };
  const [form, setForm] = useState(defaultForm);

  const [productSubcategoryMap, setProductSubcategoryMap] = useState<Record<string, string[]>>({});

  const fetchData = async () => {
    const [prodRes, catRes, subRes, pcRes, pscRes] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("display_order"),
      supabase.from("subcategories").select("*").order("display_order"),
      supabase.from("product_categories").select("*"),
      supabase.from("product_subcategories").select("*"),
    ]);
    if (prodRes.data) setProducts(prodRes.data);
    if (catRes.data) setCategories(catRes.data);
    if (subRes.data) setSubcategories(subRes.data as Subcategory[]);
    
    if (pcRes.data) {
      const map: Record<string, string[]> = {};
      pcRes.data.forEach((pc: any) => {
        if (!map[pc.product_id]) map[pc.product_id] = [];
        map[pc.product_id].push(pc.category_id);
      });
      setProductCategoryMap(map);
    }
    if (pscRes.data) {
      const map: Record<string, string[]> = {};
      pscRes.data.forEach((psc: any) => {
        if (!map[psc.product_id]) map[psc.product_id] = [];
        map[psc.product_id].push(psc.subcategory_id);
      });
      setProductSubcategoryMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const resetForm = () => { setForm(defaultForm); setEditing(null); setImageFile(null); };

  const openEdit = (p: Product) => {
    setEditing(p);
    const specs = (p.specifications as Array<{ item: string; value: string }>) || [];
    const catIds = productCategoryMap[p.id] || (p.category_id ? [p.category_id] : []);
    const subIds = productSubcategoryMap[p.id] || ((p as any).subcategory_id ? [(p as any).subcategory_id] : []);
    setForm({
      name: p.name, slug: p.slug, short_description: (p as any).short_description || "", description: p.description || "",
      price: p.price, original_price: p.original_price || 0, seller_price: (p as any).seller_price || 0,
      image_url: p.image_url || "", category_id: p.category_id || "",
      category_ids: catIds,
      subcategory_ids: subIds,
      is_active: p.is_active, is_featured: p.is_featured, stock: p.stock,
      allow_custom_image: (p as any).allow_custom_image || false, allow_custom_text: (p as any).allow_custom_text || false,
      tags: (p.tags || []).join(", "),
      specifications: specs,
      seo_title: (p as any).seo_title || "", seo_description: (p as any).seo_description || "",
      delivery_time: (p as any).delivery_time || "",
      instructions: (p as any).instructions || "", delivery_info: (p as any).delivery_info || "",
      is_preorder: (p as any).is_preorder || false,
      preorder_note: (p as any).preorder_note || "",
      preorder_advance_percent: (p as any).preorder_advance_percent ?? 50,
      bulk_order_enabled: (p as any).bulk_order_enabled || false,
      bulk_min_quantity: (p as any).bulk_min_quantity ?? 10,
      bulk_pricing_tiers: Array.isArray((p as any).bulk_pricing_tiers) ? (p as any).bulk_pricing_tiers : [],
    });
    setImageFile(null);
    setDialogOpen(true);
  };

  const filteredSubs = subcategories.filter(s => form.category_ids.includes(s.category_id));

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const { convertToWebP } = await import("@/lib/imageUtils");
      const webpFile = await convertToWebP(file);
      const { uploadToCloudinary } = await import("@/lib/cloudinaryUpload");
      const res = await uploadToCloudinary(webpFile, { folder: "products", resourceType: "image" });
      return res.url;
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Cloudinary upload failed", variant: "destructive" });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    const authErr = await ensureAdminSession();
    if (authErr) {
      toast({ title: "Permission denied", description: authErr, variant: "destructive" });
      setSaving(false);
      return;
    }

    let imageUrl = form.image_url;
    const slug = form.slug || generateSlug(form.name);
    const tags = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const specs = form.specifications.filter(s => s.item.trim() || s.value.trim());
    
    // Use first selected category as primary category_id for backward compat
    const primaryCategoryId = form.category_ids.length > 0 ? form.category_ids[0] : null;
    
    const payload = {
      name: form.name.trim(), slug, short_description: form.short_description || null, description: form.description || null,
      price: form.price, original_price: form.original_price || null, seller_price: form.seller_price || null,
      image_url: imageUrl || null, category_id: primaryCategoryId,
      subcategory_id: form.subcategory_ids.length > 0 ? form.subcategory_ids[0] : null,
      is_active: form.is_active, is_featured: form.is_featured, stock: form.stock, tags,
      allow_custom_image: form.allow_custom_image, allow_custom_text: form.allow_custom_text,
      specifications: specs.length > 0 ? specs : null,
      seo_title: form.seo_title.trim() || null, seo_description: form.seo_description.trim() || null,
      delivery_time: form.delivery_time.trim() || null,
      delivery_mode_id: null,
      instructions: form.instructions || null, delivery_info: form.delivery_info || null,
      is_preorder: form.is_preorder,
      preorder_note: form.preorder_note.trim() || null,
      preorder_advance_percent: form.preorder_advance_percent || 50,
      bulk_order_enabled: form.bulk_order_enabled,
      bulk_min_quantity: form.bulk_min_quantity || 10,
      bulk_pricing_tiers: (form.bulk_pricing_tiers || []).filter(t => t.min_qty > 0).sort((a, b) => a.min_qty - b.min_qty),
    } as any;

    let productId: string | null = null;

    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSaving(false); return; }
      productId = editing.id;
      toast({ title: "Product updated" });
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSaving(false); return; }
      productId = data.id;
      toast({ title: "Product created" });
    }

    // Sync variants (sizes + colors)
    if (productId) {
      await saveProductVariants(productId);
    }

    // Sync junction tables
    if (productId) {
      await supabase.from("product_categories").delete().eq("product_id", productId);
      if (form.category_ids.length > 0) {
        const rows = form.category_ids.map(cid => ({ product_id: productId!, category_id: cid }));
        await supabase.from("product_categories").insert(rows);
      }
      await supabase.from("product_subcategories").delete().eq("product_id", productId);
      if (form.subcategory_ids.length > 0) {
        const subRows = form.subcategory_ids.map(sid => ({ product_id: productId!, subcategory_id: sid }));
        await supabase.from("product_subcategories").insert(subRows);
      }
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Product deleted" }); fetchData(); }
  };

  const filtered = (() => {
    const list = products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory === "all" || (productCategoryMap[p.id] || []).includes(filterCategory) || p.category_id === filterCategory;
      const status = (p as any).approval_status || "approved";
      const matchApproval = filterApproval === "all" || status === filterApproval;
      return matchSearch && matchCat && matchApproval;
    });
    const sorted = [...list].sort((a, b) => {
      switch (sortBy) {
        case "created_asc": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        case "price_asc": return a.price - b.price;
        case "price_desc": return b.price - a.price;
        case "stock_asc": return a.stock - b.stock;
        case "stock_desc": return b.stock - a.stock;
        case "created_desc":
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return sorted;
  })();

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [search, filterCategory, filterApproval, sortBy, pageSize]);

  const approveProducts = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("products")
      .update({ approval_status: "approved", is_active: true, rejection_reason: null } as any)
      .in("id", ids);
    if (error) { toast({ title: "Approve failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: ids.length > 1 ? `Approved ${ids.length} products` : "Product approved" });
    setSelectedIds((s) => s.filter((id) => !ids.includes(id)));
    fetchData();
  };
  const approveProduct = (id: string) => approveProducts([id]);

  const openRejectDialog = (ids: string[]) => {
    if (ids.length === 0) return;
    setRejectReason("");
    setRejectDialog({ ids });
  };
  const rejectProduct = (id: string) => openRejectDialog([id]);

  const submitReject = async () => {
    if (!rejectDialog) return;
    const reason = rejectReason.trim() || "Not specified";
    const { error } = await supabase
      .from("products")
      .update({ approval_status: "rejected", is_active: false, rejection_reason: reason } as any)
      .in("id", rejectDialog.ids);
    if (error) { toast({ title: "Reject failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: rejectDialog.ids.length > 1 ? `Rejected ${rejectDialog.ids.length} products` : "Product rejected" });
    setSelectedIds((s) => s.filter((id) => !rejectDialog.ids.includes(id)));
    setRejectDialog(null);
    fetchData();
  };


  const getCategoryNames = (productId: string, primaryCatId: string | null) => {
    const catIds = productCategoryMap[productId] || (primaryCatId ? [primaryCatId] : []);
    return catIds.map(id => categories.find(c => c.id === id)?.name).filter(Boolean).join(", ") || "—";
  };

  const toggleCategory = (catId: string) => {
    setForm(prev => {
      const ids = prev.category_ids.includes(catId)
        ? prev.category_ids.filter(id => id !== catId)
        : [...prev.category_ids, catId];
      return { ...prev, category_ids: ids, category_id: ids[0] || "" };
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl sm:text-2xl font-display font-bold">Products</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Product</Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-0.5rem)] max-w-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-3 sm:p-6">
            <DialogHeader className="pr-8">
              <DialogTitle className="text-base sm:text-lg truncate">{editing ? "Edit Product" : "New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 min-w-0 w-full overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2 sm:col-span-2 min-w-0">
                  <Label>Name *</Label>
                  <Input style={{ fontSize: 16 }} className="w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })} required />
                </div>
                <div className="space-y-2 sm:col-span-2 min-w-0">
                  <Label>Slug</Label>
                  <Input style={{ fontSize: 16 }} className="w-full" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label>Sale Price (৳)</Label>
                  <Input style={{ fontSize: 16 }} className="w-full" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
                  <p className="text-[11px] text-muted-foreground leading-tight">Customer pays this</p>
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label>Regular Price (৳)</Label>
                  <Input
                    style={{ fontSize: 16 }}
                    className="w-full"
                    type="number"
                    step="0.01"
                    value={form.original_price}
                    onChange={(e) => setForm({ ...form, original_price: parseFloat(e.target.value) || 0 })}
                    placeholder="0 = no discount"
                  />
                  {form.original_price > 0 && form.original_price <= form.price ? (
                    <p className="text-[11px] text-destructive leading-tight">⚠ Must be higher than Sale Price</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground leading-tight">Higher than Sale Price for discount</p>
                  )}
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label>Seller Price (৳)</Label>
                  <Input
                    style={{ fontSize: 16 }}
                    className="w-full"
                    type="number"
                    step="0.01"
                    value={form.seller_price}
                    onChange={(e) => setForm({ ...form, seller_price: parseFloat(e.target.value) || 0 })}
                    placeholder="Amount seller receives"
                  />
                  <p className="text-[11px] text-muted-foreground leading-tight">Amount paid to the seller per unit (e.g. 1250 of a 1350 sale)</p>
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Stock</Label>
                  <Input style={{ fontSize: 16 }} className="w-full" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Delivery Time (Display Badge)</Label>
                  <Input style={{ fontSize: 16 }} className="w-full" value={form.delivery_time} onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} placeholder="e.g. 2 Hours" />
                </div>
              </div>


              {/* City-level exclusions are managed at the Subcategory level (Admin → Categories → Subcategory edit). */}



              {/* Delivery is now controlled globally in Settings → Delivery Presets. */}
              {/* Categories with Checkboxes */}
              <div className="space-y-3">
                <Label>Categories (select multiple)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 border border-border rounded-lg p-2 max-h-48 overflow-y-auto">
                  {categories.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 transition-colors min-w-0">
                      <Checkbox
                        checked={form.category_ids.includes(c.id)}
                        onCheckedChange={() => toggleCategory(c.id)}
                      />
                      <span className="text-sm truncate flex-1 min-w-0">{c.name}</span>
                    </label>
                  ))}
                </div>
                {form.category_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.category_ids.map(id => {
                      const cat = categories.find(c => c.id === id);
                      return cat ? (
                        <span key={id} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {cat.name} ✕
                          <button type="button" className="ml-1" onClick={() => toggleCategory(id)} />
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {filteredSubs.length > 0 && (
                <div className="space-y-2">
                  <Label>Subcategory (select multiple)</Label>
                  <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-1">
                    {filteredSubs.map((s) => (
                      <label key={s.id} className="flex items-center justify-between cursor-pointer p-2.5 rounded hover:bg-muted transition-colors border-b border-border/40 last:border-0">
                        <span className="text-sm">{s.name}</span>
                        <Checkbox
                          checked={form.subcategory_ids.includes(s.id)}
                          onCheckedChange={(checked) => {
                            const ids = checked
                              ? [...form.subcategory_ids, s.id]
                              : form.subcategory_ids.filter(id => id !== s.id);
                            setForm({ ...form, subcategory_ids: ids });
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  {form.subcategory_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {form.subcategory_ids.map(sid => {
                        const sub = subcategories.find(s => s.id === sid);
                        return sub ? (
                          <span key={sid} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">
                            {sub.name}
                            <button type="button" onClick={() => setForm({ ...form, subcategory_ids: form.subcategory_ids.filter(id => id !== sid) })} className="hover:text-destructive">×</button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* AI Content Generator */}
              <div className="space-y-3 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <Label className="font-semibold">AI Content Generator</Label>
                  <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">Beta</span>
                </div>
                <p className="text-xs text-muted-foreground">Auto-fill descriptions, SEO title, meta and tags from the product name.</p>
                <Input
                  value={aiKeywords}
                  onChange={(e) => setAiKeywords(e.target.value)}
                  placeholder="Optional keywords (e.g. romantic, anniversary)"
                  className="bg-background w-full"
                  style={{ fontSize: 16 }}
                />
                <Button type="button" onClick={handleAiGenerate} disabled={aiGenerating || !form.name.trim()} className="w-full sm:w-auto">
                  {aiGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</> : <><Sparkles className="h-4 w-4 mr-2" />Generate with AI</>}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Short Description</Label>
                <RichTextEditor value={form.short_description} onChange={(html) => setForm({ ...form, short_description: html })} />
              </div>
              <div className="space-y-2">
                <Label>Long Description</Label>
                <RichTextEditor value={form.description} onChange={(html) => setForm({ ...form, description: html })} />
              </div>
              <div className="space-y-2">
                <Label>Instructions <span className="text-xs text-muted-foreground font-normal">(Care/usage instructions — leave empty for default)</span></Label>
                <RichTextEditor value={form.instructions} onChange={(html) => setForm({ ...form, instructions: html })} />
              </div>
              <div className="space-y-2">
                <Label>Delivery Info <span className="text-xs text-muted-foreground font-normal">(Custom delivery details — leave empty for default)</span></Label>
                <RichTextEditor value={form.delivery_info} onChange={(html) => setForm({ ...form, delivery_info: html })} />
              </div>
              <div className="space-y-2">
                <Label>Image</Label>
                <CloudinaryUpload
                  value={form.image_url}
                  onChange={(url) => setForm({ ...form, image_url: url })}
                  folder="products"
                  label="Upload Product Image"
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="flowers, birthday, gift" />
              </div>
              {/* Specifications */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Specifications</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, specifications: [...form.specifications, { item: "", value: "" }] })}>
                    <Plus className="h-3 w-3 mr-1" />Add
                  </Button>
                </div>
                {form.specifications.map((spec, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input placeholder="Item name" value={spec.item} onChange={(e) => {
                      const specs = [...form.specifications];
                      specs[i] = { ...specs[i], item: e.target.value };
                      setForm({ ...form, specifications: specs });
                    }} className="flex-1" />
                    <Input placeholder="Value" value={spec.value} onChange={(e) => {
                      const specs = [...form.specifications];
                      specs[i] = { ...specs[i], value: e.target.value };
                      setForm({ ...form, specifications: specs });
                    }} className="flex-1" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => {
                      setForm({ ...form, specifications: form.specifications.filter((_, idx) => idx !== i) });
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              {/* Variants */}
              <ProductVariantsManager productId={editing?.id || null} />

              {/* SEO Section */}
              <div className="space-y-4 border-t pt-4 mt-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">🔍 SEO Settings</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>SEO Title</Label>
                    <span className={`text-xs ${(form.seo_title || form.name).length > 60 ? "text-destructive" : "text-muted-foreground"}`}>
                      {(form.seo_title || form.name).length}/60
                    </span>
                  </div>
                  <Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} placeholder={form.name || "Custom SEO title..."} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Permalink (Slug)</Label>
                    <span className={`text-xs ${form.slug.length > 75 ? "text-destructive" : "text-muted-foreground"}`}>
                      {form.slug.length}/75
                    </span>
                  </div>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Meta Description</Label>
                    <span className={`text-xs ${(() => { const raw = form.seo_description || form.description; const tmp = document.createElement("div"); tmp.innerHTML = raw; return (tmp.textContent || "").length; })() > 160 ? "text-destructive" : "text-muted-foreground"}`}>
                      {(() => { const raw = form.seo_description || form.description; const tmp = document.createElement("div"); tmp.innerHTML = raw; return (tmp.textContent || "").length; })()}/160
                    </span>
                  </div>
                  <Textarea value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} placeholder={form.description || "Custom meta description..."} rows={2} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4 sm:gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_featured} onCheckedChange={(c) => setForm({ ...form, is_featured: c })} />
                  <Label>Featured</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.allow_custom_image} onCheckedChange={(c) => setForm({ ...form, allow_custom_image: c })} />
                  <Label>📷 Custom Photo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.allow_custom_text} onCheckedChange={(c) => setForm({ ...form, allow_custom_text: c })} />
                  <Label>✏️ Custom Text</Label>
                </div>
              </div>

              {/* Pre-order Section */}
              <div className="border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_preorder} onCheckedChange={(c) => setForm({ ...form, is_preorder: c })} />
                  <Label className="font-semibold">📦 Pre-order Mode</Label>
                </div>
                <p className="text-xs text-muted-foreground -mt-1">
                  Auto-enabled when stock = 0. Manual toggle works even with stock available.
                </p>
                {(form.is_preorder || form.stock <= 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Pre-order Note</Label>
                      <Input
                        value={form.preorder_note}
                        onChange={(e) => setForm({ ...form, preorder_note: e.target.value })}
                        placeholder="e.g. Ships in 7-10 days"
                        style={{ fontSize: 16 }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Advance Payment %</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={form.preorder_advance_percent}
                        onChange={(e) => setForm({ ...form, preorder_advance_percent: parseInt(e.target.value) || 50 })}
                        style={{ fontSize: 16 }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bulk / Corporate Order Section */}
              <div className="border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/10 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.bulk_order_enabled}
                    onCheckedChange={(c) => setForm({ ...form, bulk_order_enabled: c })}
                  />
                  <Label className="font-semibold">🏢 Bulk / Corporate Order</Label>
                </div>
                <p className="text-xs text-muted-foreground -mt-1">
                  Customers will see a "Request Bulk Quote" button + automatic discount tiers.
                </p>
                {form.bulk_order_enabled && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Minimum Bulk Quantity</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.bulk_min_quantity}
                        onChange={(e) => setForm({ ...form, bulk_min_quantity: parseInt(e.target.value) || 10 })}
                        style={{ fontSize: 16 }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Volume Discount Tiers (optional)</Label>
                      <div className="space-y-2">
                        {form.bulk_pricing_tiers.map((t, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <Input
                              type="number"
                              min={1}
                              placeholder="Min Qty"
                              value={t.min_qty}
                              onChange={(e) => {
                                const tiers = [...form.bulk_pricing_tiers];
                                tiers[idx] = { ...tiers[idx], min_qty: parseInt(e.target.value) || 0 };
                                setForm({ ...form, bulk_pricing_tiers: tiers });
                              }}
                              style={{ fontSize: 16 }}
                            />
                            <Input
                              type="number"
                              min={0}
                              max={90}
                              placeholder="% Off"
                              value={t.discount_percent}
                              onChange={(e) => {
                                const tiers = [...form.bulk_pricing_tiers];
                                tiers[idx] = { ...tiers[idx], discount_percent: parseInt(e.target.value) || 0 };
                                setForm({ ...form, bulk_pricing_tiers: tiers });
                              }}
                              style={{ fontSize: 16 }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setForm({ ...form, bulk_pricing_tiers: form.bulk_pricing_tiers.filter((_, i) => i !== idx) })}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setForm({ ...form, bulk_pricing_tiers: [...form.bulk_pricing_tiers, { min_qty: 10, discount_percent: 5 }] })}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Tier
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Example: 10 units → 5% off, 50 units → 15% off. Discount auto-applies in cart.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterApproval} onValueChange={setFilterApproval}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Approval" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All approval</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">Newest first</SelectItem>
            <SelectItem value="created_asc">Oldest first</SelectItem>
            <SelectItem value="name_asc">Name A→Z</SelectItem>
            <SelectItem value="name_desc">Name Z→A</SelectItem>
            <SelectItem value="price_desc">Price high→low</SelectItem>
            <SelectItem value="price_asc">Price low→high</SelectItem>
            <SelectItem value="stock_desc">Stock high→low</SelectItem>
            <SelectItem value="stock_asc">Stock low→high</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar */}
      <div className="mb-4 border border-border rounded-lg bg-muted/20 p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedIds.length > 0 && pageItems.every((p) => selectedIds.includes(p.id))}
            onCheckedChange={(c) => {
              const ids = pageItems.map((p) => p.id);
              setSelectedIds(c ? Array.from(new Set([...selectedIds, ...ids])) : selectedIds.filter((id) => !ids.includes(id)));
            }}
          />
          <span className="text-sm font-medium">
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : "Select page"}
          </span>
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => approveProducts(selectedIds)}>
              Approve selected
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => openRejectDialog(selectedIds)}>
              Reject selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear</Button>
          </div>
        )}
      </div>


      {/* Mobile Card Layout */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-14 w-14 bg-muted rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : pageItems.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No products found.</CardContent></Card>
        ) : (
          pageItems.map((p) => (
            <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-start gap-3 p-3">
                  <Checkbox
                    className="mt-1"
                    checked={selectedIds.includes(p.id)}
                    onCheckedChange={(c) =>
                      setSelectedIds(c ? [...selectedIds, p.id] : selectedIds.filter((id) => id !== p.id))
                    }
                  />
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="h-16 w-16 object-cover rounded-xl shrink-0 border border-border" />
                  ) : (
                    <div className="h-16 w-16 bg-muted rounded-xl shrink-0 flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2">{p.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-bold text-sm text-primary">{formatCurrency(p.price)}</span>
                          {p.original_price && p.original_price > p.price && (
                            <span className="text-xs text-muted-foreground line-through">{formatCurrency(p.original_price)}</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${p.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Stock: {p.stock}</span>
                        {p.is_featured && <span className="bg-accent/10 text-accent px-1.5 py-0.5 rounded text-[10px]">Featured</span>}
                      </div>
                      <div className="flex items-center gap-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(p.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table Layout */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-border">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex items-center gap-4 p-4"><div className="h-12 w-12 bg-muted rounded-lg animate-pulse" /><div className="h-4 flex-1 bg-muted rounded animate-pulse" /><div className="h-4 w-16 bg-muted rounded animate-pulse" /><div className="h-5 w-14 bg-muted rounded-full animate-pulse" /><div className="h-8 w-8 bg-muted rounded animate-pulse" /></div>)}</div>
          ) : pageItems.length === 0 ? (
            <p className="p-6 text-muted-foreground text-center">No products found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={pageItems.length > 0 && pageItems.every((p) => selectedIds.includes(p.id))}
                      onCheckedChange={(c) => {
                        const ids = pageItems.map((p) => p.id);
                        setSelectedIds(c ? Array.from(new Set([...selectedIds, ...ids])) : selectedIds.filter((id) => !ids.includes(id)));
                      }}
                    />
                  </TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="hidden md:table-cell">Stock</TableHead>
                  <TableHead className="hidden lg:table-cell">Categories</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((p) => (
                  <TableRow key={p.id} data-state={selectedIds.includes(p.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(p.id)}
                        onCheckedChange={(c) =>
                          setSelectedIds(c ? [...selectedIds, p.id] : selectedIds.filter((id) => id !== p.id))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {p.image_url ? <img src={p.image_url} alt="" className="h-10 w-10 object-cover rounded" /> : <div className="h-10 w-10 bg-muted rounded" />}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{p.name}</div>
                      {p.is_featured && <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">Featured</span>}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-sm">{formatCurrency(p.price)}</span>
                      {p.original_price && <span className="text-xs text-muted-foreground line-through ml-1">{formatCurrency(p.original_price)}</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{p.stock}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm max-w-[150px] truncate">{getCategoryNames(p.id, p.category_id)}</TableCell>
                    <TableCell>
                      {(() => {
                        const status = (p as any).approval_status || "approved";
                        if (status === "pending") return <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Pending</span>;
                        if (status === "rejected") return <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Rejected</span>;
                        return (
                          <span className={`text-xs px-2 py-1 rounded-full ${p.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {p.is_active ? "Active" : "Inactive"}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0">
                        {((p as any).approval_status === "pending") && (
                          <>
                            <Button variant="ghost" size="sm" className="h-8 text-emerald-700 hover:text-emerald-800" onClick={() => approveProduct(p.id)}>Approve</Button>
                            <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:text-red-700" onClick={() => rejectProduct(p.id)}>Reject</Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-[110px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <span className="px-2 text-muted-foreground">{currentPage} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
          </div>
        </div>
      )}

      {/* Shared rejection reason dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject {rejectDialog && rejectDialog.ids.length > 1 ? `${rejectDialog.ids.length} products` : "product"}</DialogTitle>
            <DialogDescription>
              Explain what's wrong. This reason is shown to the seller so they can fix and re-submit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Reason</Label>
            <Textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Images are too low resolution; price doesn't include VAT…"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={submitReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
};

export default AdminProducts;
