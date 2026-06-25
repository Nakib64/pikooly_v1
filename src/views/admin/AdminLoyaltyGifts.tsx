import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CloudinaryUpload } from "@/components/admin/CloudinaryUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Gift, Plus, Pencil, Trash2, Save, X, Trophy, Sparkles, Settings as SettingsIcon } from "lucide-react";

interface GiftItem {
  id?: string;
  name: string;
  description: string;
  image_url: string;
  estimated_value: number;
  stock: number;
  is_active: boolean;
  display_order: number;
}

const giftDefaults: GiftItem = {
  name: "", description: "", image_url: "", estimated_value: 0, stock: 1, is_active: true, display_order: 0,
};

const AdminLoyaltyGifts = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  /* ---------------- SETTINGS ---------------- */
  const { data: settings } = useQuery({
    queryKey: ["loyalty-settings-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("loyalty_program_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [settingsForm, setSettingsForm] = useState<any>(null);
  const currentSettings = settingsForm || settings;

  const saveSettings = useMutation({
    mutationFn: async (values: any) => {
      const { id, created_at, updated_at, ...rest } = values;
      const { error } = await supabase.from("loyalty_program_settings").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty-settings-admin"] });
      qc.invalidateQueries({ queryKey: ["loyalty-program-public"] });
      toast({ title: "Settings saved" });
      setSettingsForm(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  /* ---------------- GIFT ITEMS ---------------- */
  const [editing, setEditing] = useState<GiftItem | null>(null);
  const [form, setForm] = useState<GiftItem>(giftDefaults);

  const { data: items = [] } = useQuery({
    queryKey: ["loyalty-gifts-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("loyalty_gift_items").select("*").order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const saveGift = useMutation({
    mutationFn: async (values: GiftItem) => {
      const { id: _id, ...rest } = values as any;
      if (editing?.id) {
        const { error } = await supabase.from("loyalty_gift_items").update(rest).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("loyalty_gift_items").insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty-gifts-admin"] });
      qc.invalidateQueries({ queryKey: ["loyalty-gifts-public"] });
      toast({ title: editing?.id ? "Updated" : "Created" });
      setEditing(null);
      setForm(giftDefaults);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteGift = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("loyalty_gift_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty-gifts-admin"] });
      toast({ title: "Deleted" });
    },
  });

  /* ---------------- WINNERS ---------------- */
  const { data: winners = [] } = useQuery({
    queryKey: ["loyalty-winners-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_winners")
        .select("*, gift_item:loyalty_gift_items(name, image_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const runDraw = useMutation({
    mutationFn: async () => {
      if (!settings) throw new Error("Settings not loaded");
      const minOrders = settings.min_orders_to_qualify || 3;
      const winnersCount = settings.winners_per_batch || 5;

      // Count any active (non-cancelled, non-deleted) order toward loyalty.
      // This makes the program usable from day one — admin controls the bar via "Min orders to qualify".
      const { data: orders, error } = await supabase
        .from("orders")
        .select("user_id, customer_name, customer_phone, customer_email, delivery_address, order_number, id, created_at, status")
        .neq("status", "cancelled")
        .is("deleted_at", null);
      if (error) throw error;

      // Group by phone (covers guest + registered)
      const map = new Map<string, any>();
      (orders || []).forEach((o: any) => {
        const key = (o.customer_phone || "").trim() || o.user_id;
        if (!key) return;
        const cur = map.get(key) || { count: 0, latest: o, user_id: o.user_id };
        cur.count += 1;
        if (new Date(o.created_at) > new Date(cur.latest.created_at)) cur.latest = o;
        if (o.user_id) cur.user_id = o.user_id;
        map.set(key, cur);
      });

      // Exclude past winners (by phone)
      const pastPhones = new Set(winners.map((w: any) => w.customer_phone));
      const eligible = Array.from(map.entries())
        .filter(([phone, v]) => v.count >= minOrders && !pastPhones.has(phone))
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, Math.max(winnersCount * 5, 20)); // top pool

      if (eligible.length === 0) {
        const totalCustomers = map.size;
        const maxOrders = Math.max(0, ...Array.from(map.values()).map((v: any) => v.count));
        throw new Error(
          `No eligible customers. Found ${totalCustomers} customer(s), top has ${maxOrders} order(s), but "Min orders to qualify" is ${minOrders}. Lower the minimum in Settings, or exclude past winners may have removed remaining candidates.`
        );
      }

      // Shuffle and pick N
      const shuffled = eligible.sort(() => Math.random() - 0.5).slice(0, winnersCount);

      // Pick gift items in stock, round-robin
      const stocked = (items as any[]).filter((g) => g.is_active && g.stock > 0);
      if (stocked.length === 0) throw new Error("No gift items available. Add gift items with stock first.");

      const batch = (winners.reduce((m: number, w: any) => Math.max(m, w.batch_number || 0), 0) || 0) + 1;
      const rows = shuffled.map(([_, v], i) => {
        const gift = stocked[i % stocked.length];
        return {
          user_id: v.user_id,
          customer_name: v.latest.customer_name,
          customer_phone: v.latest.customer_phone,
          customer_email: v.latest.customer_email,
          delivery_address: v.latest.delivery_address,
          order_id: v.latest.id,
          order_number: v.latest.order_number,
          gift_item_id: gift.id,
          gift_name: gift.name,
          gift_card_message: settings.gift_card_message,
          batch_number: batch,
          total_orders_at_draw: v.count,
        };
      });

      const { error: insErr } = await supabase.from("loyalty_winners").insert(rows);
      if (insErr) throw insErr;
      return rows.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["loyalty-winners-admin"] });
      toast({ title: `🎉 ${n} winner(s) drawn!` });
    },
    onError: (e: any) => toast({ title: "Draw failed", description: e.message, variant: "destructive" }),
  });

  const updateWinner = useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { error } = await supabase.from("loyalty_winners").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty-winners-admin"] });
      toast({ title: "Updated" });
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" /> Loyalty Gift Program
      </h1>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings"><SettingsIcon className="h-4 w-4 mr-1" />Settings</TabsTrigger>
          <TabsTrigger value="gifts"><Gift className="h-4 w-4 mr-1" />Gift Items ({items.length})</TabsTrigger>
          <TabsTrigger value="winners"><Trophy className="h-4 w-4 mr-1" />Winners ({winners.length})</TabsTrigger>
        </TabsList>

        {/* SETTINGS */}
        <TabsContent value="settings" className="space-y-4">
          {currentSettings && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={currentSettings.is_enabled}
                  onCheckedChange={(v) => setSettingsForm({ ...currentSettings, is_enabled: v })}
                />
                <Label>Program Enabled</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={currentSettings.show_on_homepage}
                  onCheckedChange={(v) => setSettingsForm({ ...currentSettings, show_on_homepage: v })}
                />
                <Label>Show section on homepage</Label>
              </div>

              <div>
                <Label>Public Title</Label>
                <Input value={currentSettings.public_title || ""} onChange={(e) => setSettingsForm({ ...currentSettings, public_title: e.target.value })} />
              </div>
              <div>
                <Label>Subtitle</Label>
                <Input value={currentSettings.public_subtitle || ""} onChange={(e) => setSettingsForm({ ...currentSettings, public_subtitle: e.target.value })} />
              </div>
              <div>
                <Label>Description (shown on homepage)</Label>
                <Textarea rows={3} value={currentSettings.public_description || ""} onChange={(e) => setSettingsForm({ ...currentSettings, public_description: e.target.value })} />
              </div>
              <div>
                <Label>Banner Image</Label>
                <CloudinaryUpload value={currentSettings.banner_image_url || ""} onChange={(url) => setSettingsForm({ ...currentSettings, banner_image_url: url })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Draw every (orders)</Label>
                  <Input type="number" value={currentSettings.draw_batch_size} onChange={(e) => setSettingsForm({ ...currentSettings, draw_batch_size: parseInt(e.target.value) || 1000 })} />
                </div>
                <div>
                  <Label>Winners per draw</Label>
                  <Input type="number" value={currentSettings.winners_per_batch} onChange={(e) => setSettingsForm({ ...currentSettings, winners_per_batch: parseInt(e.target.value) || 5 })} />
                </div>
                <div>
                  <Label>Min orders to qualify</Label>
                  <Input type="number" value={currentSettings.min_orders_to_qualify} onChange={(e) => setSettingsForm({ ...currentSettings, min_orders_to_qualify: parseInt(e.target.value) || 3 })} />
                </div>
              </div>

              <div>
                <Label>Gift Card Message (printed & sent with gift)</Label>
                <Textarea rows={3} value={currentSettings.gift_card_message || ""} onChange={(e) => setSettingsForm({ ...currentSettings, gift_card_message: e.target.value })} />
              </div>

              <Button onClick={() => saveSettings.mutate(currentSettings)} disabled={!settingsForm || saveSettings.isPending}>
                <Save className="h-4 w-4 mr-1" /> Save Settings
              </Button>
            </div>
          )}
        </TabsContent>

        {/* GIFT ITEMS */}
        <TabsContent value="gifts" className="space-y-4">
          <div className="flex justify-end">
            {!editing && <Button onClick={() => { setEditing({} as GiftItem); setForm({ ...giftDefaults, display_order: items.length }); }}><Plus className="h-4 w-4 mr-1" />Add Gift</Button>}
          </div>

          {editing && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Gold Earrings" />
                </div>
                <div>
                  <Label>Estimated Value (৳)</Label>
                  <Input type="number" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Stock</Label>
                  <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Display Order</Label>
                  <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Image</Label>
                  <CloudinaryUpload value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => saveGift.mutate(form)} disabled={!form.name || saveGift.isPending}><Save className="h-4 w-4 mr-1" />Save</Button>
                <Button variant="outline" onClick={() => { setEditing(null); setForm(giftDefaults); }}><X className="h-4 w-4 mr-1" />Cancel</Button>
              </div>
            </div>
          )}

          <div className="grid gap-3">
            {(items as any[]).map((item) => (
              <div key={item.id} className="flex items-center gap-4 bg-card border border-border rounded-lg p-3">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0"><Gift className="h-6 w-6 text-muted-foreground" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">৳{item.estimated_value} · Stock: {item.stock}</p>
                </div>
                <div className={`text-xs px-2 py-0.5 rounded-full ${item.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {item.is_active ? "Active" : "Inactive"}
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setEditing(item); setForm(item); }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete?")) deleteGift.mutate(item.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {items.length === 0 && <div className="text-center py-8 text-muted-foreground">No gift items yet. Add earrings, bracelets, necklaces etc.</div>}
          </div>
        </TabsContent>

        {/* WINNERS */}
        <TabsContent value="winners" className="space-y-4">
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" />Run a New Draw</h3>
              <p className="text-sm text-muted-foreground">Picks {settings?.winners_per_batch || 5} active customers (min {settings?.min_orders_to_qualify || 3} orders, excludes cancelled orders & past winners).</p>
            </div>
            <Button onClick={() => runDraw.mutate()} disabled={runDraw.isPending}>
              <Trophy className="h-4 w-4 mr-1" />{runDraw.isPending ? "Drawing..." : "Run Draw Now"}
            </Button>
          </div>

          <div className="grid gap-3">
            {winners.map((w: any) => (
              <div key={w.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-medium">{w.customer_name} <span className="text-xs text-muted-foreground">· Batch #{w.batch_number}</span></p>
                    <p className="text-xs text-muted-foreground">{w.customer_phone} · {w.total_orders_at_draw} orders</p>
                    <p className="text-xs text-muted-foreground">📍 {w.delivery_address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {w.gift_item?.image_url && <img src={w.gift_item.image_url} alt="" className="w-10 h-10 rounded object-cover" />}
                    <div className="text-xs">
                      <p className="font-medium">{w.gift_name}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={w.dispatch_status} onValueChange={(v) => updateWinner.mutate({ id: w.id, dispatch_status: v, dispatched_at: v === "dispatched" ? new Date().toISOString() : w.dispatched_at })}>
                    <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="dispatched">Dispatched</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this winner?")) supabase.from("loyalty_winners").delete().eq("id", w.id).then(() => qc.invalidateQueries({ queryKey: ["loyalty-winners-admin"] })); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </div>
            ))}
            {winners.length === 0 && <div className="text-center py-8 text-muted-foreground">No winners yet. Run a draw to select.</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminLoyaltyGifts;
