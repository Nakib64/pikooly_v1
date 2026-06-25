import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

export default function SendTestNotificationCard() {
  const [targetType, setTargetType] = useState<"token" | "topic" | "all">("token");
  const [targetValue, setTargetValue] = useState("");
  const [title, setTitle] = useState("Pikooly test notification");
  const [body, setBody] = useState("Hello from Pikooly admin 🎉");
  const [url, setUrl] = useState("/");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const send = async () => {
    if (targetType !== "all" && !targetValue.trim()) {
      toast.error(`Please provide a ${targetType}`);
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          title,
          body,
          url,
          target: { type: targetType, value: targetType === "all" ? undefined : targetValue.trim() },
        },
      });
      if (error) throw error;
      setResult(data);
      if (data?.success) toast.success(`Sent (${data.sent}/${data.total})`);
      else toast.error(data?.error || "Send failed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send");
      setResult({ error: e?.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2"><Send className="h-4 w-4" /> Send Test Notification</h3>
        <p className="text-xs text-muted-foreground">Use this to verify FCM delivery using the saved Firebase service account.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs uppercase">Target</Label>
          <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="token">Device token</SelectItem>
              <SelectItem value="topic">Topic</SelectItem>
              <SelectItem value="all">All registered devices</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {targetType !== "all" && (
          <div>
            <Label className="text-xs uppercase">{targetType === "token" ? "FCM Device Token" : "Topic name"}</Label>
            <Input value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder={targetType === "token" ? "fcm token…" : "all_users"} />
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs uppercase">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs uppercase">Click URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-xs uppercase">Body</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
      </div>

      <Button onClick={send} disabled={sending}>
        {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</> : <><Send className="h-4 w-4 mr-2" /> Send</>}
      </Button>

      {result && (
        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">{JSON.stringify(result, null, 2)}</pre>
      )}
    </Card>
  );
}
