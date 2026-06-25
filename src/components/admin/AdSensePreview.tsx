import { useSiteSettings } from "@/hooks/useSiteSettings";
import { isValidAdsensePublisherId } from "@/hooks/useAdConsent";
import { AlertTriangle, CheckCircle2, Eye } from "lucide-react";

type FormValues = Record<string, string>;

const PreviewBox = ({
  label,
  width,
  height,
  slot,
  variant,
}: {
  label: string;
  width: string;
  height: string;
  slot: string;
  variant: "banner" | "article";
}) => {
  const configured = !!slot?.trim();
  return (
    <div className="flex flex-col items-center w-full">
      <div
        className={`relative flex items-center justify-center w-full ${width} ${height} rounded-md border-2 border-dashed transition ${
          configured
            ? "border-primary/60 bg-primary/5 text-primary"
            : "border-muted-foreground/30 bg-muted/30 text-muted-foreground"
        }`}
        style={{ maxWidth: variant === "banner" ? 728 : 600 }}
      >
        <div className="text-center px-4">
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">
            Google Ad
          </p>
          <p className="text-sm font-semibold mt-1">{label}</p>
          <p className="text-[11px] mt-1 opacity-80 font-mono">
            slot: {slot?.trim() || "— not set —"}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5">{`${variant === "banner" ? "Top banner" : "In-article"} preview`}</p>
    </div>
  );
};

const AdSensePreview = ({ formValues }: { formValues: FormValues }) => {
  const { settings } = useSiteSettings();
  // Prefer in-progress edits, fall back to saved
  const v = (k: string) => (formValues[k] ?? settings[k] ?? "").toString();

  const enabled = v("adsense_enabled") === "true";
  const pubId = v("adsense_publisher_id").trim();
  const pubValid = isValidAdsensePublisherId(pubId);

  const blogTop = v("adsense_blog_list_top_slot");
  const blogFeed = v("adsense_blog_list_infeed_slot");
  const detailTop = v("adsense_blog_detail_top_slot");
  const detailIn = v("adsense_blog_detail_inarticle_slot");
  const categoryDesc = v("adsense_slot_category_description");
  const productDesc = v("adsense_slot_product_description");

  return (
    <div className="space-y-5">
      {/* Validation banner */}
      {!enabled ? (
        <div className="flex items-start gap-2 p-3 rounded-md border border-muted bg-muted/40 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <p className="text-muted-foreground">
            AdSense is currently <span className="font-semibold">disabled</span>. Turn on
            "Enable Google AdSense" above to start showing ads.
          </p>
        </div>
      ) : !pubId ? (
        <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
          <p className="text-destructive">
            <span className="font-semibold">Publisher ID missing.</span> Enter your AdSense
            Publisher ID (format: <code className="font-mono">ca-pub-</code> followed by 16
            digits) so ads can load.
          </p>
        </div>
      ) : !pubValid ? (
        <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
          <p className="text-destructive">
            <span className="font-semibold">Invalid Publisher ID.</span> Expected format:{" "}
            <code className="font-mono">ca-pub-XXXXXXXXXXXXXXXX</code> (16 digits). You
            entered: <code className="font-mono">{pubId}</code>
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2 p-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-sm">
          <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
          <p className="text-emerald-700">
            <span className="font-semibold">Publisher ID looks good.</span> Ads will load
            for visitors who accept the consent banner.
          </p>
        </div>
      )}

      {/* Placement previews */}
      <div>
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Eye className="h-4 w-4" /> Ad placement previews
        </h4>
        <p className="text-xs text-muted-foreground mb-4">
          These boxes show where each ad will appear on the Blog and Blog Detail pages.
          They render at the same sizes Google will use.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Blog List */}
          <div className="space-y-4 p-4 rounded-lg border border-border bg-background">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Blog List Page
            </p>
            <PreviewBox
              label="Blog List — Top Banner"
              width="w-full"
              height="h-[90px] sm:h-[110px]"
              slot={blogTop}
              variant="banner"
            />
            <PreviewBox
              label="Blog List — In-Feed (every 6 posts)"
              width="w-full"
              height="h-[140px]"
              slot={blogFeed}
              variant="article"
            />
          </div>

          {/* Blog Detail */}
          <div className="space-y-4 p-4 rounded-lg border border-border bg-background">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Blog Detail Page
            </p>
            <PreviewBox
              label="Blog Detail — Top Banner (under title)"
              width="w-full"
              height="h-[90px] sm:h-[110px]"
              slot={detailTop}
              variant="banner"
            />
            <PreviewBox
              label="Blog Detail — In-Article (mid content)"
              width="w-full"
              height="h-[140px]"
              slot={detailIn}
              variant="article"
            />
          </div>

          {/* Shop / Category */}
          <div className="space-y-4 p-4 rounded-lg border border-border bg-background">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Category Page
            </p>
            <PreviewBox
              label="Category — Long Description Banner"
              width="w-full"
              height="h-[140px]"
              slot={categoryDesc}
              variant="article"
            />
          </div>

          {/* Product Detail */}
          <div className="space-y-4 p-4 rounded-lg border border-border bg-background">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Product Detail Page
            </p>
            <PreviewBox
              label="Product Detail — Description Banner"
              width="w-full"
              height="h-[140px]"
              slot={productDesc}
              variant="article"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdSensePreview;
