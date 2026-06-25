"use client";
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/useSeller";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Loader2, Pencil, Image as ImageIcon,
  Truck, Tag, Package, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";
import { toast } from "sonner";

interface ProductFull {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  stock: number;
  image_url: string | null;
  images: string[] | null;
  category_id: string | null;
  subcategory_id: string | null;
  short_description: string | null;
  description: string | null;
  delivery_time: string | null;
  delivery_info: string | null;
  seo_title: string | null;
  seo_description: string | null;
  approval_status: "pending" | "approved" | "rejected";
  is_active: boolean;
  rejection_reason: string | null;
  created_at: string;
  category?: { name: string } | null;
  subcategory?: { name: string } | null;
}

const StatusPill = ({ status, isActive }: { status: ProductFull["approval_status"]; isActive: boolean }) => {
  if (status === "pending") return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
      <Clock className="h-3 w-3" /> Pending review
    </Badge>
  );
  if (status === "rejected") return (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
      <AlertTriangle className="h-3 w-3" /> Rejected
    </Badge>
  );
  return (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
      <CheckCircle2 className="h-3 w-3" /> Approved {isActive ? "" : "(inactive)"}
    </Badge>
  );
};

export default function SellerProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { seller, loading: sellerLoading } = useSeller();

  const [product, setProduct] = useState<ProductFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  const load = async () => {
    if (!seller || !id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id, name, slug, price, original_price, stock, image_url, images, approval_status, is_active, rejection_reason, category_id, subcategory_id, short_description, description, delivery_time, delivery_info, seo_title, seo_description, created_at, category:categories(name), subcategory:subcategories(name)")
      .eq("id", id)
      .eq("seller_id", seller.id)
      .maybeSingle();
    if (error) toast.error(error.message);
    setProduct((data as any) || null);
    setActiveImage(0);
    setLoading(false);
  };

  useEffect(() => {
    if (!sellerLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seller, sellerLoading, id]);

  if (sellerLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!seller) return <div className="min-h-screen flex items-center justify-center p-6 text-muted-foreground">No seller profile.</div>;
  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
      <p className="text-muted-foreground">Product not found.</p>
      <Button asChild variant="outline" size="sm"><Link to="/seller/products"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to products</Link></Button>
    </div>
  );

  const images = (product.images && product.images.length ? product.images : (product.image_url ? [product.image_url] : []));
  let dCharge = "", dAreas = "";
  if (product.delivery_info) {
    try { const parsed = JSON.parse(product.delivery_info); dCharge = parsed.charge ?? ""; dAreas = parsed.areas ?? ""; }
    catch { dAreas = product.delivery_info; }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/seller/products")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Products
          </Button>
          <h1 className="text-base md:text-lg font-semibold truncate flex-1 text-center">Product details</h1>
          <Button size="sm" onClick={() => navigate(`/seller/products/${product.id}/edit`)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6">
            {/* Gallery */}
            <div className="md:col-span-2 space-y-2">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted relative border">
                {images.length > 0 ? (
                  <img src={images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground"><ImageIcon className="h-10 w-10" /></div>
                )}
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-5 gap-1.5">
                  {images.map((u, i) => (
                    <button key={i} onClick={() => setActiveImage(i)}
                      className={`aspect-square rounded-md overflow-hidden border-2 ${i === activeImage ? "border-primary" : "border-transparent"}`}>
                      <img src={u} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="md:col-span-3 space-y-4">
              <Card><CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg md:text-xl font-semibold">{product.name}</h2>
                  <StatusPill status={product.approval_status} isActive={product.is_active} />
                </div>
                {product.short_description && (
                  <p className="text-sm text-muted-foreground">{product.short_description}</p>
                )}
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-primary">৳{Number(product.price).toFixed(0)}</span>
                  {product.original_price ? (
                    <span className="text-sm text-muted-foreground line-through">৳{Number(product.original_price).toFixed(0)}</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary"><Package className="h-3 w-3 mr-1" /> Stock: {product.stock >= 999999 ? "Unlimited" : product.stock}</Badge>
                  {product.category?.name && <Badge variant="outline"><Tag className="h-3 w-3 mr-1" /> {product.category.name}</Badge>}
                  {product.subcategory?.name && <Badge variant="outline">{product.subcategory.name}</Badge>}
                </div>
              </CardContent></Card>

              {product.approval_status === "rejected" && product.rejection_reason && (
                <Card className="border-red-200">
                  <CardContent className="p-4">
                    <div className="flex gap-2 items-start">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-red-700">Rejection reason</div>
                        <p className="text-sm text-red-700/90 mt-0.5">{product.rejection_reason}</p>
                        <p className="text-[11px] text-muted-foreground mt-2">Edit your product to address the issue and re-submit.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card><CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Truck className="h-4 w-4" /> Delivery
                </div>
                <Separator />
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <dt className="text-muted-foreground col-span-1">Time</dt><dd className="col-span-2">{product.delivery_time || "—"}</dd>
                  <dt className="text-muted-foreground col-span-1">Charge</dt><dd className="col-span-2">{dCharge || "—"}</dd>
                  <dt className="text-muted-foreground col-span-1">Areas</dt><dd className="col-span-2">{dAreas || "—"}</dd>
                </dl>
              </CardContent></Card>

              {product.description && (
                <Card><CardContent className="p-4 space-y-2">
                  <div className="text-sm font-semibold">Description</div>
                  <Separator />
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
                </CardContent></Card>
              )}

              {(product.seo_title || product.seo_description) && (
                <Card><CardContent className="p-4 space-y-2">
                  <div className="text-sm font-semibold">SEO</div>
                  <Separator />
                  <div className="text-xs space-y-1">
                    <div><span className="text-muted-foreground">Title: </span>{product.seo_title || "—"}</div>
                    <div><span className="text-muted-foreground">Description: </span>{product.seo_description || "—"}</div>
                  </div>
                </CardContent></Card>
              )}
            </div>
          </div>
      </main>
    </div>
  );
}
