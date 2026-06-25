"use client";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Search, Ticket } from "lucide-react";
import { format } from "date-fns";

interface CouponForm {
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  is_active: boolean;
  expires_at: string;
  show_on_blog_sidebar: boolean;
}

const empty: CouponForm = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: 10,
  min_order_amount: 0,
  max_uses: null,
  is_active: true,
  expires_at: "",
  show_on_blog_sidebar: false,
};

const AdminCoupons = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CouponForm>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: CouponForm) => {
      const payload = {
        code: f.code.toUpperCase().trim(),
        description: f.description,
        discount_type: f.discount_type,
        discount_value: f.discount_value,
        min_order_amount: f.min_order_amount,
        max_uses: f.max_uses,
        is_active: f.is_active,
        expires_at: f.expires_at || null,
        show_on_blog_sidebar: f.show_on_blog_sidebar,
      };
      if (editId) {
        // If toggling sidebar ON, clear other coupons' sidebar flag (only one shown)
        if (f.show_on_blog_sidebar) {
          await supabase.from("coupons").update({ show_on_blog_sidebar: false }).neq("id", editId);
        }
        const { error } = await supabase.from("coupons").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        if (f.show_on_blog_sidebar) {
          await supabase.from("coupons").update({ show_on_blog_sidebar: false }).neq("id", "00000000-0000-0000-0000-000000000000");
        }
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: editId ? "Coupon updated" : "Coupon created" });
      setOpen(false);
      setForm(empty);
      setEditId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "Coupon deleted" });
    },
  });

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      code: c.code,
      description: c.description || "",
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      min_order_amount: c.min_order_amount || 0,
      max_uses: c.max_uses,
      is_active: c.is_active,
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
      show_on_blog_sidebar: !!c.show_on_blog_sidebar,
    });
    setOpen(true);
  };

  const filtered = coupons.filter(
    (c: any) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-bold">Coupon Management</h2>
          <p className="text-muted-foreground text-sm">Manage promo codes & coupons</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(empty); setEditId(null); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Coupon</Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Coupon" : "New Coupon"}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium">Code *</label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="SAVE20" className="uppercase" />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="20% off" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (৳)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Value</label>
                  <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} min={0} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Min Order (৳)</label>
                  <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })} min={0} />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Uses</label>
                  <Input type="number" value={form.max_uses ?? ""} onChange={(e) => setForm({ ...form, max_uses: e.target.value ? Number(e.target.value) : null })} placeholder="Unlimited" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Expires At</label>
                <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} id="active" />
                <label htmlFor="active" className="text-sm">Active</label>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <input type="checkbox" checked={form.show_on_blog_sidebar} onChange={(e) => setForm({ ...form, show_on_blog_sidebar: e.target.checked })} id="blog_sidebar" className="mt-0.5" />
                <label htmlFor="blog_sidebar" className="text-sm flex-1 cursor-pointer">
                  <span className="font-medium">📰 Show on Blog Sidebar</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">Display this coupon in the Offer box on the blog pages. Only one coupon can be featured at a time.</span>
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search coupons..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="bg-card rounded-xl border border-border overflow-hidden"><div className="divide-y divide-border">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-4 p-4"><div className="h-4 w-24 bg-muted rounded animate-pulse" /><div className="h-4 flex-1 bg-muted rounded animate-pulse" /><div className="h-5 w-16 bg-muted rounded-full animate-pulse" /><div className="h-4 w-20 bg-muted rounded animate-pulse" /></div>)}</div></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Ticket className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No coupons found</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead className="hidden sm:table-cell">Minimum</TableHead>
                <TableHead className="hidden md:table-cell">Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Expires</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => openEdit(c)}>
                  <TableCell className="font-mono font-bold text-sm">{c.code}</TableCell>
                  <TableCell className="text-sm">
                    {c.discount_type === "percentage" ? `${c.discount_value}%` : `৳${c.discount_value}`}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">৳{c.min_order_amount}</TableCell>
                  <TableCell className="hidden md:table-cell">{c.used_count}{c.max_uses ? `/${c.max_uses}` : ""}</TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? "default" : "secondary"}>
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs">
                    {c.expires_at ? format(new Date(c.expires_at), "dd MMM yyyy") : "Unlimited"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="icon"
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(c.id); }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminCoupons;
