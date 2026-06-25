"use client";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send, Mail, FileText, History } from "lucide-react";

interface EmailSettings {
  id?: string;
  provider: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  reply_to?: string | null;
  is_active: boolean;
}

const defaults: EmailSettings = {
  provider: "gmail", smtp_host: "smtp.gmail.com", smtp_port: 587, smtp_secure: false,
  smtp_username: "", smtp_password: "", from_email: "", from_name: "Pikooly", reply_to: "", is_active: true,
};

const AdminEmailSettings = () => {
  const [settings, setSettings] = useState<EmailSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: t }, { data: l }] = await Promise.all([
      supabase.from("email_settings").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("email_templates").select("*").order("template_key"),
      supabase.from("custom_email_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (s) setSettings({ ...defaults, ...s });
    setTemplates(t || []);
    setLogs(l || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!settings.smtp_username || !settings.smtp_password || !settings.from_email) {
      toast.error("SMTP username, password, and from email are required");
      return;
    }
    setSaving(true);
    const payload = { ...settings };
    delete (payload as any).id;
    const res = settings.id
      ? await supabase.from("email_settings").update(payload).eq("id", settings.id)
      : await supabase.from("email_settings").insert(payload);
    if (res.error) toast.error(res.error.message);
    else { toast.success("Email settings saved"); load(); }
    setSaving(false);
  };

  const sendTest = async () => {
    if (!testTo) { toast.error("Enter a recipient email"); return; }
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("send-custom-email", {
      body: {
        to: testTo,
        subject: "Test email from {{site_name}}",
        html: `<div style="font-family:-apple-system,sans-serif;padding:24px"><h2>It works!</h2><p>Your SMTP setup is configured correctly. This email was sent from <b>${settings.from_email}</b>.</p></div>`,
      },
    });
    if (error || !data?.success) toast.error(data?.error || error?.message || "Test failed");
    else toast.success("Test email sent — check inbox");
    setTesting(false);
    load();
  };

  const saveTemplate = async (tpl: any) => {
    const { error } = await supabase.from("email_templates").update({
      subject: tpl.subject, html_body: tpl.html_body, is_active: tpl.is_active,
    }).eq("id", tpl.id);
    if (error) toast.error(error.message);
    else toast.success("Template saved");
  };

  if (loading) return <div className="p-6"><Loader2 className="animate-spin" /></div>;

  return (
    <>
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Email Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your own SMTP (Gmail / others) for all auth & notification emails.</p>
        </div>

        <Tabs defaultValue="smtp">
          <TabsList>
            <TabsTrigger value="smtp"><Mail className="w-4 h-4 mr-2" />SMTP</TabsTrigger>
            <TabsTrigger value="templates"><FileText className="w-4 h-4 mr-2" />Templates</TabsTrigger>
            <TabsTrigger value="logs"><History className="w-4 h-4 mr-2" />Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="smtp">
            <Card className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
                <b>Gmail Setup:</b> Use an App Password (not your Gmail password). Generate one at{" "}
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener" className="underline">myaccount.google.com/apppasswords</a>. Requires 2-Step Verification enabled.
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>SMTP Host</Label>
                  <Input value={settings.smtp_host} onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })} />
                </div>
                <div>
                  <Label>Port</Label>
                  <Input type="number" value={settings.smtp_port} onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) || 587 })} />
                </div>
                <div>
                  <Label>Username / Gmail Address</Label>
                  <Input value={settings.smtp_username} onChange={(e) => setSettings({ ...settings, smtp_username: e.target.value })} placeholder="you@gmail.com" />
                </div>
                <div>
                  <Label>Password / App Password</Label>
                  <Input type="password" value={settings.smtp_password} onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })} placeholder="16-char app password" />
                </div>
                <div>
                  <Label>From Email</Label>
                  <Input value={settings.from_email} onChange={(e) => setSettings({ ...settings, from_email: e.target.value })} placeholder="you@gmail.com" />
                </div>
                <div>
                  <Label>From Name</Label>
                  <Input value={settings.from_name} onChange={(e) => setSettings({ ...settings, from_name: e.target.value })} />
                </div>
                <div>
                  <Label>Reply-To (optional)</Label>
                  <Input value={settings.reply_to || ""} onChange={(e) => setSettings({ ...settings, reply_to: e.target.value })} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={settings.smtp_secure} onCheckedChange={(v) => setSettings({ ...settings, smtp_secure: v })} />
                  <Label className="!m-0">Use SSL/TLS (port 465)</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={settings.is_active} onCheckedChange={(v) => setSettings({ ...settings, is_active: v })} />
                  <Label className="!m-0">Active</Label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Settings</Button>
              </div>

              <div className="pt-4 mt-4 border-t">
                <Label>Send Test Email</Label>
                <div className="flex gap-2 mt-2">
                  <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="recipient@example.com" />
                  <Button onClick={sendTest} disabled={testing || !settings.id} variant="secondary">
                    {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}Send Test
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            {templates.map((tpl, idx) => (
              <Card key={tpl.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{tpl.name}</h3>
                    <p className="text-xs text-muted-foreground">{tpl.description} · key: <code>{tpl.template_key}</code></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={tpl.is_active} onCheckedChange={(v) => {
                      const next = [...templates]; next[idx] = { ...tpl, is_active: v }; setTemplates(next);
                    }} />
                    <Label className="text-xs">Active</Label>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Subject</Label>
                  <Input value={tpl.subject} onChange={(e) => {
                    const next = [...templates]; next[idx] = { ...tpl, subject: e.target.value }; setTemplates(next);
                  }} />
                </div>
                <div>
                  <Label className="text-xs">HTML Body (use <code>{"{{name}}"}</code>, <code>{"{{action_url}}"}</code>, <code>{"{{otp_code}}"}</code>, <code>{"{{site_name}}"}</code>)</Label>
                  <Textarea value={tpl.html_body} rows={8} className="font-mono text-xs" onChange={(e) => {
                    const next = [...templates]; next[idx] = { ...tpl, html_body: e.target.value }; setTemplates(next);
                  }} />
                </div>
                <Button size="sm" onClick={() => saveTemplate(tpl)}>Save Template</Button>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="logs">
            <Card className="p-0 overflow-hidden">
              <div className="divide-y">
                {logs.length === 0 && <div className="p-6 text-sm text-muted-foreground">No emails sent yet.</div>}
                {logs.map((l) => (
                  <div key={l.id} className="p-3 flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{l.subject}</div>
                      <div className="text-xs text-muted-foreground truncate">{l.to_email} · {new Date(l.created_at).toLocaleString()}</div>
                      {l.error_message && <div className="text-xs text-destructive truncate mt-1">{l.error_message}</div>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${l.status === "sent" ? "bg-green-100 text-green-800" : l.status === "failed" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{l.status}</span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default AdminEmailSettings;
