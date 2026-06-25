"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CloudinaryUpload } from "@/components/admin/CloudinaryUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Save, X, Gift, Heart, PlayCircle, Calendar } from "lucide-react";

// ─── Generic CRUD Section ───────────────────────────────────
interface Field {
  key: string;
  label: string;
  type: "text" | "number" | "url" | "color" | "switch" | "image";
  placeholder?: string;
  bucket?: string;
}

interface CrudSectionProps {
  table: string;
  queryKey: string;
  fields: Field[];
  defaultValues: Record<string, any>;
  title: string;
}

const CrudSection = ({ table, queryKey, fields, defaultValues, title }: CrudSectionProps) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>(defaultValues);

  const { data: items = [], isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data, error } = await supabase.from(table as any).select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (editing?.id) {
        const { error } = await supabase.from(table as any).update(values).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table as any).insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: "Saved!" });
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: "Deleted!" });
    },
  });

  const resetForm = () => {
    setEditing(null);
    setForm({ ...defaultValues });
  };

  const startEdit = (item: any) => {
    setEditing(item);
    const f: Record<string, any> = {};
    fields.forEach((fd) => {
      f[fd.key] = item[fd.key] ?? defaultValues[fd.key];
    });
    f.display_order = item.display_order ?? 0;
    f.is_active = item.is_active ?? true;
    setForm(f);
  };

  const handleSave = () => {
    const vals: Record<string, any> = {};
    fields.forEach((fd) => {
      vals[fd.key] = form[fd.key];
    });
    vals.display_order = Number(form.display_order) || 0;
    vals.is_active = form.is_active ?? true;
    saveMutation.mutate(vals);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">{title}</h3>
        {!editing && (
          <Button size="sm" onClick={() => { setEditing({}); setForm({ ...defaultValues }); }}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        )}
      </div>

      {editing && (
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {fields.map((fd) => (
              <div key={fd.key}>
                <Label className="text-xs font-medium text-muted-foreground">{fd.label}</Label>
                {fd.type === "switch" ? (
                  <div className="mt-1.5">
                    <Switch checked={!!form[fd.key]} onCheckedChange={(v) => setForm({ ...form, [fd.key]: v })} />
                  </div>
                ) : fd.type === "color" ? (
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      type="color"
                      value={form[fd.key] || "#f5f0d0"}
                      onChange={(e) => setForm({ ...form, [fd.key]: e.target.value })}
                      className="w-12 h-10 p-1 rounded-lg"
                    />
                    <Input
                      value={form[fd.key] || ""}
                      onChange={(e) => setForm({ ...form, [fd.key]: e.target.value })}
                      placeholder={fd.placeholder}
                      className="flex-1"
                    />
                  </div>
                ) : fd.type === "image" ? (
                  <div className="mt-1.5 space-y-2">
                    <CloudinaryUpload
                      value={form[fd.key] || ""}
                      onChange={(url) => setForm({ ...form, [fd.key]: url })}
                      folder={table}
                      label="Upload Image"
                    />
                  </div>
                ) : (
                  <Input
                    type={fd.type}
                    value={form[fd.key] || ""}
                    onChange={(e) => setForm({ ...form, [fd.key]: fd.type === "number" ? Number(e.target.value) : e.target.value })}
                    placeholder={fd.placeholder}
                    className="mt-1.5"
                  />
                )}
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Display Order</Label>
                <Input type="number" value={form.display_order || 0} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Active</Label>
                <div className="mt-2.5"><Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending} className="flex-1 sm:flex-none">
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
            <Button size="sm" variant="outline" onClick={resetForm} className="flex-1 sm:flex-none">
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:shadow-sm transition-shadow">
              {item.image_url && <img src={item.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
              {item.thumbnail_url && !item.image_url && <img src={item.thumbnail_url} alt="" className="w-10 h-14 rounded-lg object-cover flex-shrink-0" />}
              {item.logo_url && !item.image_url && !item.thumbnail_url && <img src={item.logo_url} alt="" className="h-6 object-contain flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{item.name || item.title || item.label || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  Order: {item.display_order} • 
                  <span className={item.is_active ? "text-green-600" : "text-destructive"}> {item.is_active ? "Active" : "Inactive"}</span>
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(item.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center py-10 border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground text-sm">No items yet.</p>
              <p className="text-muted-foreground text-xs mt-1">Click "Add" to create one.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Admin Homepage Content Page ────────────────────────────
const AdminHomepageContent = () => {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-display font-bold mb-5 text-foreground">Homepage Content</h1>
      
      <Tabs defaultValue="offers" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full h-auto p-1 bg-muted/50">
          <TabsTrigger value="offers" className="text-[11px] sm:text-sm py-2 gap-1 flex-col sm:flex-row">
            <Gift className="h-3.5 w-3.5 hidden sm:block" />
            Offers
          </TabsTrigger>
          <TabsTrigger value="relationships" className="text-[11px] sm:text-sm py-2 gap-1 flex-col sm:flex-row">
            <Heart className="h-3.5 w-3.5 hidden sm:block" />
            Relations
          </TabsTrigger>
          <TabsTrigger value="stories" className="text-[11px] sm:text-sm py-2 gap-1 flex-col sm:flex-row">
            <PlayCircle className="h-3.5 w-3.5 hidden sm:block" />
            Stories
          </TabsTrigger>
          <TabsTrigger value="celebrations" className="text-[11px] sm:text-sm py-2 gap-1 flex-col sm:flex-row">
            <Calendar className="h-3.5 w-3.5 hidden sm:block" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offers">
          <CrudSection
            table="offer_banners"
            queryKey="admin-offer-banners"
            title="Exclusive Offers"
            defaultValues={{ title: "", subtitle: "", description: "", logo_url: "", image_url: "", bg_image_url: "", link: "", bg_color: "#f5f0d0", cta_text: "Shop Now", display_order: 0, is_active: true }}
            fields={[
              { key: "title", label: "Title *", type: "text", placeholder: "₹200 Cashback" },
              { key: "subtitle", label: "Subtitle", type: "text", placeholder: "ENJOY UPTO" },
              { key: "description", label: "Description", type: "text", placeholder: "T&C Apply | Across 2 orders" },
              { key: "cta_text", label: "CTA Button Text", type: "text", placeholder: "Shop Now" },
              { key: "logo_url", label: "Logo", type: "image", placeholder: "https://...", bucket: "images" },
              { key: "image_url", label: "Banner Image", type: "image", placeholder: "https://...", bucket: "images" },
              { key: "bg_image_url", label: "Background Image", type: "image", placeholder: "https://...", bucket: "images" },
              { key: "link", label: "Link", type: "url", placeholder: "/shop" },
              { key: "bg_color", label: "Background Color", type: "color", placeholder: "#f5f0d0" },
            ]}
          />
        </TabsContent>

        <TabsContent value="relationships">
          <CrudSection
            table="relationship_categories"
            queryKey="admin-relationship-categories"
            title="For Every Relationship"
            defaultValues={{ name: "", image_url: "", slug: "", link: "", display_order: 0, is_active: true }}
            fields={[
              { key: "name", label: "Name *", type: "text", placeholder: "Him" },
              { key: "slug", label: "Slug *", type: "text", placeholder: "him" },
              { key: "image_url", label: "Image URL", type: "url", placeholder: "https://..." },
              { key: "link", label: "Link", type: "url", placeholder: "/product-category/him" },
            ]}
          />
        </TabsContent>

        <TabsContent value="stories">
          <CrudSection
            table="gifting_stories"
            queryKey="admin-gifting-stories"
            title="Joyful Gifting Stories"
            defaultValues={{ title: "", label: "", thumbnail_url: "", video_url: "", views_count: 0, display_order: 0, is_active: true }}
            fields={[
              { key: "title", label: "Title", type: "text", placeholder: "Story title" },
              { key: "label", label: "Label/Tag", type: "text", placeholder: "BIRTHDAY GIFTS" },
              { key: "thumbnail_url", label: "Thumbnail URL", type: "url", placeholder: "https://..." },
              { key: "video_url", label: "Video URL", type: "url", placeholder: "https://youtube.com/..." },
              { key: "views_count", label: "Views Count", type: "number", placeholder: "1200" },
            ]}
          />
        </TabsContent>

        <TabsContent value="celebrations">
          <CrudSection
            table="celebrations"
            queryKey="admin-celebrations"
            title="Celebrations Calendar"
              defaultValues={{ name: "Celebration", date_label: "", image_url: "", link: "", bg_color: "", display_order: 0, is_active: true }}
            fields={[
                { key: "image_url", label: "Image", type: "image", placeholder: "Upload celebration image", bucket: "images" },
                { key: "bg_color", label: "Background Color", type: "color", placeholder: "#f8d7da (pink), #d6eaf8 (blue)" },
              { key: "link", label: "Link", type: "url", placeholder: "/product-category/womens-day" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminHomepageContent;
