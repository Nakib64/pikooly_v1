import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CloudinaryUpload } from "@/components/admin/CloudinaryUpload";
import { Save, Search, Globe, Code2 } from "lucide-react";
import { toast } from "sonner";

const KEYS = [
  "bouquet_seo_title",
  "bouquet_seo_description",
  "bouquet_seo_og_image",
  "bouquet_seo_jsonld_name",
  "bouquet_seo_jsonld_description",
  "store_name",
];

const DEFAULTS: Record<string, string> = {
  bouquet_seo_title: "Custom Flower Bouquet Builder | Design Your Own Bouquet - Pikooly",
  bouquet_seo_description:
    "Create your perfect custom flower bouquet online at Pikooly. Choose from fresh roses, lilies, sunflowers & more. Pick your size, add a personal gift message, and enjoy same-day delivery across Bangladesh.",
  bouquet_seo_og_image: "",
  bouquet_seo_jsonld_name: "Custom Flower Bouquet Builder - Pikooly",
  bouquet_seo_jsonld_description:
    "Design your own custom flower bouquet online. Choose from fresh roses, lilies, sunflowers & more.",
};

const BouquetSEOEditor = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["bouquet-seo-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", KEYS);
      const map: Record<string, string> = {};
      data?.forEach((s: any) => (map[s.key] = s.value || ""));
      return map;
    },
  });

  useEffect(() => {
    if (!isLoading && !loaded) {
      const initial: Record<string, string> = {};
      KEYS.forEach((k) => (initial[k] = settings[k] ?? ""));
      setForm(initial);
      setLoaded(true);
    }
  }, [isLoading, loaded, settings]);

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const get = (k: string) => form[k] || DEFAULTS[k] || "";

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const key of KEYS) {
        if (key === "store_name") continue;
        const value = form[key] || "";
        const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
        if (existing) await supabase.from("site_settings").update({ value }).eq("key", key);
        else if (value) await supabase.from("site_settings").insert({ key, value });
      }
      qc.invalidateQueries({ queryKey: ["bouquet-seo-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("SEO saved!");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="p-4 text-muted-foreground text-sm">Loading...</div>;

  const title = get("bouquet_seo_title");
  const description = get("bouquet_seo_description");
  const ogImage = get("bouquet_seo_og_image");
  const storeName = settings.store_name || "Pikooly";
  const url = `${window.location.origin}/custom-bouquet`;
  const displayUrl = url.replace(/^https?:\/\//, "");

  const titleLen = title.length;
  const descLen = description.length;
  const titleColor = titleLen > 60 ? "text-destructive" : "text-muted-foreground";
  const descColor = descLen > 160 ? "text-destructive" : "text-muted-foreground";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: get("bouquet_seo_jsonld_name"),
    description: get("bouquet_seo_jsonld_description"),
    provider: { "@type": "Organization", name: storeName },
    areaServed: "Bangladesh",
    url,
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Custom Bouquet — SEO & Open Graph
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          These values are rendered in &lt;head&gt; on <code>/custom-bouquet</code>. Preview updates live.
        </p>
      </div>

      {/* Editor */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Meta Title</Label>
            <span className={`text-[11px] ${titleColor}`}>{titleLen}/60</span>
          </div>
          <Input value={form.bouquet_seo_title || ""} onChange={(e) => update("bouquet_seo_title", e.target.value)} placeholder={DEFAULTS.bouquet_seo_title} />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Meta Description</Label>
            <span className={`text-[11px] ${descColor}`}>{descLen}/160</span>
          </div>
          <Textarea
            value={form.bouquet_seo_description || ""}
            onChange={(e) => update("bouquet_seo_description", e.target.value)}
            placeholder={DEFAULTS.bouquet_seo_description}
            rows={3}
          />
        </div>

        <div>
          <Label className="text-sm">Open Graph Image (1200×630 recommended)</Label>
          <CloudinaryUpload
            value={form.bouquet_seo_og_image || ""}
            onChange={(url) => update("bouquet_seo_og_image", url)}
            folder="bouquet-seo"
            label="Upload OG Image"
          />
        </div>

        <Separator />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">JSON-LD Name</Label>
            <Input value={form.bouquet_seo_jsonld_name || ""} onChange={(e) => update("bouquet_seo_jsonld_name", e.target.value)} placeholder={DEFAULTS.bouquet_seo_jsonld_name} />
          </div>
          <div>
            <Label className="text-sm">JSON-LD Description</Label>
            <Input value={form.bouquet_seo_jsonld_description || ""} onChange={(e) => update("bouquet_seo_jsonld_description", e.target.value)} placeholder={DEFAULTS.bouquet_seo_jsonld_description} />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save SEO Settings"}
        </Button>
      </div>

      <Separator />

      {/* Preview Panel */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Live Preview
        </Label>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Exactly what will be rendered on the public page.
        </p>

        {/* Google SERP */}
        <div className="rounded-lg border border-border p-4 bg-background mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-3">
            <Search className="w-3.5 h-3.5" /> Google Search Result
          </div>
          <div className="font-sans">
            <div className="text-xs text-foreground/70">{displayUrl}</div>
            <div className="text-[#1a0dab] dark:text-blue-400 text-xl leading-snug mt-1 truncate hover:underline cursor-pointer">
              {title}
            </div>
            <div className="text-sm text-foreground/80 mt-1 line-clamp-2">{description}</div>
          </div>
        </div>

        {/* Facebook / OG Card */}
        <div className="rounded-lg border border-border p-4 bg-background mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-3">
            <Globe className="w-3.5 h-3.5" /> Open Graph (Facebook / LinkedIn / WhatsApp)
          </div>
          <div className="border border-border rounded-md overflow-hidden max-w-md">
            {ogImage ? (
              <img src={ogImage} alt="OG preview" className="w-full aspect-[1.91/1] object-cover bg-muted" />
            ) : (
              <div className="w-full aspect-[1.91/1] bg-muted flex items-center justify-center text-xs text-muted-foreground">
                No OG image set
              </div>
            )}
            <div className="p-3 bg-muted/30">
              <div className="text-[11px] uppercase text-muted-foreground tracking-wide">{displayUrl.split("/")[0]}</div>
              <div className="text-sm font-semibold text-foreground line-clamp-2 mt-0.5">{title}</div>
              <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{description}</div>
            </div>
          </div>
        </div>

        {/* Raw Tags */}
        <div className="rounded-lg border border-border bg-background">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground p-3 border-b border-border">
            <Code2 className="w-3.5 h-3.5" /> Rendered HTML Tags
          </div>
          <pre className="text-[11px] leading-relaxed p-3 overflow-x-auto text-foreground/80 font-mono">
{`<title>${title}</title>
<meta name="description" content="${description.slice(0, 160)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description.slice(0, 160)}">
<meta property="og:type" content="product">
<meta property="og:url" content="${url}">${ogImage ? `\n<meta property="og:image" content="${ogImage}">` : ""}
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description.slice(0, 160)}">${ogImage ? `\n<meta name="twitter:image" content="${ogImage}">` : ""}
<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
</script>`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default BouquetSEOEditor;
