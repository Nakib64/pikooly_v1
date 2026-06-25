"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { CloudinaryUpload } from "@/components/admin/CloudinaryUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Save, X, Gift } from "lucide-react";

interface GiftItem {
  id?: string;
  title: string;
  image_url: string;
  link: string;
  display_order: number;
  is_active: boolean;
}

const defaults: GiftItem = { title: "", image_url: "", link: "", display_order: 0, is_active: true };

const AdminPopularGifting = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<GiftItem | null>(null);
  const [form, setForm] = useState<GiftItem>(defaults);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-popular-gifting"],
    queryFn: async () => {
      const { data, error } = await supabase.from("popular_gifting").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: GiftItem) => {
      const { id: _id, ...rest } = values as any;
      if (editing?.id) {
        const { error } = await supabase.from("popular_gifting").update(rest).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("popular_gifting").insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-popular-gifting"] });
      qc.invalidateQueries({ queryKey: ["popular-gifting"] });
      toast({ title: editing?.id ? "Updated" : "Created" });
      setEditing(null);
      setForm(defaults);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("popular_gifting").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-popular-gifting"] });
      qc.invalidateQueries({ queryKey: ["popular-gifting"] });
      toast({ title: "Deleted" });
    },
  });

  const startEdit = (item: any) => {
    setEditing(item);
    setForm({ title: item.title, image_url: item.image_url || "", link: item.link || "", display_order: item.display_order, is_active: item.is_active });
  };

  const startAdd = () => {
    setEditing({} as GiftItem);
    setForm({ ...defaults, display_order: items.length });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" /> Popular In Gifting
          </h1>
          {!editing && (
            <Button onClick={startAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
          )}
        </div>

        {editing && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Corporate Gifts" />
              </div>
              <div>
                <Label>Link</Label>
                <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/shop or /product-category/gifts" />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <div>
              <Label>Image</Label>
              <CloudinaryUpload value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} />
              {form.image_url && (
                <img src={form.image_url} alt="" className="mt-2 h-24 rounded-lg object-cover" />
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => saveMutation.mutate(form)} disabled={!form.title || saveMutation.isPending}>
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
              <Button variant="outline" onClick={() => { setEditing(null); setForm(defaults); }}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No items yet. Click "Add Item" to start.</div>
        ) : (
          <div className="grid gap-3">
            {(items as any[]).map((item) => (
              <div key={item.id} className="flex items-center gap-4 bg-card border border-border rounded-lg p-3">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="w-16 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Gift className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.link || "No link"} · Order: {item.display_order}</p>
                </div>
                <div className={`text-xs px-2 py-0.5 rounded-full ${item.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {item.is_active ? "Active" : "Inactive"}
                </div>
                <Button variant="ghost" size="icon" onClick={() => startEdit(item)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(item.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

export default AdminPopularGifting;
