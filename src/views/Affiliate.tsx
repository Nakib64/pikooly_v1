import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMultiCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Share2, Wallet, TrendingUp, Clock, CheckCircle2, Link2, MousePointerClick, ShoppingBag, Percent } from "lucide-react";
import { Link, useNavigate } from "@/lib/router-adapter";

const Affiliate = () => {
  const { user } = useAuth();
  const { formatPrice } = useMultiCurrency();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) navigate("/auth?redirect=/affiliate");
  }, [user, navigate]);

  const { data: settings } = useQuery({
    queryKey: ["affiliate-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("affiliate_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const { data: affiliate, isLoading } = useQuery({
    queryKey: ["my-affiliate", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("affiliates").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["affiliate-commissions", affiliate?.id],
    enabled: !!affiliate?.id,
    queryFn: async () => {
      const { data } = await supabase.from("affiliate_commissions").select("*").eq("affiliate_id", affiliate!.id).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: cashouts = [] } = useQuery({
    queryKey: ["affiliate-cashouts", affiliate?.id],
    enabled: !!affiliate?.id,
    queryFn: async () => {
      const { data } = await supabase.from("affiliate_cashouts").select("*").eq("affiliate_id", affiliate!.id).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ["affiliate-analytics", affiliate?.id],
    enabled: !!affiliate?.id,
    queryFn: async () => {
      const [clicksRes, ordersRes] = await Promise.all([
        supabase.from("affiliate_clicks").select("id", { count: "exact", head: true }).eq("affiliate_id", affiliate!.id),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("affiliate_id", affiliate!.id),
      ]);
      return { clicks: clicksRes.count || 0, attributedOrders: ordersRes.count || 0 };
    },
  });

  const bonusLabel = useMemo(() => {
    const t = affiliate?.custom_bonus_type || settings?.bonus_type || "percentage";
    const v = affiliate?.custom_bonus_value ?? settings?.bonus_value ?? 5;
    return t === "fixed" ? `${formatPrice(Number(v))} per order` : `${v}% per order`;
  }, [affiliate, settings, formatPrice]);

  const referralUrl = useMemo(() => {
    if (!affiliate?.code) return "";
    return typeof window !== "undefined" ? `${window.location.origin}/?ref=${affiliate.code}` : "";
  }, [affiliate?.code]);

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    toast.success("Referral link copied!");
  };

  const shareLink = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Shop with my link", url: referralUrl }); } catch {}
    } else {
      copyLink();
    }
  };

  // Apply form
  const [form, setForm] = useState({ full_name: "", phone: "", payout_method: "bkash", payout_details: "" });

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.full_name.trim() || !form.phone.trim() || !form.payout_details.trim()) {
      toast.error("Please fill all fields");
      return;
    }
    setSubmitting(true);
    const code = (form.full_name.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "AFF") + Math.floor(1000 + Math.random() * 9000);
    const { error } = await supabase.from("affiliates").insert({
      user_id: user.id,
      code,
      status: "pending",
      full_name: form.full_name.trim(),
      email: user.email,
      phone: form.phone.trim(),
      payout_method: form.payout_method,
      payout_details: form.payout_details.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Application submitted! Awaiting admin approval.");
    qc.invalidateQueries({ queryKey: ["my-affiliate"] });
  };

  // Cashout form
  const [cashoutAmt, setCashoutAmt] = useState("");
  const [cashoutMethod, setCashoutMethod] = useState("bkash");
  const [cashoutDetails, setCashoutDetails] = useState("");
  const requestCashout = async () => {
    const amt = Number(cashoutAmt);
    const minAmt = Number(settings?.min_cashout || 500);
    if (!amt || amt < minAmt) { toast.error(`Min cashout is ${formatPrice(minAmt)}`); return; }
    if (amt > Number(affiliate?.pending_balance || 0)) { toast.error("Insufficient balance"); return; }
    if (!cashoutDetails.trim()) { toast.error("Enter account details"); return; }
    const { error } = await supabase.from("affiliate_cashouts").insert({
      affiliate_id: affiliate!.id,
      user_id: user!.id,
      amount: amt,
      method: cashoutMethod,
      account_details: cashoutDetails.trim(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Cashout request submitted");
    setCashoutAmt(""); setCashoutDetails("");
    qc.invalidateQueries({ queryKey: ["affiliate-cashouts"] });
  };

  if (!user || isLoading) {
    return (
      <main className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-4 w-72 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-2">
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              <div className="h-6 w-24 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-32 w-full rounded-xl bg-muted animate-pulse" />
        <div className="h-64 w-full rounded-xl bg-muted animate-pulse" />
      </main>
    );
  }

  // Not applied yet → application form
  if (!affiliate) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Become an Affiliate</h1>
        <p className="text-muted-foreground mb-6">
          Earn <span className="font-semibold text-primary">{bonusLabel}</span> for every delivered order through your referral link.
        </p>
        <Card>
          <CardHeader><CardTitle>Apply Now</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} style={{ fontSize: 16 }} required />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{ fontSize: 16 }} required />
              </div>
              <div>
                <Label>Payout Method</Label>
                <Select value={form.payout_method} onValueChange={(v) => setForm({ ...form, payout_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Account Number / Details</Label>
                <Textarea value={form.payout_details} onChange={(e) => setForm({ ...form, payout_details: e.target.value })} style={{ fontSize: 16 }} required />
              </div>
              {settings?.terms && (
                <div className="text-xs text-muted-foreground p-3 bg-muted rounded">{settings.terms}</div>
              )}
              <Button type="submit" disabled={submitting} className="w-full">{submitting ? "Submitting..." : "Submit Application"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Status views
  if (affiliate.status === "pending") {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-12 text-center">
        <Clock className="w-16 h-16 mx-auto text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">Application Under Review</h1>
        <p className="text-muted-foreground">Your affiliate application is pending admin approval. We'll notify you once approved.</p>
      </div>
    );
  }

  if (affiliate.status === "rejected" || affiliate.status === "suspended") {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-2">Application {affiliate.status}</h1>
        {affiliate.admin_notes && <p className="text-muted-foreground">{affiliate.admin_notes}</p>}
      </div>
    );
  }

  // Approved dashboard
  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Affiliate Dashboard</h1>
          <p className="text-sm text-muted-foreground">Earn {bonusLabel}</p>
        </div>
        <Badge variant="secondary" className="text-sm">Code: {affiliate.code}</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Wallet className="w-3.5 h-3.5" /> Available</div>
          <div className="text-xl font-bold text-primary">{formatPrice(Number(affiliate.pending_balance || 0))}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="w-3.5 h-3.5" /> Total Earned</div>
          <div className="text-xl font-bold">{formatPrice(Number(affiliate.total_earned || 0))}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><CheckCircle2 className="w-3.5 h-3.5" /> Paid Out</div>
          <div className="text-xl font-bold">{formatPrice(Number(affiliate.total_paid || 0))}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Link2 className="w-3.5 h-3.5" /> Orders</div>
          <div className="text-xl font-bold">{commissions.length}</div>
        </CardContent></Card>
      </div>

      {/* Referral analytics */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Referral Analytics</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><MousePointerClick className="w-3.5 h-3.5" /> Link Clicks</div>
              <div className="text-xl font-bold">{analytics?.clicks ?? 0}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><ShoppingBag className="w-3.5 h-3.5" /> Attributed Orders</div>
              <div className="text-xl font-bold">{analytics?.attributedOrders ?? 0}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><CheckCircle2 className="w-3.5 h-3.5" /> Conversions (paid)</div>
              <div className="text-xl font-bold">{commissions.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Percent className="w-3.5 h-3.5" /> Conversion Rate</div>
              <div className="text-xl font-bold">
                {analytics?.clicks ? ((commissions.length / analytics.clicks) * 100).toFixed(1) : "0.0"}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral link */}
      <Card>
        <CardHeader><CardTitle className="text-base">Your Referral Link</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input readOnly value={referralUrl} style={{ fontSize: 16 }} className="font-mono text-sm" />
            <div className="flex gap-2">
              <Button onClick={copyLink} variant="outline" className="flex-1 sm:flex-none"><Copy className="w-4 h-4 mr-1" />Copy</Button>
              <Button onClick={shareLink} className="flex-1 sm:flex-none"><Share2 className="w-4 h-4 mr-1" />Share</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Bonus credits to your wallet automatically when the order is delivered & paid.</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="commissions">
        <TabsList className="grid grid-cols-3 w-full sm:w-auto">
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="cashout">Cashout</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="commissions" className="mt-4">
          <Card><CardContent className="p-0">
            {commissions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No commissions yet. Share your link to start earning!</div>
            ) : (
              <div className="divide-y">
                {commissions.map((c: any) => (
                  <div key={c.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{c.order_number}</div>
                      <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()} • Order: {formatPrice(Number(c.order_total))}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-primary">+{formatPrice(Number(c.commission_amount))}</div>
                      <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="cashout" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Request Cashout</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">Available: <span className="font-semibold text-primary">{formatPrice(Number(affiliate.pending_balance || 0))}</span> • Min: {formatPrice(Number(settings?.min_cashout || 500))}</div>
              <div>
                <Label>Amount</Label>
                <Input type="number" value={cashoutAmt} onChange={(e) => setCashoutAmt(e.target.value)} style={{ fontSize: 16 }} />
              </div>
              <div>
                <Label>Method</Label>
                <Select value={cashoutMethod} onValueChange={setCashoutMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wallet">Keep in Wallet (instant)</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Account Details</Label>
                <Textarea value={cashoutDetails} onChange={(e) => setCashoutDetails(e.target.value)} placeholder="e.g. bKash: 017xxxxxxxx" style={{ fontSize: 16 }} />
              </div>
              <Button onClick={requestCashout} className="w-full">Request Cashout</Button>
              <p className="text-xs text-muted-foreground">Note: Your earnings are auto-credited to your wallet. Use this form to request a direct payout instead.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card><CardContent className="p-0">
            {cashouts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No cashout requests yet.</div>
            ) : (
              <div className="divide-y">
                {cashouts.map((c: any) => (
                  <div key={c.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{formatPrice(Number(c.amount))} • {c.method}</div>
                      <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</div>
                      {c.admin_notes && <div className="text-xs text-muted-foreground mt-1">{c.admin_notes}</div>}
                    </div>
                    <Badge variant={c.status === "paid" ? "default" : c.status === "rejected" ? "destructive" : "secondary"}>{c.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <div className="text-center pt-4">
        <Link to="/account" className="text-sm text-primary underline">Back to Account</Link>
      </div>
    </div>
  );
};

export default Affiliate;
