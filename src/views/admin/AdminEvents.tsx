import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, Tag, CalendarCheck, Search, PlusCircle, X } from "lucide-react";
import { CloudinaryUpload } from "@/components/admin/CloudinaryUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import PageContentEditor from "@/components/admin/PageContentEditor";


// ─── FAQ Manager Component ───
const FAQManager = ({ faqs, onChange }: { faqs: { question: string; answer: string }[]; onChange: (v: { question: string; answer: string }[]) => void }) => {
  const addFaq = () => onChange([...faqs, { question: "", answer: "" }]);
  const removeFaq = (i: number) => onChange(faqs.filter((_, idx) => idx !== i));
  const updateFaq = (i: number, field: "question" | "answer", value: string) => {
    const updated = [...faqs];
    updated[i] = { ...updated[i], [field]: value };
    onChange(updated);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <Label className="text-sm font-semibold">FAQ</Label>
        <Button type="button" variant="outline" size="sm" onClick={addFaq}>
          <PlusCircle className="w-4 h-4 mr-1" /> Add FAQ
        </Button>
      </div>
      {faqs.map((faq, i) => (
        <div key={i} className="border border-border rounded-lg p-3 mb-2 space-y-2 bg-muted/20">
          <div className="flex justify-between items-start">
            <Label className="text-xs text-muted-foreground">Question {i + 1}</Label>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFaq(i)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
          <Input placeholder="Question" value={faq.question} onChange={e => updateFaq(i, "question", e.target.value)} />
          <Textarea placeholder="Answer" value={faq.answer} onChange={e => updateFaq(i, "answer", e.target.value)} rows={2} />
        </div>
      ))}
      {faqs.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No FAQs added yet</p>}
    </div>
  );
};

