import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CloudinaryUpload } from "@/components/admin/CloudinaryUpload";
import dynamic from "next/dynamic";
const RichTextEditor = dynamic(() => import("@/components/admin/RichTextEditor"), {
  ssr: false,
  loading: () => <div className="border rounded-lg min-h-[90px] sm:min-h-[140px] bg-muted/10 animate-pulse" />
});
import { toast } from "sonner";
import { FileText, Search, MessageSquare, Save, PlusCircle, Trash2 } from "lucide-react";

interface PageContentEditorProps {
  prefix: string;
  title: string;
}

const MAX_FAQS = 20;

const PageContentEditor = ({ prefix, title }: PageContentEditorProps) => {
  const queryClient = useQueryClient();

  // Build all possible keys (up to 20 FAQs)
  const baseKeys = [
    `${prefix}_page_title`,
    `${prefix}_page_description`,
    `${prefix}_page_seo_title`,
    `${prefix}_page_seo_slug`,
    `${prefix}_page_seo_description`,
  ];
  const allFaqKeys = Array.from({ length: MAX_FAQS }, (_, i) => [
    `${prefix}_page_faq_${i + 1}_question`,
    `${prefix}_page_faq_${i + 1}_answer`,
  ]).flat();
  const allKeys = [...baseKeys, ...allFaqKeys];

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: [`${prefix}-page-content`],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", allKeys);
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value || ""; });
      return map;
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !loaded) {
      const initial: Record<string, string> = {};
      baseKeys.forEach(k => { initial[k] = settings[k] || ""; });
      setForm(initial);

      // Load existing FAQs dynamically
      const existingFaqs: { question: string; answer: string }[] = [];
      for (let i = 1; i <= MAX_FAQS; i++) {
        const q = settings[`${prefix}_page_faq_${i}_question`] || "";
        const a = settings[`${prefix}_page_faq_${i}_answer`] || "";
        if (q || a) existingFaqs.push({ question: q, answer: a });
      }
      setFaqs(existingFaqs);
      setLoaded(true);
    }
  }, [isLoading, loaded, settings]);

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const addFaq = () => {
    if (faqs.length >= MAX_FAQS) {
      toast.error(`Maximum ${MAX_FAQS} FAQs allowed`);
      return;
    }
    setFaqs(prev => [...prev, { question: "", answer: "" }]);
  };

  const removeFaq = (index: number) => {
    setFaqs(prev => prev.filter((_, i) => i !== index));
  };

  const updateFaq = (index: number, field: "question" | "answer", value: string) => {
    setFaqs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save base fields
      for (const key of baseKeys) {
        const value = form[key] || "";
        if (!value && !settings[key]) continue;
        const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
        if (existing) {
          await supabase.from("site_settings").update({ value }).eq("key", key);
        } else {
          await supabase.from("site_settings").insert({ key, value });
        }
      }

      // Save FAQs (write all slots, clear unused ones)
      for (let i = 1; i <= MAX_FAQS; i++) {
        const qKey = `${prefix}_page_faq_${i}_question`;
        const aKey = `${prefix}_page_faq_${i}_answer`;
        const qVal = faqs[i - 1]?.question || "";
        const aVal = faqs[i - 1]?.answer || "";

        for (const [key, value] of [[qKey, qVal], [aKey, aVal]]) {
          if (!value && !settings[key]) continue;
          const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
          if (existing) {
            await supabase.from("site_settings").update({ value }).eq("key", key);
          } else if (value) {
            await supabase.from("site_settings").insert({ key, value });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: [`${prefix}-page-content`] });
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success(`${title} content saved!`);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="p-4 text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <FileText className="w-3 h-3" /> {title} — Page Content (SEO)
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          This content appears at the bottom of the /{prefix}/ page above the footer for SEO purposes.
        </p>
      </div>

      {/* Section Title */}
      <div>
        <Label className="text-sm">Section Title</Label>
        <Input
          value={form[`${prefix}_page_title`] || ""}
          onChange={e => updateField(`${prefix}_page_title`, e.target.value)}
          placeholder={`${title} in Bangladesh`}
        />
      </div>

      {/* Long Description */}
      <div>
        <Label className="text-sm">Long Description (Rich Text)</Label>
        <RichTextEditor
          value={form[`${prefix}_page_description`] || ""}
          onChange={val => updateField(`${prefix}_page_description`, val)}
        />
      </div>

      <Separator />

      {/* SEO Settings */}
      <div className="space-y-4">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <Search className="w-3 h-3" /> SEO Settings
        </Label>

        <div>
          <div className="flex justify-between items-center">
            <Label className="text-sm">SEO Title</Label>
            <span className={`text-xs ${(form[`${prefix}_page_seo_title`]?.length || 0) > 60 ? "text-destructive" : "text-muted-foreground"}`}>
              {form[`${prefix}_page_seo_title`]?.length || 0}/60
            </span>
          </div>
          <Input
            value={form[`${prefix}_page_seo_title`] || ""}
            onChange={e => updateField(`${prefix}_page_seo_title`, e.target.value)}
            placeholder="Custom SEO title..."
            maxLength={60}
          />
        </div>

        <div>
          <div className="flex justify-between items-center">
            <Label className="text-sm">Permalink (Slug)</Label>
            <span className={`text-xs ${(form[`${prefix}_page_seo_slug`]?.length || 0) > 75 ? "text-destructive" : "text-muted-foreground"}`}>
              {form[`${prefix}_page_seo_slug`]?.length || 0}/75
            </span>
          </div>
          <Input
            value={form[`${prefix}_page_seo_slug`] || ""}
            onChange={e => updateField(`${prefix}_page_seo_slug`, e.target.value.toLowerCase().replace(/[^a-z0-9-/]/g, "-"))}
            placeholder={prefix}
            maxLength={75}
          />
        </div>

        <div>
          <div className="flex justify-between items-center">
            <Label className="text-sm">Meta Description</Label>
            <span className={`text-xs ${(form[`${prefix}_page_seo_description`]?.length || 0) > 160 ? "text-destructive" : "text-muted-foreground"}`}>
              {form[`${prefix}_page_seo_description`]?.length || 0}/160
            </span>
          </div>
          <Textarea
            value={form[`${prefix}_page_seo_description`] || ""}
            onChange={e => updateField(`${prefix}_page_seo_description`, e.target.value)}
            placeholder="Custom meta description..."
            rows={3}
            maxLength={160}
          />
        </div>
      </div>

      <Separator />

      {/* Dynamic FAQ Section */}
      <div>
        <div className="flex justify-between items-center">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> FAQ Section
          </Label>
          <Button type="button" variant="outline" size="sm" onClick={addFaq}>
            <PlusCircle className="w-4 h-4 mr-1" /> Add FAQ
          </Button>
        </div>
        <div className="space-y-4 mt-3">
          {faqs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
              No FAQs added yet. Click "Add FAQ" to create one.
            </p>
          )}
          {faqs.map((faq, i) => (
            <div key={i} className="border border-border/50 rounded-lg p-3 bg-muted/20 space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-muted-foreground">FAQ {i + 1}</Label>
                <Button type="button" variant="ghost" size="sm" className="text-destructive h-7 px-2" onClick={() => removeFaq(i)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                </Button>
              </div>
              <Input
                value={faq.question}
                onChange={e => updateFaq(i, "question", e.target.value)}
                placeholder={`Question ${i + 1}`}
              />
              <Textarea
                value={faq.answer}
                onChange={e => updateFaq(i, "answer", e.target.value)}
                placeholder={`Answer ${i + 1}`}
                rows={2}
              />
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : `Save ${title} Content`}
      </Button>
    </div>
  );
};

export default PageContentEditor;
