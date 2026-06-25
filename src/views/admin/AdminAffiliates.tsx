"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMultiCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { Check, X, Eye } from "lucide-react";

const AdminAffiliates = () => {
  const qc = useQueryClient();
  const { formatPrice } = useMultiCurrency();
  const [editing, setEditing] = useState<any>(null);

  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ["admin-affiliate-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("affiliate_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const { data: affiliates = [] } = useQuery({
    queryKey: ["admin-affiliates"],
    queryFn: async () => {
      const { data } = await supabase.from("affiliates").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: cashouts = [] } = useQuery({
    queryKey: ["admin-cashouts"],
    queryFn: async () => {
      const { data } = await supabase.from("affiliate_cashouts").select("*, affiliates(code, full_name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () => {
      const { data } = await supabase.from("affiliate_commissions").select("*, affiliates(code, full_name)").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const updateSettings = async (patch: any) => {
    if (!settings?.id) return;
    const { error } = await supabase.from("affiliate_settings").update(patch).eq("id", settings.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    refetchSettings();
  };

  const updateAffiliate = async (id: string, patch: any) => {
    const { error } = await supabase.from("affiliates").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    if (patch.status === "approved" || patch.status === "rejected") {
      supabase.functions.invoke("notify-affiliate", {
        body: { event: patch.status, affiliate_id: id, notes: patch.admin_notes || "" },
      }).catch(() => {});
    }
    qc.invalidateQueries({ queryKey: ["admin-affiliates"] });
  };

  const updateCashout = async (c: any, status: string) => {
    const patch: any = { status, processed_at: new Date().toISOString() };
    const { error } = await supabase.from("affiliate_cashouts").update(patch).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    // Deduct from pending_balance + add to total_paid on paid
    if (status === "paid") {
      await supabase.from("affiliates").update({
        pending_balance: Math.max(0, Number(c.affiliates ? 0 : 0)), // computed below
      }).eq("id", c.affiliate_id);
      // Re-fetch and adjust properly
      const { data: aff } = await supabase.from("affiliates").select("pending_balance, total_paid").eq("id", c.affiliate_id).maybeSingle();
      if (aff) {
        await supabase.from("affiliates").update({
          pending_balance: Math.max(0, Number(aff.pending_balance) - Number(c.amount)),
          total_paid: Number(aff.total_paid) + Number(c.amount),
        }).eq("id", c.affiliate_id);
      }
    }
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["admin-cashouts"] });
    qc.invalidateQueries({ queryKey: ["admin-affiliates"] });
  };

  return (
    <>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Affiliate Program</h1>
          <p className="text-sm text-muted-foreground">Manage affiliates, commissions, and cashouts</p>
        </div>

        <Tabs defaultValue="affiliates">
          <TabsList>
            <TabsTrigger value="affiliates">Affiliates ({affiliates.length})</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="cashouts">Cashouts ({cashouts.filter((c: any) => c.status === "pending").length})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="affiliates" className="mt-4 space-y-2">
            {affiliates.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
                  <div className="min-w-0">
                    <div className="font-medium">{a.full_name} <span className="text-xs text-muted-foreground">({a.code})</span></div>
                    <div className="text-xs text-muted-foreground">{a.email} • {a.phone}</div>
                    <div className="text-xs mt-1">Earned: {formatPrice(Number(a.total_earned))} • Available: {formatPrice(Number(a.pending_balance))} • Paid: {formatPrice(Number(a.total_paid))}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.status === "approved" ? "default" : a.status === "pending" ? "secondary" : "destructive"}>{a.status}</Badge>
                    {a.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => updateAffiliate(a.id, { status: "approved", approved_at: new Date().toISOString() })}><Check className="w-3 h-3" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => updateAffiliate(a.id, { status: "rejected" })}><X className="w-3 h-3" /></Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setEditing(a)}><Eye className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {affiliates.length === 0 && <div className="text-center text-muted-foreground p-8">No affiliates yet</div>}
          </TabsContent>

          <TabsContent value="commissions" className="mt-4">
            <Card><CardContent className="p-0">
              <div className="divide-y">
                {commissions.map((c: any) => (
                  <div key={c.id} className="p-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{c.order_number} <span className="text-xs text-muted-foreground">— {c.affiliates?.code}</span></div>
                      <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-primary">+{formatPrice(Number(c.commission_amount))}</div>
                      <div className="text-xs text-muted-foreground">Order: {formatPrice(Number(c.order_total))}</div>
                    </div>
                  </div>
                ))}
                {commissions.length === 0 && <div className="text-center text-muted-foreground p-8">No commissions yet</div>}
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="cashouts" className="mt-4 space-y-2">
            {cashouts.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
                  <div className="min-w-0">
                    <div className="font-medium">{formatPrice(Number(c.amount))} <span className="text-xs text-muted-foreground">— {c.affiliates?.full_name} ({c.affiliates?.code})</span></div>
                    <div className="text-xs text-muted-foreground">{c.method.toUpperCase()}: {c.account_details}</div>
                    <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.status === "paid" ? "default" : c.status === "rejected" ? "destructive" : "secondary"}>{c.status}</Badge>
                    {c.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => updateCashout(c, "paid")}>Mark Paid</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateCashout(c, "rejected")}>Reject</Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {cashouts.length === 0 && <div className="text-center text-muted-foreground p-8">No cashout requests</div>}
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Program Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-xl">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Bonus Type</Label>
                    <Select value={settings?.bonus_type || "percentage"} onValueChange={(v) => updateSettings({ bonus_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Bonus Value</Label>
                    <Input type="number" defaultValue={settings?.bonus_value} onBlur={(e) => updateSettings({ bonus_value: Number(e.target.value) })} style={{ fontSize: 16 }} />
                  </div>
                  <div>
                    <Label>Min Cashout</Label>
                    <Input type="number" defaultValue={settings?.min_cashout} onBlur={(e) => updateSettings({ min_cashout: Number(e.target.value) })} style={{ fontSize: 16 }} />
                  </div>
                  <div>
                    <Label>Cookie Days</Label>
                    <Input type="number" defaultValue={settings?.cookie_days} onBlur={(e) => updateSettings({ cookie_days: Number(e.target.value) })} style={{ fontSize: 16 }} />
                  </div>
                </div>
                <div>
                  <Label>Terms & Conditions</Label>
                  <Textarea defaultValue={settings?.terms || ""} onBlur={(e) => updateSettings({ terms: e.target.value })} style={{ fontSize: 16 }} rows={4} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {editing && (
          <Dialog open onOpenChange={() => setEditing(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing.full_name} ({editing.code})</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Status</Label>
                  <Select value={editing.status} onValueChange={(v) => { updateAffiliate(editing.id, { status: v }); setEditing({ ...editing, status: v }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Custom Bonus Type</Label>
                    <Select value={editing.custom_bonus_type || "none"} onValueChange={(v) => { const val = v === "none" ? null : v; updateAffiliate(editing.id, { custom_bonus_type: val }); setEditing({ ...editing, custom_bonus_type: val }); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Use Default</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Custom Bonus Value</Label>
                    <Input type="number" defaultValue={editing.custom_bonus_value || ""} onBlur={(e) => updateAffiliate(editing.id, { custom_bonus_value: e.target.value ? Number(e.target.value) : null })} style={{ fontSize: 16 }} />
                  </div>
                </div>
                <div>
                  <Label>Admin Notes</Label>
                  <Textarea defaultValue={editing.admin_notes || ""} onBlur={(e) => updateAffiliate(editing.id, { admin_notes: e.target.value })} style={{ fontSize: 16 }} />
                </div>
                <div className="text-xs text-muted-foreground">Payout: {editing.payout_method} — {editing.payout_details}</div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  );
};

export default AdminAffiliates;