// ─── Event Categories Tab ───
const CategoriesTab = () => {
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", description: "", short_description: "", long_description: "",
    image_url: "", icon: "", display_order: 0, is_active: true,
    seo_title: "", seo_description: "", faq: [] as { question: string; answer: string }[]
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-event-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("event_categories").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (editItem) {
        const { error } = await supabase.from("event_categories").update(values).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("event_categories").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-event-categories"] }); setShowForm(false); setEditItem(null); toast.success("Saved successfully"); },
    onError: () => toast.error("Something went wrong"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-event-categories"] }); toast.success("Deleted"); },
  });

  const parseFaq = (faq: any): { question: string; answer: string }[] => {
    if (!faq) return [];
    if (Array.isArray(faq)) return faq.map((f: any) => ({ question: f.question || "", answer: f.answer || "" }));
    return [];
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      name: item.name, slug: item.slug, description: item.description || "",
      short_description: item.short_description || "", long_description: item.long_description || "",
      image_url: item.image_url || "", icon: item.icon || "", display_order: item.display_order,
      is_active: item.is_active, seo_title: item.seo_title || "", seo_description: item.seo_description || "",
      faq: parseFaq(item.faq)
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditItem(null);
    setForm({
      name: "", slug: "", description: "", short_description: "", long_description: "",
      image_url: "", icon: "", display_order: 0, is_active: true,
      seo_title: "", seo_description: "", faq: []
    });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-foreground">Event Categories</h3>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add New</Button>
      </div>
      {isLoading ? <p>Loading...</p> : (
        <div className="space-y-2">
          {categories.map((cat: any) => (
            <div key={cat.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
              <div className="flex items-center gap-3">
                {cat.image_url && <img src={cat.image_url} alt="" className="w-10 h-10 rounded object-cover" />}
                <div>
                  <p className="font-medium text-sm text-foreground">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">/{cat.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={cat.is_active ? "default" : "secondary"}>{cat.is_active ? "Active" : "Inactive"}</Badge>
                <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this category?")) deleteMutation.mutate(cat.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          {categories.length === 0 && <p className="text-center text-muted-foreground py-6">No categories yet</p>}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            {/* Basic Info */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</Label>
              <div className="mt-2 space-y-3">
                <div>
                  <Label className="text-sm">Name</Label>
                  <Input placeholder="Category Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value, slug: p.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") }))} required />
                </div>
                <div>
                  <Label className="text-sm">Description</Label>
                  <Textarea placeholder="Brief description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Short & Long Description */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content</Label>
              <div className="mt-2 space-y-3">
                <div>
                  <Label className="text-sm">Short Description</Label>
                  <RichTextEditor value={form.short_description} onChange={v => setForm(p => ({ ...p, short_description: v }))} />
                </div>
                <div>
                  <Label className="text-sm">Long Description</Label>
                  <RichTextEditor value={form.long_description} onChange={v => setForm(p => ({ ...p, long_description: v }))} />
                </div>
              </div>
            </div>

            <Separator />

            {/* SEO Section */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Search className="w-3 h-3" /> SEO Settings
              </Label>
              <div className="mt-2 space-y-3">

                <div>
                  <div className="flex justify-between">
                    <Label className="text-sm">SEO Title</Label>
                    <span className="text-xs text-muted-foreground">{form.seo_title.length} / 60</span>
                  </div>
                  <Input placeholder="SEO title for search results" value={form.seo_title} onChange={e => setForm(p => ({ ...p, seo_title: e.target.value.slice(0, 60) }))} maxLength={60} />
                </div>

                <div>
                  <div className="flex justify-between">
                    <Label className="text-sm">Permalink</Label>
                    <span className="text-xs text-muted-foreground">{form.slug.length} / 75</span>
                  </div>
                  <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} maxLength={75} required />
                </div>

                <div>
                  <div className="flex justify-between">
                    <Label className="text-sm">Meta Description</Label>
                    <span className="text-xs text-muted-foreground">{form.seo_description.length} / 160</span>
                  </div>
                  <Textarea placeholder="Meta description for SEO" value={form.seo_description} onChange={e => setForm(p => ({ ...p, seo_description: e.target.value.slice(0, 160) }))} maxLength={160} rows={3} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Image & Settings */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Media & Settings</Label>
              <div className="mt-2 space-y-3">
                <div>
                  <Label className="text-sm">Image</Label>
                  <CloudinaryUpload value={form.image_url} onChange={(url) => setForm(p => ({ ...p, image_url: url }))} folder="events" label="Upload Category Image" />
                </div>
                <div>
                  <Label className="text-sm">Display Order</Label>
                  <Input type="number" value={form.display_order} onChange={e => setForm(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                  <span className="text-sm">Active</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* FAQ */}
            <FAQManager faqs={form.faq} onChange={faq => setForm(p => ({ ...p, faq }))} />

            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Create"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Event Packages Tab ───
const PackagesTab = () => {
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    category_id: "", name: "", description: "", price: 0, original_price: "",
    features: "", image_url: "", is_featured: false, is_active: true, display_order: 0,
    seo_title: "", seo_description: ""
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-event-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("event_categories").select("id, name").order("display_order");
      return data || [];
    },
  });

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["admin-event-packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("event_packages").select("*, event_categories(name)").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      const featuresList = values.features ? values.features.split("\n").filter((f: string) => f.trim()).map((f: string) => f.trim()) : [];
      const payload = { ...values, features: featuresList, original_price: values.original_price ? parseFloat(values.original_price) : null };
      delete (payload as any).features_text;
      if (editItem) {
        const { error } = await supabase.from("event_packages").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("event_packages").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-event-packages"] }); setShowForm(false); setEditItem(null); toast.success("Saved successfully"); },
    onError: () => toast.error("Something went wrong"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-event-packages"] }); toast.success("Deleted"); },
  });

  const openEdit = (item: any) => {
    const featuresText = Array.isArray(item.features) ? item.features.join("\n") : "";
    setEditItem(item);
    setForm({
      category_id: item.category_id, name: item.name, description: item.description || "",
      price: item.price, original_price: item.original_price?.toString() || "",
      features: featuresText, image_url: item.image_url || "", is_featured: item.is_featured,
      is_active: item.is_active, display_order: item.display_order,
      seo_title: item.seo_title || "", seo_description: item.seo_description || ""
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditItem(null);
    setForm({
      category_id: categories[0]?.id || "", name: "", description: "", price: 0, original_price: "",
      features: "", image_url: "", is_featured: false, is_active: true, display_order: 0,
      seo_title: "", seo_description: ""
    });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-foreground">Event Packages</h3>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New Package</Button>
      </div>
      {isLoading ? <p>Loading...</p> : (
        <div className="space-y-2">
          {packages.map((pkg: any) => (
            <div key={pkg.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
              <div className="flex items-center gap-3">
                {pkg.image_url && <img src={pkg.image_url} alt="" className="w-10 h-10 rounded object-cover" />}
                <div>
                  <p className="font-medium text-sm text-foreground">{pkg.name}</p>
                  <p className="text-xs text-muted-foreground">{(pkg as any).event_categories?.name} • ৳{pkg.price}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pkg.is_featured && <Badge>Featured</Badge>}
                <Badge variant={pkg.is_active ? "default" : "secondary"}>{pkg.is_active ? "Active" : "Inactive"}</Badge>
                <Button variant="ghost" size="icon" onClick={() => openEdit(pkg)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this package?")) deleteMutation.mutate(pkg.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          {packages.length === 0 && <p className="text-center text-muted-foreground py-6">No packages yet</p>}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "Edit Package" : "New Package"}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            {/* Basic Info */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</Label>
              <div className="mt-2 space-y-3">
                <div>
                  <Label className="text-sm">Category</Label>
                  <select className="w-full border border-border rounded-md p-2 bg-background text-foreground text-sm" value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))} required>
                    <option value="">Select Category</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-sm">Package Name</Label>
                  <Input placeholder="Package Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div>
                  <Label className="text-sm">Description</Label>
                  <Textarea placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Price</Label>
                    <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} required />
                  </div>
                  <div>
                    <Label className="text-sm">Original Price (optional)</Label>
                    <Input value={form.original_price} onChange={e => setForm(p => ({ ...p, original_price: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Features (one per line)</Label>
                  <Textarea placeholder="Stage Decoration&#10;Flower Setup&#10;Lighting" value={form.features} onChange={e => setForm(p => ({ ...p, features: e.target.value }))} rows={4} />
                </div>
              </div>
            </div>

            <Separator />

            {/* SEO Section */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Search className="w-3 h-3" /> SEO Settings
              </Label>
              <div className="mt-2 space-y-3">

                <div>
                  <div className="flex justify-between">
                    <Label className="text-sm">SEO Title</Label>
                    <span className="text-xs text-muted-foreground">{form.seo_title.length} / 60</span>
                  </div>
                  <Input placeholder="SEO title for search results" value={form.seo_title} onChange={e => setForm(p => ({ ...p, seo_title: e.target.value.slice(0, 60) }))} maxLength={60} />
                </div>

                <div>
                  <div className="flex justify-between">
                    <Label className="text-sm">Meta Description</Label>
                    <span className="text-xs text-muted-foreground">{form.seo_description.length} / 160</span>
                  </div>
                  <Textarea placeholder="Meta description for SEO" value={form.seo_description} onChange={e => setForm(p => ({ ...p, seo_description: e.target.value.slice(0, 160) }))} maxLength={160} rows={3} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Media & Settings */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Media & Settings</Label>
              <div className="mt-2 space-y-3">
                <CloudinaryUpload value={form.image_url} onChange={(url) => setForm(p => ({ ...p, image_url: url }))} folder="event-packages" label="Upload Package Image" />
                <div>
                  <Label className="text-sm">Display Order</Label>
                  <Input type="number" value={form.display_order} onChange={e => setForm(p => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={v => setForm(p => ({ ...p, is_featured: v }))} /><span className="text-sm">Featured</span></div>
                  <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} /><span className="text-sm">Active</span></div>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Event Bookings Tab ───
const BookingsTab = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["admin-event-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("event_bookings").select("*, event_packages(name), event_categories(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("event_bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-event-bookings"] }); toast.success("Updated successfully"); },
  });

  const statusColors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-blue-100 text-blue-800", completed: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800" };

  const filtered = bookings.filter((b: any) => {
    const matchesSearch = !searchTerm || b.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || b.booking_number?.toLowerCase().includes(searchTerm.toLowerCase()) || b.customer_phone?.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, booking#..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <p className="text-xs text-muted-foreground mb-3">{filtered.length} booking(s) found</p>

      {isLoading ? <p>Loading...</p> : (
        <div className="space-y-3">
          {filtered.map((b: any) => (
            <div key={b.id} className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedBooking(b)}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-foreground text-sm">{b.booking_number}</p>
                  <p className="text-xs text-muted-foreground">{b.customer_name} • {b.customer_phone}</p>
                  {b.customer_email && <p className="text-xs text-muted-foreground">📧 {b.customer_email}</p>}
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[b.status] || "bg-muted text-foreground"}`}>{b.status}</span>
                  <p className="text-sm font-semibold text-foreground mt-1">৳{b.total?.toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                <p>📅 {b.event_date}</p>
                <p>👥 {b.guest_count || "N/A"} guests</p>
                <p>📦 {(b as any).event_packages?.name || "N/A"}</p>
                <p>📁 {(b as any).event_categories?.name || "N/A"}</p>
                <p className="col-span-2">📍 {b.venue_address}</p>
              </div>
              <div className="flex gap-2">
                {["pending", "confirmed", "completed", "cancelled"].map(s => (
                  <Button key={s} size="sm" variant={b.status === s ? "default" : "outline"} className="text-xs capitalize" onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: b.id, status: s }); }}>{s}</Button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-6">No bookings found</p>}
        </div>
      )}

      {/* Booking Detail Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Booking Details — {selectedBooking?.booking_number}</DialogTitle></DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[selectedBooking.status] || "bg-muted text-foreground"}`}>{selectedBooking.status}</span>
                <p className="text-lg font-bold text-foreground">৳{selectedBooking.total?.toLocaleString()}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Customer</p><p className="font-medium">{selectedBooking.customer_name}</p></div>
                <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium">{selectedBooking.customer_phone}</p></div>
                {selectedBooking.customer_email && <div className="col-span-2"><p className="text-muted-foreground text-xs">Email</p><p className="font-medium">{selectedBooking.customer_email}</p></div>}
                <div><p className="text-muted-foreground text-xs">Event Date</p><p className="font-medium">{selectedBooking.event_date}</p></div>
                <div><p className="text-muted-foreground text-xs">Event Time</p><p className="font-medium">{selectedBooking.event_time || "N/A"}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground text-xs">Venue</p><p className="font-medium">{selectedBooking.venue_address}</p></div>
                <div><p className="text-muted-foreground text-xs">Guest Count</p><p className="font-medium">{selectedBooking.guest_count || "N/A"}</p></div>
                <div><p className="text-muted-foreground text-xs">Package</p><p className="font-medium">{(selectedBooking as any).event_packages?.name || "N/A"}</p></div>
                <div><p className="text-muted-foreground text-xs">Category</p><p className="font-medium">{(selectedBooking as any).event_categories?.name || "N/A"}</p></div>
                <div><p className="text-muted-foreground text-xs">Booked On</p><p className="font-medium">{new Date(selectedBooking.created_at).toLocaleDateString()}</p></div>
              </div>
              {selectedBooking.special_requests && (
                <>
                  <Separator />
                  <div><p className="text-muted-foreground text-xs mb-1">Special Requests</p><p className="text-sm">{selectedBooking.special_requests}</p></div>
                </>
              )}
              <Separator />
              <div className="flex gap-2 flex-wrap">
                {["pending", "confirmed", "completed", "cancelled"].map(s => (
                  <Button key={s} size="sm" variant={selectedBooking.status === s ? "default" : "outline"} className="text-xs capitalize" onClick={() => { updateStatus.mutate({ id: selectedBooking.id, status: s }); setSelectedBooking({ ...selectedBooking, status: s }); }}>{s}</Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Events Page SEO Tab ───
const PageSEOTab = () => {
  const queryClient = useQueryClient();
  const seoKeys = ["events_seo_title", "events_seo_description", "events_hero_title", "events_hero_subtitle", "events_og_image"];

  const { data: seoSettings = {}, isLoading } = useQuery({
    queryKey: ["events-page-seo"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", seoKeys);
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value || ""; });
      return map;
    },
  });

  const [form, setForm] = useState({
    events_seo_title: "", events_seo_description: "", events_hero_title: "", events_hero_subtitle: "", events_og_image: ""
  });
  const [loaded, setLoaded] = useState(false);

  if (!loaded && !isLoading && Object.keys(seoSettings).length >= 0) {
    setForm({
      events_seo_title: seoSettings.events_seo_title || "",
      events_seo_description: seoSettings.events_seo_description || "",
      events_hero_title: seoSettings.events_hero_title || "",
      events_hero_subtitle: seoSettings.events_hero_subtitle || "",
      events_og_image: seoSettings.events_og_image || "",
    });
    setLoaded(true);
  }

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const key of seoKeys) {
        const value = (form as any)[key] || "";
        const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
        if (existing) {
          await supabase.from("site_settings").update({ value }).eq("key", key);
        } else {
          await supabase.from("site_settings").insert({ key, value });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["events-page-seo"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      try {
        const { SITE_SETTINGS_UPDATED_EVENT, SITE_SETTINGS_UPDATED_STORAGE_KEY } = await import("@/hooks/useSiteSettings");
        window.dispatchEvent(new Event(SITE_SETTINGS_UPDATED_EVENT));
        localStorage.setItem(SITE_SETTINGS_UPDATED_STORAGE_KEY, String(Date.now()));
      } catch {}
      toast.success("Events page SEO saved!");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <Search className="w-3 h-3" /> Events Page SEO
        </Label>
        <p className="text-xs text-muted-foreground mt-1">These settings control the main /events/ page SEO for Google ranking</p>
      </div>


      <Separator />

      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hero Section Content</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label className="text-sm">Hero Title</Label>
            <Input placeholder="Make Your Special Moments Unforgettable" value={form.events_hero_title} onChange={e => setForm(p => ({ ...p, events_hero_title: e.target.value }))} />
          </div>
          <div>
            <Label className="text-sm">Hero Subtitle</Label>
            <Textarea placeholder="Wedding, birthday, corporate events..." value={form.events_hero_subtitle} onChange={e => setForm(p => ({ ...p, events_hero_subtitle: e.target.value }))} rows={2} />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-sm">OG Image (for social sharing)</Label>
        <CloudinaryUpload value={form.events_og_image} onChange={(url) => setForm(p => ({ ...p, events_og_image: url }))} folder="seo" label="Upload OG Image" />
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "Saving..." : "Save SEO Settings"}</Button>

      <Separator className="my-6" />

      {/* Page Content (Long Description, FAQ, Images) */}
      <PageContentEditor prefix="events" title="Events" />
    </div>
  );
};

// ─── Main Page ───
const AdminEvents = () => (
  <div>
    <h2 className="text-2xl font-bold text-foreground mb-6">Event Management</h2>
    <Tabs defaultValue="categories">
      <div className="overflow-x-auto -mx-1 px-1 mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <TabsList className="inline-flex w-max">
          <TabsTrigger value="categories" className="whitespace-nowrap"><Tag className="w-4 h-4 mr-1" /> Categories</TabsTrigger>
          <TabsTrigger value="packages" className="whitespace-nowrap"><Package className="w-4 h-4 mr-1" /> Packages</TabsTrigger>
          <TabsTrigger value="bookings" className="whitespace-nowrap"><CalendarCheck className="w-4 h-4 mr-1" /> Bookings</TabsTrigger>
          <TabsTrigger value="seo" className="whitespace-nowrap"><Search className="w-4 h-4 mr-1" /> Page SEO</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="categories"><CategoriesTab /></TabsContent>
      <TabsContent value="packages"><PackagesTab /></TabsContent>
      <TabsContent value="bookings"><BookingsTab /></TabsContent>
      <TabsContent value="seo"><PageSEOTab /></TabsContent>
    </Tabs>
  </div>
);

export default AdminEvents;
