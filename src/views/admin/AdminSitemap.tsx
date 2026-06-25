import { useEffect, useState } from "react";
import { Plus, Trash2, Save, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Section {
  id: string;
  title: string;
  sort_order: number;
  is_active: boolean;
}
interface LinkRow {
  id: string;
  section_id: string;
  label: string;
  url: string;
  sort_order: number;
  is_active: boolean;
}

const AdminSitemap = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const [s, l] = await Promise.all([
      supabase.from("sitemap_sections").select("*").order("sort_order"),
      supabase.from("sitemap_links").select("*").order("sort_order"),
    ]);
    setSections((s.data as Section[]) || []);
    setLinks((l.data as LinkRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addSection = async () => {
    const max = Math.max(0, ...sections.map((s) => s.sort_order));
    const { data, error } = await supabase
      .from("sitemap_sections")
      .insert({ title: "New Section", sort_order: max + 1 })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setSections([...sections, data as Section]);
    setExpanded({ ...expanded, [(data as Section).id]: true });
  };

  const updateSection = async (id: string, patch: Partial<Section>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const { error } = await supabase.from("sitemap_sections").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };

  const deleteSection = async (id: string) => {
    if (!confirm("Delete this section and all its links?")) return;
    const { error } = await supabase.from("sitemap_sections").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setSections((prev) => prev.filter((s) => s.id !== id));
    setLinks((prev) => prev.filter((l) => l.section_id !== id));
    toast.success("Section deleted");
  };

  const addLink = async (section_id: string) => {
    const sectionLinks = links.filter((l) => l.section_id === section_id);
    const max = Math.max(0, ...sectionLinks.map((l) => l.sort_order));
    const { data, error } = await supabase
      .from("sitemap_links")
      .insert({ section_id, label: "New Link", url: "/", sort_order: max + 1 })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setLinks([...links, data as LinkRow]);
  };

  const updateLink = (id: string, patch: Partial<LinkRow>) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const saveLink = async (id: string) => {
    const link = links.find((l) => l.id === id);
    if (!link) return;
    const { error } = await supabase
      .from("sitemap_links")
      .update({ label: link.label, url: link.url, sort_order: link.sort_order, is_active: link.is_active })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  const deleteLink = async (id: string) => {
    const { error } = await supabase.from("sitemap_links").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Sitemap</h1>
            <p className="text-sm text-muted-foreground">Manage sections and links shown on /sitemap.html</p>
          </div>
          <Button onClick={addSection}>
            <Plus className="w-4 h-4 mr-2" /> Add Section
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : sections.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No sections yet. Click "Add Section" to start.
          </Card>
        ) : (
          <div className="space-y-3">
            {sections.map((s) => {
              const isOpen = expanded[s.id];
              const sLinks = links.filter((l) => l.section_id === s.id).sort((a, b) => a.sort_order - b.sort_order);
              return (
                <Card key={s.id} className="p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      value={s.title}
                      onChange={(e) => setSections((prev) => prev.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
                      onBlur={(e) => updateSection(s.id, { title: e.target.value })}
                      className="flex-1 min-w-[200px] font-medium"
                    />
                    <Input
                      type="number"
                      value={s.sort_order}
                      onChange={(e) => setSections((prev) => prev.map((x) => (x.id === s.id ? { ...x, sort_order: Number(e.target.value) } : x)))}
                      onBlur={(e) => updateSection(s.id, { sort_order: Number(e.target.value) })}
                      className="w-20"
                      title="Order"
                    />
                    <div className="flex items-center gap-2">
                      <Switch checked={s.is_active} onCheckedChange={(v) => updateSection(s.id, { is_active: v })} />
                      <span className="text-xs">Active</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setExpanded({ ...expanded, [s.id]: !isOpen })} aria-label={isOpen ? "Collapse section" : "Expand section"}>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteSection(s.id)} aria-label="Delete section">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  {isOpen && (
                    <div className="mt-4 space-y-2 pl-2 border-l-2 border-border">
                      {sLinks.map((l) => (
                        <div key={l.id} className="flex items-center gap-2 flex-wrap">
                          <Input
                            value={l.label}
                            onChange={(e) => updateLink(l.id, { label: e.target.value })}
                            placeholder="Label"
                            className="flex-1 min-w-[150px]"
                          />
                          <Input
                            value={l.url}
                            onChange={(e) => updateLink(l.id, { url: e.target.value })}
                            placeholder="/url"
                            className="flex-1 min-w-[150px]"
                          />
                          <Input
                            type="number"
                            value={l.sort_order}
                            onChange={(e) => updateLink(l.id, { sort_order: Number(e.target.value) })}
                            className="w-20"
                            title="Order"
                          />
                          <Switch checked={l.is_active} onCheckedChange={(v) => updateLink(l.id, { is_active: v })} />
                          <Button variant="ghost" size="icon" onClick={() => saveLink(l.id)}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteLink(l.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => addLink(s.id)}>
                        <Plus className="w-4 h-4 mr-2" /> Add Link
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default AdminSitemap;
