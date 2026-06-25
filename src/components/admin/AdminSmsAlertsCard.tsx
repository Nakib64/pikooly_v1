import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BellRing, X, Plus, Send } from "lucide-react";

const KEYS = [
  "admin_sms_recipients",
  "admin_sms_new_order_enabled",
  "admin_sms_low_stock_enabled",
  "low_stock_threshold",
] as const;

export default function AdminSmsAlertsCard() {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [phoneInput, setPhoneInput] = useState("");
  const [newOrderOn, setNewOrderOn] = useState(false);
  const [lowStockOn, setLowStockOn] = useState(false);
  const [threshold, setThreshold] = useState(5);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("key, value").in("key", KEYS as unknown as string[])
      .then(({ data }) => {
        if (!data) return;
        const map = Object.fromEntries(data.map((r: any) => [r.key, r.value]));
        const rec = map["admin_sms_recipients"];
        setRecipients(rec ? rec.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
        setNewOrderOn(map["admin_sms_new_order_enabled"] === "true");
        setLowStockOn(map["admin_sms_low_stock_enabled"] === "true");
        setThreshold(parseInt(map["low_stock_threshold"] || "5", 10) || 5);
      });
  }, []);

  const addPhone = () => {
    const p = phoneInput.trim();
    if (!p) return;
    if (recipients.includes(p)) { toast.error("Already added"); return; }
    setRecipients([...recipients, p]);
    setPhoneInput("");
  };
  const removePhone = (p: string) => setRecipients(recipients.filter((x) => x !== p));

  const save = async () => {
    setSaving(true);
    try {
      const rows = [
        { key: "admin_sms_recipients", value: recipients.join(",") },
        { key: "admin_sms_new_order_enabled", value: newOrderOn ? "true" : "false" },
        { key: "admin_sms_low_stock_enabled", value: lowStockOn ? "true" : "false" },
        { key: "low_stock_threshold", value: String(threshold) },
      ];
      const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
      if (error) { toast.error(error.message); return; }
      toast.success("Admin SMS alerts saved");
    } finally { setSaving(false); }
  };

  const sendTest = async () => {
    if (recipients.length === 0) { toast.error("Add at least one phone first"); return; }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-admin-sms", { body: { event: "test" } });
      if (error) toast.error(error.message);
      else toast.success(`Test sent to ${data?.sent ?? 0} / ${data?.total ?? 0}`);
    } finally { setTesting(false); }
  };

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <BellRing size={18} /> Admin SMS Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-4 sm:px-6">
        <div>
          <Label className="text-sm">Recipient phone numbers (BD format e.g. 8801XXXXXXXXX)</Label>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <Input
              value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="01XXXXXXXXX"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPhone(); } }}
              className="text-base flex-1"
            />
            <Button type="button" onClick={addPhone} variant="secondary" className="w-full sm:w-auto">
              <Plus size={14} className="sm:mr-0 mr-1" />
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {recipients.map((p) => (
              <Badge key={p} variant="secondary" className="flex items-center gap-1 px-2 py-1 max-w-full">
                <span className="truncate">{p}</span>
                <button onClick={() => removePhone(p)} className="shrink-0"><X size={12} /></button>
              </Badge>
            ))}
            {recipients.length === 0 && <span className="text-xs text-muted-foreground">No recipients yet</span>}
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 border-t pt-4">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">New Order Alerts</div>
            <div className="text-xs text-muted-foreground">SMS admins when a new order is placed</div>
          </div>
          <Switch checked={newOrderOn} onCheckedChange={setNewOrderOn} className="shrink-0" />
        </div>

        <div className="flex items-start justify-between gap-3 border-t pt-4">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">Low Stock Alerts</div>
            <div className="text-xs text-muted-foreground">SMS admins when product stock drops below threshold</div>
          </div>
          <Switch checked={lowStockOn} onCheckedChange={setLowStockOn} className="shrink-0" />
        </div>

        {lowStockOn && (
          <div>
            <Label className="text-sm">Low stock threshold</Label>
            <Input type="number" min={1} value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value) || 5)} className="mt-2 w-full max-w-[160px] text-base" />
          </div>
        )}

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-2 border-t">
          <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          <Button onClick={sendTest} disabled={testing} variant="outline" className="w-full sm:w-auto">
            <Send size={14} className="mr-1" /> {testing ? "Sending..." : "Send Test SMS"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
