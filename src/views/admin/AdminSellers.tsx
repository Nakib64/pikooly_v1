import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Search, Loader2, MapPin, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/lib/router-adapter";

interface District {
  id: string;
  name: string;
}
interface Upazila {
  id: string;
  name: string;
  district_id: string;
}
interface Category {
  id: string;
  name: string;
}
interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}
interface Seller {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string;
  district_id: string;
  upazila_id?: string | null;
  is_active: boolean;
  can_edit_seo?: boolean | null;
  district?: { name: string } | null;
  upazila?: { name: string } | null;
}

const empty = {
  name: "",
  email: "",
  phone: "",
  district_id: "",
  upazila_id: "",
  is_active: true,
  can_edit_seo: false,
  password: "",
  category_ids: [] as string[],
  subcategory_ids: [] as string[],
};


const AdminSellers = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [upazilas, setUpazilas] = useState<Upazila[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: ss }, { data: ds }, { data: us }, { data: cs }, { data: subs }] = await Promise.all([
      supabase
        .from("sellers")
        .select("id, user_id, name, email, phone, district_id, upazila_id, is_active, can_edit_seo, district:shipping_districts(name), upazila:upazilas(name)")
        .order("created_at", { ascending: false }),
      supabase.from("shipping_districts").select("id, name").eq("is_active", true).order("name"),
      supabase.from("upazilas").select("id, name, district_id").eq("is_active", true).order("name"),
      supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
      supabase.from("subcategories").select("id, name, category_id").eq("is_active", true).order("name"),
    ]);
    setSellers((ss as any) || []);
    setDistricts((ds as any) || []);
    setUpazilas((us as any) || []);
    setCategories((cs as any) || []);
    setSubcategories((subs as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);


  const filtered = useMemo(() => {
    if (!search.trim()) return sellers;
    const q = search.toLowerCase();
    return sellers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        (s.district?.name || "").toLowerCase().includes(q)
    );
  }, [sellers, search]);

  const assignedDistrictIds = useMemo(
    () => new Set(sellers.filter((s) => s.id !== editingId).map((s) => s.district_id)),
    [sellers, editingId]
  );

  const availableDistricts = districts.filter((d) => !assignedDistrictIds.has(d.id));

  const openAdd = () => {
    setEditingId(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = async (s: Seller) => {
    setEditingId(s.id);
    const [{ data: sc }, { data: ssub }] = await Promise.all([
      supabase.from("seller_categories").select("category_id").eq("seller_id", s.id),
      supabase.from("seller_subcategories").select("subcategory_id").eq("seller_id", s.id),
    ]);
    setForm({
      name: s.name,
      email: s.email,
      phone: s.phone,
      district_id: s.district_id,
      upazila_id: s.upazila_id || "",
      is_active: s.is_active,
      can_edit_seo: !!s.can_edit_seo,
      password: "",
      category_ids: (sc || []).map((r: any) => r.category_id),
      subcategory_ids: (ssub || []).map((r: any) => r.subcategory_id),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.district_id) {
      toast.error("Please fill all fields");
      return;
    }
    if (!editingId && (!form.password || form.password.length < 6)) {
      toast.error("Password is required (min 6 characters) for new sellers");
      return;
    }
    if (form.password && form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      const { password, category_ids, subcategory_ids, upazila_id, ...rest } = form;
      const sellerData = { ...rest, upazila_id: upazila_id || null };
      let sellerId = editingId;

      if (editingId) {
        const { error } = await supabase.from("sellers").update(sellerData).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("sellers")
          .insert(sellerData)
          .select("id")
          .single();
        if (error) {
          if (error.code === "23505") throw new Error("This district already has a seller assigned");
          throw error;
        }
        sellerId = inserted.id;
      }

      // Sync seller_categories
      if (sellerId) {
        await supabase.from("seller_categories").delete().eq("seller_id", sellerId);
        if (category_ids.length > 0) {
          const rows = category_ids.map((cid) => ({ seller_id: sellerId!, category_id: cid }));
          const { error: catErr } = await supabase.from("seller_categories").insert(rows);
          if (catErr) throw catErr;
        }
        // Sync seller_subcategories (only keep those that belong to selected categories)
        await supabase.from("seller_subcategories").delete().eq("seller_id", sellerId);
        const validSubs = subcategory_ids.filter((sid) => {
          const sub = subcategories.find((x) => x.id === sid);
          return sub && category_ids.includes(sub.category_id);
        });
        if (validSubs.length > 0) {
          const rows = validSubs.map((sid) => ({ seller_id: sellerId!, subcategory_id: sid }));
          const { error: subErr } = await supabase.from("seller_subcategories").insert(rows);
          if (subErr) throw subErr;
        }
      }

      // If a password was provided, create/update the auth account + role + link
      if (password && sellerId) {
        const { data, error: fnErr } = await supabase.functions.invoke("create-seller-auth", {
          body: { seller_id: sellerId, email: sellerData.email.trim(), password },
        });
        if (fnErr || (data && (data as any).error)) {
          throw new Error((fnErr?.message || (data as any)?.error || "Failed to set seller password"));
        }
        toast.success(editingId ? "Seller updated & password set" : "Seller added & login created");
      } else {
        toast.success(editingId ? "Seller updated" : "Seller added");
      }

      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save seller");
    } finally {
      setSaving(false);
    }
  };


  const remove = async (id: string) => {
    if (!confirm("Delete this seller? Their notifications will also be removed.")) return;
    const { error } = await supabase.from("sellers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Seller deleted");
      load();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Sellers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            One seller per district. Sellers receive automatic order notifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/seller-payouts">
              <Wallet className="h-4 w-4 mr-1.5" /> Seller Payouts
            </Link>
          </Button>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Seller
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 h-8 px-0 text-sm"
          />
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No sellers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Business Name</th>
                  <th className="text-left px-4 py-2.5 font-medium">Business Email</th>
                  <th className="text-left px-4 py-2.5 font-medium">Phone</th>
                  <th className="text-left px-4 py-2.5 font-medium">District</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.phone}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>
                          {s.district?.name || "—"}
                          {s.upazila?.name && <span className="text-muted-foreground"> · {s.upazila.name}</span>}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Seller" : "Add Seller"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Field label="Business Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Business / shop name" />
            </Field>
            <Field label="Business Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="business@example.com"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="01XXXXXXXXX"
              />
            </Field>
            <Field label="District">
              <Select value={form.district_id || undefined} onValueChange={(v) => setForm({ ...form, district_id: v, upazila_id: "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {districts.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No districts yet — add in Admin → Shipping
                    </SelectItem>
                  ) : availableDistricts.length === 0 ? (
                    <SelectItem value="none" disabled>
                      All districts already assigned
                    </SelectItem>
                  ) : (
                    availableDistricts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {districts.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Go to <Link to="/admin/shipping" className="underline">Shipping</Link> to add districts first.
                </p>
              )}
            </Field>
            <Field label="Thana / Upazila (optional)">
              {(() => {
                const districtUpazilas = upazilas.filter((u) => u.district_id === form.district_id);
                return (
                  <Select
                    value={form.upazila_id || "none"}
                    onValueChange={(v) => setForm({ ...form, upazila_id: v === "none" ? "" : v })}
                    disabled={!form.district_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={form.district_id ? "Select thana/upazila" : "Select a district first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None (whole district) —</SelectItem>
                      {districtUpazilas.length === 0 ? (
                        <SelectItem value="empty" disabled>
                          No thana/upazila under this district
                        </SelectItem>
                      ) : (
                        districtUpazilas.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                );
              })()}
              <p className="text-[11px] text-muted-foreground">
                Optionally narrow this seller to a specific thana/upazila within the district.
              </p>
            </Field>
            <Field label="Categories (optional)">
              {categories.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No categories available.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded-md border border-border p-2 space-y-1.5">
                  {categories.map((c) => {
                    const checked = form.category_ids.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              category_ids: e.target.checked
                                ? [...form.category_ids, c.id]
                                : form.category_ids.filter((x) => x !== c.id),
                            })
                          }
                        />
                        <span>{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Categories this seller is allowed to sell in.
              </p>
            </Field>

            <Field label="Subcategories (optional)">
              {form.category_ids.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Select categories first to choose subcategories.</p>
              ) : (() => {
                const availSubs = subcategories.filter((s) => form.category_ids.includes(s.category_id));
                if (availSubs.length === 0) {
                  return <p className="text-[11px] text-muted-foreground">No subcategories under selected categories.</p>;
                }
                return (
                  <div className="max-h-40 overflow-y-auto rounded-md border border-border p-2 space-y-1.5">
                    {availSubs.map((s) => {
                      const checked = form.subcategory_ids.includes(s.id);
                      const cat = categories.find((c) => c.id === s.category_id);
                      return (
                        <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                subcategory_ids: e.target.checked
                                  ? [...form.subcategory_ids, s.id]
                                  : form.subcategory_ids.filter((x) => x !== s.id),
                              })
                            }
                          />
                          <span>{s.name} <span className="text-muted-foreground text-[11px]">({cat?.name})</span></span>
                        </label>
                      );
                    })}
                  </div>
                );
              })()}
              <p className="text-[11px] text-muted-foreground">
                Narrows orders to specific subcategories within selected categories.
              </p>
            </Field>


            <Field label={editingId ? "Reset Password (optional)" : "Password"}>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingId ? "Leave blank to keep current" : "Min 6 characters"}
                autoComplete="new-password"
              />
            </Field>
            <div className="flex items-center justify-between pt-1">
              <Label htmlFor="active" className="text-sm">
                Active
              </Label>
              <Switch
                id="active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <Label htmlFor="seo" className="text-sm">Allow SEO editing</Label>
                <p className="text-[11px] text-muted-foreground">Lets this seller set SEO title & meta on their products.</p>
              </div>
              <Switch
                id="seo"
                checked={form.can_edit_seo}
                onCheckedChange={(v) => setForm({ ...form, can_edit_seo: v })}
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Setting a password creates (or updates) the seller's login account, assigns the 'seller' role,
              and links it to this record automatically. Seller can then sign in at <code>/seller</code>.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {editingId ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium">{label}</Label>
    {children}
  </div>
);

export default AdminSellers;
