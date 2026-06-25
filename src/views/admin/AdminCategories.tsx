"use client";
import { useState, useEffect, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, PlusCircle, MinusCircle, ChevronDown, ChevronRight, Tag } from "lucide-react";
import { CloudinaryUpload } from "@/components/admin/CloudinaryUpload";
import { ensureAdminSession } from "@/lib/ensureAdmin";
import type { Tables } from "@/integrations/supabase/types";
import RichTextEditor from "@/components/admin/RichTextEditor";
import DeliveryExclusionsManager from "@/components/admin/DeliveryExclusionsManager";

type Category = Tables<"categories">;

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  seo_title: string | null;
  short_description: string | null;
  long_description: string | null;
  faq: any[] | null;
  display_order: number;
  is_active: boolean;
  show_in_tailored: boolean;
  show_in_shop_by_category?: boolean;
  mega_menu_group?: string | null;
  created_at: string;
  updated_at: string;
}

const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", short_description: "", long_description: "", faq: "[]", image_url: "", is_active: true, show_in_homepage: true, show_in_header: true, display_order: 0, seo_title: "", category_types: [] as string[], allow_custom_image: false, allow_custom_text: false, show_cart_addons: false, cod_enabled: true, hide_delivery_datetime: false });
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Subcategory state
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null);
  const [subForm, setSubForm] = useState({ name: "", slug: "", description: "", image_url: "", is_active: true, display_order: 0, category_id: "", seo_title: "", short_description: "", long_description: "", faq: "[]", show_in_tailored: false, show_in_shop_by_category: false, mega_menu_group: "", show_cart_addons: false, cod_enabled: true, hide_delivery_datetime: false, category_types: [] as string[] });
  const [subImageFile, setSubImageFile] = useState<File | null>(null);
  const [savingSub, setSavingSub] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const fetchCategories = async () => {
    const [catRes, subRes] = await Promise.all([
      supabase.from("categories").select("*").order("display_order"),
      supabase.from("subcategories").select("*").order("display_order"),
    ]);
    if (catRes.error) toast({ title: "Error", description: catRes.error.message, variant: "destructive" });
    else setCategories(catRes.data || []);
    if (!subRes.error) setSubcategories((subRes.data as Subcategory[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const resetForm = () => {
    setForm({ name: "", slug: "", description: "", short_description: "", long_description: "", faq: "[]", image_url: "", is_active: true, show_in_homepage: true, show_in_header: true, display_order: 0, seo_title: "", category_types: [], allow_custom_image: false, allow_custom_text: false, show_cart_addons: false, cod_enabled: true, hide_delivery_datetime: false });
    setEditing(null);
    setImageFile(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name, slug: cat.slug, description: cat.description || "",
      short_description: (cat as any).short_description || "",
      long_description: (cat as any).long_description || "",
      faq: JSON.stringify((cat as any).faq || []),
      image_url: cat.image_url || "", is_active: cat.is_active, show_in_homepage: (cat as any).show_in_homepage !== false, show_in_header: (cat as any).show_in_header !== false, display_order: cat.display_order,
      seo_title: (cat as any).seo_title || "",
      category_types: ((cat as any).category_types && (cat as any).category_types.length > 0) ? (cat as any).category_types : ((cat as any).category_type ? [(cat as any).category_type] : []),
      allow_custom_image: (cat as any).allow_custom_image || false,
      allow_custom_text: (cat as any).allow_custom_text || false,
      show_cart_addons: (cat as any).show_cart_addons || false,
      cod_enabled: (cat as any).cod_enabled !== false,
      hide_delivery_datetime: (cat as any).hide_delivery_datetime || false,
    });
    setImageFile(null);
    setDialogOpen(true);
  };

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    const { convertToWebP } = await import("@/lib/imageUtils");
    const webpFile = await convertToWebP(file);
    const path = `${folder}/${Date.now()}.webp`;
    try {
      const { uploadToCloudinary } = await import("@/lib/cloudinaryUpload");
      const res = await uploadToCloudinary(webpFile, { folder: "categories", resourceType: "image" });
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
    if (imageFile) {
      const uploaded = await uploadImage(imageFile, "categories");
      if (uploaded) imageUrl = uploaded;
    }

    const slug = form.slug || generateSlug(form.name);
    let parsedFaq: any[] = [];
    try { parsedFaq = JSON.parse(form.faq); } catch { parsedFaq = []; }
    const primaryType = form.category_types[0] || "category";
    const payload = { name: form.name.trim(), slug, description: form.description || null, short_description: form.short_description || null, long_description: form.long_description || null, faq: parsedFaq, image_url: imageUrl || null, is_active: form.is_active, show_in_homepage: form.show_in_homepage, show_in_header: form.show_in_header, display_order: form.display_order, seo_title: form.seo_title || null, category_type: primaryType, category_types: form.category_types, allow_custom_image: form.allow_custom_image, allow_custom_text: form.allow_custom_text, show_cart_addons: form.show_cart_addons, cod_enabled: form.cod_enabled, hide_delivery_datetime: form.hide_delivery_datetime } as any;

    if (editing) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Category updated" });
    } else {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Category created" });
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Category deleted" }); fetchCategories(); }
  };

  // Subcategory handlers
  const resetSubForm = () => { setSubForm({ name: "", slug: "", description: "", image_url: "", is_active: true, display_order: 0, category_id: "", seo_title: "", short_description: "", long_description: "", faq: "[]", show_in_tailored: false, show_in_shop_by_category: false, mega_menu_group: "", show_cart_addons: false, cod_enabled: true, hide_delivery_datetime: false, category_types: [] }); setEditingSub(null); setSubImageFile(null); };
  const openCreateSub = (categoryId: string) => {
    resetSubForm();
    setSubForm(prev => ({ ...prev, category_id: categoryId }));
    setSubDialogOpen(true);
  };
  const openEditSub = (sub: Subcategory) => {
    setEditingSub(sub);
    setSubForm({ name: sub.name, slug: sub.slug, description: sub.description || "", image_url: sub.image_url || "", is_active: sub.is_active, display_order: sub.display_order, category_id: sub.category_id, seo_title: sub.seo_title || "", short_description: sub.short_description || "", long_description: sub.long_description || "", faq: JSON.stringify(sub.faq || []), show_in_tailored: sub.show_in_tailored ?? false, show_in_shop_by_category: (sub as any).show_in_shop_by_category ?? false, mega_menu_group: (sub as any).mega_menu_group || "", show_cart_addons: (sub as any).show_cart_addons ?? false, cod_enabled: (sub as any).cod_enabled !== false, hide_delivery_datetime: (sub as any).hide_delivery_datetime ?? false, category_types: ((sub as any).category_types && (sub as any).category_types.length > 0) ? (sub as any).category_types : [] });
    setSubImageFile(null);
    setSubDialogOpen(true);
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subForm.name.trim() || !subForm.category_id) return;
    setSavingSub(true);

    let imageUrl = subForm.image_url;
    if (subImageFile) {
      const uploaded = await uploadImage(subImageFile, "subcategories");
      if (uploaded) imageUrl = uploaded;
    }

    const slug = subForm.slug || generateSlug(subForm.name);
    let parsedSubFaq: any[] = [];
    try { parsedSubFaq = JSON.parse(subForm.faq); } catch { parsedSubFaq = []; }
    const payload = { name: subForm.name.trim(), slug, description: subForm.description || null, image_url: imageUrl || null, is_active: subForm.is_active, display_order: subForm.display_order, category_id: subForm.category_id, seo_title: subForm.seo_title || null, short_description: subForm.short_description || null, long_description: subForm.long_description || null, faq: parsedSubFaq, show_in_tailored: subForm.show_in_tailored, show_in_shop_by_category: subForm.show_in_shop_by_category, mega_menu_group: subForm.mega_menu_group?.trim() || null, show_cart_addons: subForm.show_cart_addons, cod_enabled: subForm.cod_enabled, hide_delivery_datetime: subForm.hide_delivery_datetime, category_types: subForm.category_types } as any;

    if (editingSub) {
      const { error } = await supabase.from("subcategories").update(payload).eq("id", editingSub.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Subcategory updated" });
    } else {
      const { error } = await supabase.from("subcategories").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Subcategory created" });
    }

    setSavingSub(false);
    setSubDialogOpen(false);
    resetSubForm();
    fetchCategories();
  };

  const handleDeleteSub = async (id: string) => {
    if (!confirm("Delete this subcategory?")) return;
    const { error } = await supabase.from("subcategories").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Subcategory deleted" }); fetchCategories(); }
  };

  const toggleExpand = (catId: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
  };

  const getSubsForCat = (catId: string) => subcategories.filter(s => s.category_id === catId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-display font-bold">Categories</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Category</Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })} required />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Short Description</Label>
                <RichTextEditor value={form.short_description} onChange={(html) => setForm({ ...form, short_description: html })} />
              </div>
              <div className="space-y-2">
                <Label>Long Description</Label>
                <RichTextEditor value={form.long_description} onChange={(html) => setForm({ ...form, long_description: html })} />
              </div>
              {/* SEO Section */}
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>SEO Title</Label>
                    <span className={`text-xs ${(form.seo_title || "").length > 60 ? "text-destructive" : "text-muted-foreground"}`}>{(form.seo_title || "").length} / 60</span>
                  </div>
                  <Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} placeholder="SEO title for search results" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Permalink</Label>
                    <span className={`text-xs ${(form.slug || "").length > 75 ? "text-destructive" : "text-muted-foreground"}`}>{(form.slug || "").length} / 75</span>
                  </div>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Meta Description</Label>
                    <span className={`text-xs ${(form.description || "").length > 160 ? "text-destructive" : "text-muted-foreground"}`}>{(form.description || "").length} / 160</span>
                  </div>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Meta description for SEO" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Image</Label>
                <CloudinaryUpload
                  value={form.image_url}
                  onChange={(url) => setForm({ ...form, image_url: url })}
                  folder="categories"
                  label="Upload Category Image"
                />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.show_cart_addons} onCheckedChange={(checked) => setForm({ ...form, show_cart_addons: checked })} />
                <Label>Show Recommended Addon Products on product pages</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.cod_enabled} onCheckedChange={(checked) => setForm({ ...form, cod_enabled: checked })} />
                <Label>Allow Cash on Delivery for this category</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.hide_delivery_datetime} onCheckedChange={(checked) => setForm({ ...form, hide_delivery_datetime: checked })} />
                <Label>Hide Delivery Date &amp; Time picker at checkout for this category</Label>
              </div>
              <div className="space-y-2">
                <Label>Category Type (select one or more)</Label>
                <div className="space-y-2 border border-input rounded-md p-3 bg-background">
                  {[
                    { value: "category", label: "Category (Shop by Category)" },
                    { value: "occasion", label: "Occasion (All Gifts Page)" },
                    { value: "tailored", label: "Tailored For Your Occasions (Homepage)" },
                    { value: "trending", label: "Trending (Homepage Tabs)" },
                  ].map((opt) => {
                    const checked = form.category_types.includes(opt.value);
                    return (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...form.category_types, opt.value]
                              : form.category_types.filter((v) => v !== opt.value);
                            setForm({ ...form, category_types: next });
                          }}
                          className="h-4 w-4 rounded border-input accent-primary"
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                    💡 How it works (একাধিক জায়গায় দেখাতে চাইলে):
                  </p>
                  <ul className="text-xs text-amber-900/90 dark:text-amber-100/90 space-y-1 list-disc pl-4">
                    <li>Want it in <b>Homepage Category Grid</b>? → Tick <b>Category</b> + turn ON <b>Show in Homepage</b></li>
                    <li>Want it in <b>Tailored Tabs</b>? → Tick <b>Tailored</b></li>
                    <li>Want it in <b>BOTH places</b>? → Tick <b>Category</b> AND <b>Tailored</b> together ✅</li>
                    <li>Want it in <b>Header Menu</b>? → Turn ON <b>Show in Header Menu</b> (independent of type)</li>
                  </ul>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-2">
                  <Switch checked={form.show_in_homepage} onCheckedChange={(checked) => setForm({ ...form, show_in_homepage: checked })} />
                  <Label>Show in Homepage</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.show_in_header} onCheckedChange={(checked) => setForm({ ...form, show_in_header: checked })} />
                  <Label>Show in Header Menu</Label>
                </div>
              </div>
              {/* FAQ Section */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">FAQ</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const faqs = JSON.parse(form.faq || "[]");
                    faqs.push({ question: "", answer: "" });
                    setForm({ ...form, faq: JSON.stringify(faqs) });
                  }}>
                    <PlusCircle className="h-4 w-4 mr-1" /> Add FAQ
                  </Button>
                </div>
                {(() => {
                  let faqs: { question: string; answer: string }[] = [];
                  try { faqs = JSON.parse(form.faq || "[]"); } catch { faqs = []; }
                  return faqs.map((faq, idx) => (
                    <div key={idx} className="space-y-2 p-3 border rounded-lg bg-muted/30 relative pr-10">
                      <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => {
                        const updated = [...faqs]; updated.splice(idx, 1);
                        setForm({ ...form, faq: JSON.stringify(updated) });
                      }}>
                        <MinusCircle className="h-4 w-4 text-destructive" />
                      </Button>
                      <Input placeholder="Question" value={faq.question} onChange={(e) => {
                        const updated = [...faqs]; updated[idx] = { ...updated[idx], question: e.target.value };
                        setForm({ ...form, faq: JSON.stringify(updated) });
                      }} />
                      <Textarea placeholder="Answer" rows={2} value={faq.answer} onChange={(e) => {
                        const updated = [...faqs]; updated[idx] = { ...updated[idx], answer: e.target.value };
                        setForm({ ...form, faq: JSON.stringify(updated) });
                      }} />
                    </div>
                  ));
                })()}
              </div>
              <div className="border-t pt-4 space-y-2">
                <Label className="text-base font-semibold">Delivery Exclusions</Label>
                <p className="text-xs text-muted-foreground">
                  Block a delivery mode (e.g. Fast Delivery) for specific cities/upazilas. All products in this category will auto-fallback to the next mode.
                </p>
                {editing ? (
                  <DeliveryExclusionsManager scope="category" scopeId={editing.id} />
                ) : (
                  <p className="text-xs text-amber-600">Save the category first, then re-open it to add exclusions.</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Subcategory Dialog */}
      <Dialog open={subDialogOpen} onOpenChange={(open) => { setSubDialogOpen(open); if (!open) resetSubForm(); }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingSub ? "Edit Subcategory" : "New Subcategory"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value, slug: generateSlug(e.target.value) })} required />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={subForm.slug} onChange={(e) => setSubForm({ ...subForm, slug: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Short Description</Label>
              <RichTextEditor value={subForm.short_description} onChange={(html) => setSubForm({ ...subForm, short_description: html })} />
            </div>
            <div className="space-y-2">
              <Label>Long Description</Label>
              <RichTextEditor value={subForm.long_description} onChange={(html) => setSubForm({ ...subForm, long_description: html })} />
            </div>
            {/* SEO Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>SEO Title</Label>
                  <span className={`text-xs ${(subForm.seo_title || "").length > 60 ? "text-destructive" : "text-muted-foreground"}`}>{(subForm.seo_title || "").length} / 60</span>
                </div>
                <Input value={subForm.seo_title} onChange={(e) => setSubForm({ ...subForm, seo_title: e.target.value })} placeholder="SEO title for search results" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Permalink</Label>
                  <span className={`text-xs ${(subForm.slug || "").length > 75 ? "text-destructive" : "text-muted-foreground"}`}>{(subForm.slug || "").length} / 75</span>
                </div>
                <Input value={subForm.slug} onChange={(e) => setSubForm({ ...subForm, slug: e.target.value })} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Meta Description</Label>
                  <span className={`text-xs ${(subForm.description || "").length > 160 ? "text-destructive" : "text-muted-foreground"}`}>{(subForm.description || "").length} / 160</span>
                </div>
                <Textarea value={subForm.description} onChange={(e) => setSubForm({ ...subForm, description: e.target.value })} rows={3} placeholder="Meta description for SEO" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              <CloudinaryUpload
                value={subForm.image_url}
                onChange={(url) => setSubForm({ ...subForm, image_url: url })}
                folder="subcategories"
                label="Upload Subcategory Image"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input type="number" value={subForm.display_order} onChange={(e) => setSubForm({ ...subForm, display_order: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Mega Menu Group <span className="text-xs text-muted-foreground font-normal">(optional, e.g. "Collection", "Shop By Flower Type", "Cities")</span></Label>
              <Input
                value={subForm.mega_menu_group}
                onChange={(e) => setSubForm({ ...subForm, mega_menu_group: e.target.value })}
                placeholder="Group label shown as a bold non-clickable header in the mega menu"
              />
              <p className="text-xs text-muted-foreground">Subcategories sharing the same group label will be listed under one bold header in the website's category dropdown.</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={subForm.is_active} onCheckedChange={(c) => setSubForm({ ...subForm, is_active: c })} />
              <Label>Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={subForm.show_cart_addons} onCheckedChange={(c) => setSubForm({ ...subForm, show_cart_addons: c })} />
              <Label>Show Recommended Addon Products on product pages</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={subForm.cod_enabled} onCheckedChange={(c) => setSubForm({ ...subForm, cod_enabled: c })} />
              <Label>Allow Cash on Delivery for this subcategory</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={subForm.hide_delivery_datetime} onCheckedChange={(c) => setSubForm({ ...subForm, hide_delivery_datetime: c })} />
              <Label>Hide Delivery Date &amp; Time picker at checkout for this subcategory</Label>
            </div>
            <div className="space-y-2">
              <Label>Subcategory Type (select one or more)</Label>
              <div className="space-y-2 border border-input rounded-md p-3 bg-background">
                {[
                  { value: "category", label: "Category (Shop by Category)" },
                  { value: "occasion", label: "Occasion (All Gifts Page)" },
                  { value: "tailored", label: "Tailored For Your Occasions (Homepage)" },
                  { value: "trending", label: "Trending (Homepage Tabs)" },
                ].map((opt) => {
                  const checked = subForm.category_types.includes(opt.value);
                  return (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...subForm.category_types, opt.value]
                            : subForm.category_types.filter((v) => v !== opt.value);
                          setSubForm({ ...subForm, category_types: next });
                        }}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={subForm.show_in_tailored} onCheckedChange={(c) => setSubForm({ ...subForm, show_in_tailored: c })} />
              <Label>Show in Tailored Occasions</Label>
              <span className="text-xs text-muted-foreground">(adds this subcategory as a tab on homepage)</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={subForm.show_in_shop_by_category} onCheckedChange={(c) => setSubForm({ ...subForm, show_in_shop_by_category: c })} />
              <Label>Show in Shop by Category</Label>
              <span className="text-xs text-muted-foreground">(adds this subcategory as an item in the homepage "Shop by Category" grid)</span>
            </div>
            <div className="border-t pt-4 space-y-2">
              <Label className="text-base font-semibold">Delivery Exclusions</Label>
              <p className="text-xs text-muted-foreground">
                Block a delivery mode (e.g. Fast Delivery) for specific cities. All products in this subcategory will auto-fallback to the next mode.
              </p>
              {editingSub ? (
                <DeliveryExclusionsManager scope="subcategory" scopeId={editingSub.id} />
              ) : (
                <p className="text-xs text-amber-600">Save the subcategory first, then re-open it to add exclusions.</p>
              )}
            </div>
            {/* FAQ Section */}

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">FAQ</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  const faqs = JSON.parse(subForm.faq || "[]");
                  faqs.push({ question: "", answer: "" });
                  setSubForm({ ...subForm, faq: JSON.stringify(faqs) });
                }}>
                  <PlusCircle className="h-4 w-4 mr-1" /> Add FAQ
                </Button>
              </div>
              {(() => {
                let faqs: { question: string; answer: string }[] = [];
                try { faqs = JSON.parse(subForm.faq || "[]"); } catch { faqs = []; }
                return faqs.map((faq, idx) => (
                  <div key={idx} className="space-y-2 p-3 border rounded-lg bg-muted/30 relative pr-10">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => {
                      const updated = [...faqs]; updated.splice(idx, 1);
                      setSubForm({ ...subForm, faq: JSON.stringify(updated) });
                    }}>
                      <MinusCircle className="h-4 w-4 text-destructive" />
                    </Button>
                    <Input placeholder="Question" value={faq.question} onChange={(e) => {
                      const updated = [...faqs]; updated[idx] = { ...updated[idx], question: e.target.value };
                      setSubForm({ ...subForm, faq: JSON.stringify(updated) });
                    }} />
                    <Textarea placeholder="Answer" rows={2} value={faq.answer} onChange={(e) => {
                      const updated = [...faqs]; updated[idx] = { ...updated[idx], answer: e.target.value };
                      setSubForm({ ...subForm, faq: JSON.stringify(updated) });
                    }} />
                  </div>
                ));
              })()}
            </div>
            <Button type="submit" className="w-full" disabled={savingSub}>{savingSub ? "Saving..." : editingSub ? "Update" : "Create"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mobile Card Layout */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-12 w-12 bg-muted rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : categories.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No categories yet.</CardContent></Card>
        ) : (
          categories.map((cat) => {
            const subs = getSubsForCat(cat.id);
            const isExpanded = expandedCats.has(cat.id);
            return (
              <Card key={cat.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 p-3">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt="" className="h-12 w-12 object-cover rounded-xl shrink-0 border border-border" />
                    ) : (
                      <div className="h-12 w-12 bg-muted rounded-xl shrink-0 flex items-center justify-center">
                        <Tag className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {subs.length > 0 && (
                          <button onClick={() => toggleExpand(cat.id)} className="p-0.5 hover:bg-muted rounded shrink-0">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        )}
                        <h3 className="font-semibold text-sm truncate">{cat.name}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${cat.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {cat.is_active ? "Active" : "Inactive"}
                        </span>
                        {subs.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">{subs.length} subs</span>
                        )}
                        <span className="text-[10px] text-muted-foreground capitalize truncate">
                          {((cat as any).category_types && (cat as any).category_types.length > 0 ? (cat as any).category_types : [(cat as any).category_type || "category"]).join(", ")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(cat.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                  {/* Expanded subcategories */}
                  {isExpanded && subs.length > 0 && (
                    <div className="border-t border-border bg-muted/20 divide-y divide-border">
                      {subs.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-3 px-3 py-2.5 pl-8">
                          {sub.image_url ? (
                            <img src={sub.image_url} alt="" className="h-8 w-8 object-cover rounded-lg shrink-0" />
                          ) : (
                            <div className="h-8 w-8 bg-muted rounded-lg shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">↳ {sub.name}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${sub.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                              {sub.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="flex items-center gap-0 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSub(sub)}><Pencil className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteSub(sub.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        </div>
                      ))}
                      <div className="px-3 py-2">
                        <Button variant="ghost" size="sm" className="text-xs w-full" onClick={() => openCreateSub(cat.id)}>
                          <PlusCircle className="h-3 w-3 mr-1" /> Add Subcategory
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Desktop Table Layout */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-border">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-4 p-4"><div className="h-10 w-10 bg-muted rounded-lg animate-pulse" /><div className="h-4 flex-1 bg-muted rounded animate-pulse" /><div className="h-5 w-16 bg-muted rounded-full animate-pulse" /><div className="h-8 w-8 bg-muted rounded animate-pulse" /></div>)}</div>
          ) : categories.length === 0 ? (
            <p className="p-6 text-muted-foreground text-center">No categories yet. Add your first category!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Slug</TableHead>
                  <TableHead>Subs</TableHead>
                  <TableHead className="hidden md:table-cell">Homepage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => {
                  const subs = getSubsForCat(cat.id);
                  const isExpanded = expandedCats.has(cat.id);
                  return (
                    <Fragment key={cat.id}>
                      <TableRow>
                        <TableCell><GripVertical className="h-4 w-4 text-muted-foreground" /></TableCell>
                        <TableCell>
                          {cat.image_url ? <img src={cat.image_url} alt="" className="h-10 w-10 object-cover rounded" /> : <div className="h-10 w-10 bg-muted rounded" />}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {subs.length > 0 && (
                              <button onClick={() => toggleExpand(cat.id)} className="p-0.5 hover:bg-muted rounded">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            )}
                            <span className="font-medium text-sm">{cat.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm capitalize">
                          {((cat as any).category_types && (cat as any).category_types.length > 0 ? (cat as any).category_types : [(cat as any).category_type || "category"]).join(", ")}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{cat.slug}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => openCreateSub(cat.id)}>
                            <PlusCircle className="h-3 w-3 mr-1" />{subs.length > 0 ? `${subs.length} subs` : "Add sub"}
                          </Button>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className={`text-xs px-2 py-1 rounded-full ${(cat as any).show_in_homepage !== false ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                            {(cat as any).show_in_homepage !== false ? "Yes" : "No"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${cat.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {cat.is_active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && subs.map((sub) => (
                        <TableRow key={sub.id} className="bg-muted/30 hover:bg-muted/50 border-l-4 border-l-primary/60">
                          <TableCell className="py-3">
                            <div className="mx-auto h-full w-px bg-border" />
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="pl-4">
                              {sub.image_url
                                ? <img src={sub.image_url} alt="" className="h-8 w-8 object-cover rounded-md border border-border bg-background" />
                                : <div className="h-8 w-8 bg-background rounded-md border border-border" />}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 border-l-2 border-b-2 border-border rounded-bl-lg -mt-3" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground leading-none mb-1 truncate">
                                  Child of {cat.name}
                                </span>
                                <span className="text-sm font-semibold text-foreground/80 truncate">{sub.name}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell py-3">
                            <span className="text-[11px] font-medium text-muted-foreground bg-background border border-border px-2 py-0.5 rounded">
                              Sub-category
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell py-3 text-xs text-muted-foreground font-mono">{sub.slug}</TableCell>
                          <TableCell className="py-3">
                            <span className="text-[10px] text-muted-foreground/70 font-medium italic">Inherited</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell py-3 text-muted-foreground/60 text-xs">—</TableCell>
                          <TableCell className="py-3">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full border ${sub.is_active ? "bg-background border-border text-foreground/70" : "bg-muted border-border text-muted-foreground"}`}>
                              {sub.is_active ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <div className="flex items-center justify-end gap-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSub(sub)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteSub(sub.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCategories;
