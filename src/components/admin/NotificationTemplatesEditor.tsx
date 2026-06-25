import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

interface Template {
  id: string;
  event_key: string;
  label: string;
  title_template: string;
  body_template: string;
  click_url_template: string | null;
  variables: string[];
  enabled: boolean;
}

export default function NotificationTemplatesEditor() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("notification_templates").select("*").order("label");
    setTemplates((data as Template[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Template>) =>
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const save = async (t: Template) => {
    setSavingId(t.id);
    const { error } = await supabase
      .from("notification_templates")
      .update({
        title_template: t.title_template,
        body_template: t.body_template,
        click_url_template: t.click_url_template,
        enabled: t.enabled,
      })
      .eq("id", t.id);
    setSavingId(null);
    if (error) toast.error(error.message);
    else toast.success(`Saved “${t.label}”`);
  };

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      {templates.map((t) => (
        <Card key={t.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold">{t.label}</h3>
              <code className="text-xs text-muted-foreground">{t.event_key}</code>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Enabled</Label>
              <Switch checked={t.enabled} onCheckedChange={(v) => update(t.id, { enabled: v })} />
            </div>
          </div>

          {t.variables.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground mr-1">Variables:</span>
              {t.variables.map((v) => (
                <Badge key={v} variant="outline" className="font-mono text-[10px]">{`{{${v}}}`}</Badge>
              ))}
            </div>
          )}

          <div>
            <Label className="text-xs uppercase">Title</Label>
            <Input value={t.title_template} onChange={(e) => update(t.id, { title_template: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs uppercase">Body</Label>
            <Textarea value={t.body_template} onChange={(e) => update(t.id, { body_template: e.target.value })} rows={2} />
          </div>
          <div>
            <Label className="text-xs uppercase">Click URL</Label>
            <Input value={t.click_url_template || ""} onChange={(e) => update(t.id, { click_url_template: e.target.value })} />
          </div>
          <Button size="sm" onClick={() => save(t)} disabled={savingId === t.id}>
            {savingId === t.id ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving</> : <><Save className="h-4 w-4 mr-2" /> Save</>}
          </Button>
        </Card>
      ))}
    </div>
  );
}
