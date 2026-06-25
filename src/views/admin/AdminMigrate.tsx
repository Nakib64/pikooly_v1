import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Loader2, CheckCircle, Trash2, Cloud, CloudOff, Upload, Archive, AlertCircle, RefreshCw, FileImage, Link2, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";

type ImageLogEntry = {
  file: string;
  folder: string;
  source: string;
  target: "cloudinary" | "r2" | "source";
  cloudinary: { ok: boolean; error: string | null; url: string | null } | null;
  r2: { ok: boolean; error: string | null; url: string | null } | null;
  fellBack: boolean;
  storedUrl: string | null;
};


// Full backup — ordered so parent tables are restored before children (FK safe)
const BACKUP_TABLES = [
  // Site & settings
  "site_settings",
  "currencies",
  "email_settings",
  "email_templates",
  "notification_templates",
  "sitemap_sections",
  "sitemap_links",
  // Taxonomy
  "categories",
  "subcategories",
  "relationship_categories",
  "event_categories",
  // Catalog
  "products",
  "product_categories",
  "product_subcategories",
  "product_colors",
  "product_sizes",
  // Bouquet builder
  "bouquet_flowers",
  "bouquet_colors",
  "bouquet_sizes",
  "bouquet_materials",
  // Content
  "blogs",
  "reviews",
  "sliders",
  "offer_banners",
  "gifting_stories",
  "popular_gifting",
  "home_living_gifts",
  "celebrations",
  // Shipping & delivery
  "shipping_districts",
  "upazilas",
  "shipping_category_fees",
  "delivery_modes",
  "delivery_mode_cities",
  "delivery_mode_exclusions",
  "category_delivery_modes",
  "subcategory_delivery_modes",
  // Commerce
  "coupons",
  "cart_addons",
  "loyalty_program_settings",
  "loyalty_gift_items",
  // Sellers
  "sellers",
  "seller_categories",
  "seller_subcategories",
  // Users
  "profiles",
  "user_roles",
  "saved_addresses",
  "wallets",
  "wallet_transactions",
  "wishlist",
  "newsletter_subscribers",
  // Affiliates
  "affiliate_settings",
  "affiliates",
  "affiliate_commissions",
  "affiliate_cashouts",
  // Orders
  "orders",
  "order_items",
  "order_status_history",
  "bouquet_orders",
  "bulk_quote_requests",
  // Events & photo
  "event_packages",
  "event_bookings",
  "photo_services",
  "photo_packages",
  "photo_portfolio",
  "photo_travel_fees",
  "photo_bookings",
  // Loyalty
  "loyalty_winners",
] as const;

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AdminMigrate = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [uploadToCloud, setUploadToCloud] = useState(true);
  const [uploadToR2, setUploadToR2] = useState(false);
  const [preferStorage, setPreferStorage] = useState<"cloudinary" | "r2">("cloudinary");
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState("");
  const [imageLog, setImageLog] = useState<ImageLogEntry[]>([]);
  const [imgStats, setImgStats] = useState({ ok: 0, fallback: 0, failed: 0 });
  const [lastMigrationType, setLastMigrationType] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ---- URL Migration ----
  const [urlInput, setUrlInput] = useState("");
  const [urlCategoryId, setUrlCategoryId] = useState<string>("none");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlResults, setUrlResults] = useState<{ total: number; inserted: number; failed: number; errors: { url: string; reason: string }[] } | null>(null);
  const [urlItemLog, setUrlItemLog] = useState<{ ok: boolean; url: string; name?: string; reason?: string }[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; name: string }[]>([]);
  const urlAbortRef = useRef<AbortController | null>(null);

  // ---- URL Preview (pick best image, choose storage, save) ----
  type PreviewItem = {
    name: string; slug: string; description: string; shortDescription: string;
    price: number; originalPrice: number | null; images: string[]; sourceUrl: string;
    selectedImage?: string; target?: "cloudinary" | "r2" | "source"; saving?: boolean; saved?: boolean; error?: string;
  };
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);


  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      if (data) setCategoryOptions(data);
    })();
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["migration_upload_to_cloudinary", "migration_upload_to_r2", "migration_prefer_storage"]);
      if (!data) return;
      const map = Object.fromEntries(data.map((r: any) => [r.key, r.value]));
      if (map.migration_upload_to_cloudinary !== undefined) setUploadToCloud(map.migration_upload_to_cloudinary === "true" || map.migration_upload_to_cloudinary === true);
      if (map.migration_upload_to_r2 !== undefined) setUploadToR2(map.migration_upload_to_r2 === "true" || map.migration_upload_to_r2 === true);
      if (map.migration_prefer_storage === "cloudinary" || map.migration_prefer_storage === "r2") setPreferStorage(map.migration_prefer_storage);
    })();
  }, []);

  const saveMigrationPrefs = async () => {
    setSavingPrefs(true);
    try {
      const rows = [
        { key: "migration_upload_to_cloudinary", value: String(uploadToCloud) },
        { key: "migration_upload_to_r2", value: String(uploadToR2) },
        { key: "migration_prefer_storage", value: preferStorage },
      ];
      const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Migration settings saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSavingPrefs(false);
    }
  };

  const runUrlMigration = async () => {
    const urls = urlInput.split(/\s+/).map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u));
    if (!urls.length) { toast.error("Paste at least one valid URL (http/https)"); return; }

    setUrlLoading(true);
    setUrlResults(null);
    setUrlItemLog([]);
    setImageLog([]);
    setImgStats({ ok: 0, fallback: 0, failed: 0 });
    setProgress(0);
    setProgressStep("Starting...");

    const controller = new AbortController();
    urlAbortRef.current = controller;

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
      const res = await fetch(`${supabaseUrl}/functions/v1/url-migrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}`, "apikey": supabaseKey },
        body: JSON.stringify({
          urls,
          uploadToCloud,
          uploadToR2,
          preferStorage,
          categoryId: urlCategoryId === "none" ? null : urlCategoryId,
        }),
        signal: controller.signal,
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || `HTTP ${res.status}`); }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "progress") { setProgress(data.percent || 0); setProgressStep(data.step || ""); }
            else if (data.type === "image") {
              const entry: ImageLogEntry = { file: data.file, folder: data.folder || "products", source: data.source || "", target: data.target, cloudinary: data.cloudinary, r2: data.r2, fellBack: !!data.fellBack, storedUrl: data.storedUrl };
              setImageLog((prev) => [entry, ...prev].slice(0, 200));
              setImgStats((p) => ({ ok: p.ok + (entry.target !== "source" ? 1 : 0), fallback: p.fallback + (entry.fellBack ? 1 : 0), failed: p.failed + (entry.target === "source" ? 1 : 0) }));
            }
            else if (data.type === "item") {
              setUrlItemLog((prev) => [{ ok: !!data.ok, url: data.url, name: data.name, reason: data.reason }, ...prev].slice(0, 500));
            }
            else if (data.type === "done") { setUrlResults(data.results); toast.success(`Imported ${data.results.inserted} of ${data.results.total} products`); }
            else if (data.type === "error") throw new Error(data.message);
          } catch (e: any) { if (e.message && !e.message.includes("JSON")) throw e; }
        }
      }
    } catch (e: any) {
      if (e.name === "AbortError") toast.info("Cancelled");
      else { console.error(e); toast.error(e.message || "URL migration failed"); }
    } finally {
      setUrlLoading(false);
      urlAbortRef.current = null;
    }
  };

  const runUrlPreview = async () => {
    const urls = urlInput.split(/\s+/).map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u));
    if (!urls.length) { toast.error("Paste at least one valid URL (http/https)"); return; }
    setPreviewLoading(true);
    setPreviewItems([]);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
      const res = await fetch(`${supabaseUrl}/functions/v1/url-migrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}`, "apikey": supabaseKey },
        body: JSON.stringify({ mode: "preview", urls }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      const items: PreviewItem[] = (j.items || []).map((it: any) => ({
        ...it,
        selectedImage: it.images?.[0],
        target: uploadToR2 && !uploadToCloud ? "r2" : "cloudinary",
      }));
      setPreviewItems(items);
      if (!items.length) toast.error("Nothing scraped from those URLs");
      else toast.success(`Found ${items.length} product${items.length > 1 ? "s" : ""} — pick the best image and Save`);
    } catch (e: any) {
      toast.error(e.message || "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  };

  const saveSinglePreview = async (index: number) => {
    const it = previewItems[index];
    if (!it) return;
    if (!it.selectedImage) { toast.error("Pick an image first"); return; }
    if (!it.target) { toast.error("Choose Cloudinary or R2"); return; }
    setPreviewItems((prev) => prev.map((p, i) => i === index ? { ...p, saving: true, error: undefined } : p));
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
      const res = await fetch(`${supabaseUrl}/functions/v1/url-migrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}`, "apikey": supabaseKey },
        body: JSON.stringify({
          mode: "save",
          product: {
            name: it.name, slug: it.slug, description: it.description, shortDescription: it.shortDescription,
            price: it.price, originalPrice: it.originalPrice, images: [], sourceUrl: it.sourceUrl,
          },
          imageUrl: it.selectedImage,
          target: it.target,
          categoryId: urlCategoryId === "none" ? null : urlCategoryId,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || j.uploadError || `HTTP ${res.status}`);
      setPreviewItems((prev) => prev.map((p, i) => i === index ? { ...p, saving: false, saved: true } : p));
      toast.success(`Saved "${it.name}" to ${j.target}`);
    } catch (e: any) {
      setPreviewItems((prev) => prev.map((p, i) => i === index ? { ...p, saving: false, error: e.message } : p));
      toast.error(e.message || "Save failed");
    }
  };





  const exportBackup = async () => {
    setExporting(true);
    try {
      const zip = new JSZip();
      const manifest: Record<string, number> = {};
      for (const table of BACKUP_TABLES) {
        const all: any[] = [];
        let from = 0;
        const pageSize = 1000;
        while (true) {
          const { data, error } = await (supabase as any)
            .from(table)
            .select("*")
            .range(from, from + pageSize - 1);
          if (error) throw new Error(`${table}: ${error.message}`);
          if (!data || data.length === 0) break;
          all.push(...data);
          if (data.length < pageSize) break;
          from += pageSize;
        }
        manifest[table] = all.length;
        zip.file(`${table}.json`, JSON.stringify(all, null, 2));
        toast.message(`Exported ${table}`, { description: `${all.length} rows` });
      }
      zip.file("manifest.json", JSON.stringify({
        version: 1,
        createdAt: new Date().toISOString(),
        tables: manifest,
      }, null, 2));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `pikooly-backup-${stamp}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const importBackup = async (file: File) => {
    setImporting(true);
    try {
      const zip = await JSZip.loadAsync(file);
      for (const table of BACKUP_TABLES) {
        const entry = zip.file(`${table}.json`);
        if (!entry) continue;
        const rows = JSON.parse(await entry.async("string")) as any[];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const chunkSize = 200;
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          const { error } = await (supabase as any)
            .from(table)
            .upsert(chunk, { onConflict: "id" });
          if (error) throw new Error(`${table}: ${error.message}`);
        }
        toast.message(`Restored ${table}`, { description: `${rows.length} rows` });
      }
      toast.success("Backup restored successfully");
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const runMigration = async (type: string) => {
    setLoading(type);
    setLastMigrationType(type);
    setResults(null);
    setProgress(0);
    setProgressStep("Starting...");
    setImageLog([]);
    setImgStats({ ok: 0, fallback: 0, failed: 0 });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

      const response = await fetch(`${supabaseUrl}/functions/v1/wp-migrate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
          "apikey": supabaseKey,
        },
        body: JSON.stringify({ type, uploadToCloud, uploadToR2, preferStorage, stream: true }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Migration failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "progress") {
              setProgress(data.percent || 0);
              setProgressStep(data.step || "");
            } else if (data.type === "image") {
              const entry: ImageLogEntry = {
                file: data.file,
                folder: data.folder,
                source: data.source,
                target: data.target,
                cloudinary: data.cloudinary,
                r2: data.r2,
                fellBack: !!data.fellBack,
                storedUrl: data.storedUrl,
              };
              // Keep last 200 entries for memory safety
              setImageLog(prev => [entry, ...prev].slice(0, 200));
              setImgStats(prev => ({
                ok: prev.ok + (entry.target !== "source" && !entry.fellBack ? 1 : 0),
                fallback: prev.fallback + (entry.fellBack ? 1 : 0),
                failed: prev.failed + (entry.target === "source" ? 1 : 0),
              }));
            } else if (data.type === "done") {
              setResults(data.results);
              setProgress(100);
              setProgressStep("Complete!");
              if (data.results?.removed) {
                toast.success("All data removed successfully!");
              } else {
                toast.success("Migration completed!");
              }
            } else if (data.type === "error") {
              throw new Error(data.message);
            }

          } catch (parseErr: any) {
            if (parseErr.message && !parseErr.message.includes("JSON")) {
              throw parseErr;
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        toast.info("Migration cancelled");
      } else {
        console.error("Migration error:", err);
        toast.error(err.message || "Migration failed");
      }
    } finally {
      setLoading(null);
      abortRef.current = null;
    }
  };

  const cancelMigration = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-bold">WordPress Migration</h2>
          <p className="text-muted-foreground mt-1">
            Import products, blog posts and categories from pikooly.com.bd with full content.
            Duplicate slugs will be skipped automatically.
          </p>
        </div>
        <Button onClick={saveMigrationPrefs} disabled={savingPrefs} className="shrink-0">
          {savingPrefs ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>
      </div>


      {/* Progress Bar */}
      {loading && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">Migration in Progress</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-primary">{progress}%</span>
                <Button variant="outline" size="sm" onClick={cancelMigration}>
                  Cancel
                </Button>
              </div>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-muted-foreground truncate">{progressStep}</p>
          </CardContent>
        </Card>
      )}

      {/* Cloudinary Upload Toggle */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {uploadToCloud ? (
                <Cloud className="h-5 w-5 text-primary" />
              ) : (
                <CloudOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label className="text-sm font-medium">Upload Images to Cloudinary</Label>
                <p className="text-xs text-muted-foreground">
                  {uploadToCloud
                    ? "All images will be uploaded to Cloudinary (slower but recommended)"
                    : "Images will use original WordPress URLs"}
                </p>
              </div>
            </div>
            <Switch checked={uploadToCloud} onCheckedChange={setUploadToCloud} disabled={loading !== null} />
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="flex items-center gap-3">
              {uploadToR2 ? (
                <Cloud className="h-5 w-5 text-orange-500" />
              ) : (
                <CloudOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label className="text-sm font-medium">Upload Images to Cloudflare R2</Label>
                <p className="text-xs text-muted-foreground">
                  {uploadToR2
                    ? "Images will also be uploaded to Cloudflare R2 (unlimited bandwidth)"
                    : "Cloudflare R2 upload is disabled — configure credentials in Settings → Cloudflare R2"}
                </p>
              </div>
            </div>
            <Switch checked={uploadToR2} onCheckedChange={setUploadToR2} disabled={loading !== null} />
          </div>

          {uploadToCloud && uploadToR2 && (
            <div className="border-t border-border pt-4 space-y-2">
              <Label className="text-sm font-medium">Both enabled — which URL should be stored?</Label>
              <p className="text-xs text-muted-foreground">
                Image will be uploaded to both. The selected URL is saved in the database; the other acts as a fallback if one provider fails.
              </p>
              <RadioGroup
                value={preferStorage}
                onValueChange={(v) => setPreferStorage(v as "cloudinary" | "r2")}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="pref-cld" value="cloudinary" disabled={loading !== null} />
                  <Label htmlFor="pref-cld" className="font-normal cursor-pointer">Store Cloudinary URL</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="pref-r2" value="r2" disabled={loading !== null} />
                  <Label htmlFor="pref-r2" className="font-normal cursor-pointer">Store R2 URL</Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Upload Log */}
      {((loading || urlLoading) || imageLog.length > 0) && (uploadToCloud || uploadToR2) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileImage className="h-4 w-4" /> Image Upload Log
              </CardTitle>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-600"><CheckCircle className="h-3.5 w-3.5" /> {imgStats.ok} uploaded</span>
                {imgStats.fallback > 0 && (
                  <span className="flex items-center gap-1 text-amber-600"><RefreshCw className="h-3.5 w-3.5" /> {imgStats.fallback} fallback</span>
                )}
                {imgStats.failed > 0 && (
                  <span className="flex items-center gap-1 text-destructive"><AlertCircle className="h-3.5 w-3.5" /> {imgStats.failed} failed</span>
                )}
                {imgStats.failed > 0 && !loading && lastMigrationType && (
                  <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => runMigration(lastMigrationType)}>
                    <RefreshCw className="h-3 w-3" /> Retry
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-56 rounded border border-border">
              <div className="divide-y divide-border text-xs">
                {imageLog.length === 0 && (
                  <div className="p-3 text-muted-foreground">Waiting for images…</div>
                )}
                {imageLog.map((e, idx) => {
                  const status = e.target === "source" ? "failed" : e.fellBack ? "fallback" : "ok";
                  const color =
                    status === "failed" ? "text-destructive" :
                    status === "fallback" ? "text-amber-600" : "text-emerald-600";
                  return (
                    <div key={idx} className="p-2 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className={`font-medium truncate ${color}`}>
                          {status === "ok" && "✓ "}
                          {status === "fallback" && "↻ "}
                          {status === "failed" && "✗ "}
                          {e.file}
                          <span className="ml-2 font-normal text-muted-foreground">[{e.folder}]</span>
                        </div>
                        <div className="text-muted-foreground truncate">
                          stored: <span className="text-foreground">{e.target}</span>
                          {e.cloudinary && !e.cloudinary.ok && <> · cld error: <span className="text-destructive">{e.cloudinary.error}</span></>}
                          {e.r2 && !e.r2.ok && <> · r2 error: <span className="text-destructive">{e.r2.error}</span></>}
                        </div>
                      </div>
                      {e.storedUrl && (
                        <a href={e.storedUrl} target="_blank" rel="noreferrer" className="shrink-0 text-primary hover:underline">view</a>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}



      {/* Import from any URL */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Import from URL (any website)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Paste one or more <strong>product URLs</strong> or <strong>category/collection URLs</strong> (one per line) from any website — Shopify, WooCommerce, or generic stores. Each product is scraped and added to your catalog. Images respect the toggles above.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={"https://example.com/products/red-roses\nhttps://anothersite.com/product/birthday-cake\nhttps://shop.com/collections/flowers"}
            rows={5}
            disabled={urlLoading}
            className="font-mono text-xs"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Assign to category (optional)</Label>
              <Select value={urlCategoryId} onValueChange={setUrlCategoryId} disabled={urlLoading}>
                <SelectTrigger><SelectValue placeholder="No category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end flex-wrap gap-2">
              <Button onClick={runUrlPreview} disabled={previewLoading || urlLoading} variant="outline" className="flex-1 min-w-[140px]">
                {previewLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Previewing...</>) : (<><FileImage className="mr-2 h-4 w-4" /> Preview & pick image</>)}
              </Button>
              <Button onClick={runUrlMigration} disabled={urlLoading || loading !== null || previewLoading} className="flex-1 min-w-[140px]">
                {urlLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>) : (<><Download className="mr-2 h-4 w-4" /> Import all</>)}
              </Button>
              {urlLoading && (
                <Button variant="outline" onClick={() => urlAbortRef.current?.abort()}>Cancel</Button>
              )}
            </div>
          </div>

          {previewItems.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="text-xs text-muted-foreground">
                Pick the <strong>best image (no watermark)</strong> for each product, choose storage, then Save.
              </div>
              {previewItems.map((it, idx) => (
                <div key={idx} className={`border rounded-lg p-3 space-y-3 ${it.saved ? "border-emerald-500/50 bg-emerald-500/5" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{it.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{it.sourceUrl}</div>
                      <div className="text-xs mt-1">
                        Price: <span className="font-mono">{it.price}</span>
                        {it.originalPrice ? <span className="text-muted-foreground line-through ml-2 font-mono">{it.originalPrice}</span> : null}
                      </div>
                    </div>
                    {it.saved && <span className="text-xs text-emerald-600 shrink-0">✓ Saved</span>}
                  </div>

                  {it.images.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {it.images.map((img, j) => (
                        <button
                          key={j}
                          type="button"
                          onClick={() => setPreviewItems((prev) => prev.map((p, i) => i === idx ? { ...p, selectedImage: img } : p))}
                          disabled={it.saved}
                          className={`relative aspect-square rounded overflow-hidden border-2 transition ${it.selectedImage === img ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}
                        >
                          <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.2"; }} />
                          {it.selectedImage === img && (
                            <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px]">✓</div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-destructive">No images found.</div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <RadioGroup
                      value={it.target}
                      onValueChange={(v) => setPreviewItems((prev) => prev.map((p, i) => i === idx ? { ...p, target: v as any } : p))}
                      className="flex gap-3"
                      disabled={it.saved}
                    >
                      <Label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <RadioGroupItem value="cloudinary" /> Cloudinary
                      </Label>
                      <Label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <RadioGroupItem value="r2" /> Cloudflare R2
                      </Label>
                      <Label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <RadioGroupItem value="source" /> Keep source URL
                      </Label>
                    </RadioGroup>
                    <Button
                      size="sm"
                      onClick={() => saveSinglePreview(idx)}
                      disabled={!!it.saving || !!it.saved || !it.selectedImage}
                      className="ml-auto"
                    >
                      {it.saving ? (<><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Saving...</>) : it.saved ? "Saved" : (<><CheckCircle className="mr-2 h-3 w-3" /> Save product</>)}
                    </Button>
                  </div>
                  {it.error && <div className="text-xs text-destructive">{it.error}</div>}
                </div>
              ))}
            </div>
          )}


          {urlLoading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground truncate">{progressStep}</p>
            </div>
          )}

          {(urlItemLog.length > 0 || urlResults) && (
            <div className="border border-border rounded">
              {urlResults && (
                <div className="p-2 text-xs bg-muted flex flex-wrap items-center gap-3 border-b border-border">
                  <span className="font-medium">Done:</span>
                  <span className="text-emerald-600">✓ {urlResults.inserted} imported</span>
                  {urlResults.failed > 0 && <span className="text-destructive">✗ {urlResults.failed} failed</span>}
                  <span className="text-muted-foreground">of {urlResults.total}</span>
                </div>
              )}
              <ScrollArea className="h-48">
                <div className="divide-y divide-border text-xs">
                  {urlItemLog.map((it, i) => (
                    <div key={i} className="p-2 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className={`font-medium truncate ${it.ok ? "text-emerald-600" : "text-destructive"}`}>
                          {it.ok ? "✓ " : "✗ "}{it.name || it.url}
                        </div>
                        <div className="text-muted-foreground truncate">
                          {it.url}
                          {it.reason && <> · <span className="text-destructive">{it.reason}</span></>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {[
          { type: "categories", label: "Categories", desc: "WooCommerce product categories" },
          { type: "products", label: "Products", desc: "All products with full HTML content" },
          { type: "blogs", label: "Blog Posts", desc: "All blog posts with full content" },
          { type: "all", label: "Everything", desc: "Categories + Products + Blogs" },
        ].map((item) => (
          <Card key={item.type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{item.label}</CardTitle>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runMigration(item.type)}
                disabled={loading !== null}
                className="w-full"
                variant={item.type === "all" ? "default" : "outline"}
              >
                {loading === item.type ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running...</>
                ) : (
                  <><Download className="mr-2 h-4 w-4" /> Import</>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Backup & Restore */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Archive className="h-4 w-4 text-primary" />
            Backup & Restore (ZIP)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Full backup — exports <strong>{BACKUP_TABLES.length} tables</strong> (catalog, orders, customers, wallets, sellers, events, photo, settings & more) as a ZIP. Re-import to restore. Cloudinary image URLs are preserved; image binaries stay on Cloudinary.
          </p>

        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            onClick={exportBackup}
            disabled={exporting || importing}
            variant="outline"
            className="w-full"
          >
            {exporting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" /> Export Backup (.zip)</>
            )}
          </Button>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importBackup(f);
              }}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={exporting || importing}
              variant="default"
              className="w-full"
            >
              {importing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" /> Import Backup (.zip)</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Remove All Data */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Remove All Data
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Delete all categories, products, and blog posts. You can then re-import fresh data.
          </p>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" disabled={loading !== null}>
                {loading === "remove_all" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Removing...</>
                ) : (
                  <><Trash2 className="mr-2 h-4 w-4" /> Remove All & Re-import</>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete ALL categories, products, subcategories, and blog posts.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => runMigration("remove_all")}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, Remove All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Results */}
      {results && !results.removed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Migration Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {results.categories && (
                <div className="bg-muted rounded-lg p-4">
                  <p className="font-semibold">Categories</p>
                  <p className="text-sm text-muted-foreground">
                    Total: {results.categories.total} | Mapped: {results.categories.mapped}
                  </p>
                </div>
              )}
              {results.products && (
                <div className="bg-muted rounded-lg p-4">
                  <p className="font-semibold">Products</p>
                  <p className="text-sm text-muted-foreground">
                    Total: {results.products.total} | New: {results.products.inserted} | Skipped: {results.products.skipped}
                  </p>
                </div>
              )}
              {results.blogs && (
                <div className="bg-muted rounded-lg p-4">
                  <p className="font-semibold">Blog Posts</p>
                  <p className="text-sm text-muted-foreground">
                    Total: {results.blogs.total} | New: {results.blogs.inserted} | Skipped: {results.blogs.skipped}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {results?.removed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              All Data Removed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All data has been removed. You can now re-import fresh data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminMigrate;
