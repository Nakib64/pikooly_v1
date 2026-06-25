"use client";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/useSeller";
import { Button } from "@/components/ui/button";
import SellerProductForm, { ProductRowLite } from "@/components/seller/SellerProductForm";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProductRow extends ProductRowLite {
  approval_status: "pending" | "approved" | "rejected";
  is_active: boolean;
  rejection_reason: string | null;
  created_at: string;
}

const SELECT_COLS =
  "id, name, slug, price, original_price, stock, image_url, images, approval_status, is_active, rejection_reason, category_id, subcategory_id, short_description, description, instructions, delivery_time, delivery_info, seo_title, seo_description, created_at";

export default function SellerProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { seller, loading: sellerLoading } = useSeller();
  const isNew = !id || id === "new";

  const [product, setProduct] = useState<ProductRow | null>(null);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (isNew || sellerLoading || !seller) {
      if (isNew) setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("products")
      .select(SELECT_COLS)
      .eq("id", id)
      .eq("seller_id", seller.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setProduct((data as any) || null);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, seller, sellerLoading]);

  if (sellerLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center text-muted-foreground">
        No seller profile found.
      </div>
    );
  }

  if (!isNew && !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-muted-foreground">Product not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/seller/products")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to products
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/seller/products")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Products
          </Button>
          <h1 className="text-base md:text-lg font-semibold truncate">
            {isNew ? "Add Product" : "Edit Product"}
          </h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        <SellerProductForm
          seller={{ id: seller.id, can_edit_seo: (seller as any).can_edit_seo ?? false }}
          product={product}
          onCancel={() => navigate("/seller/products")}
          onSuccess={() => {
            toast.success(isNew ? "Product submitted for approval" : "Product updated");
            navigate("/seller/products");
          }}
        />
      </main>
    </div>
  );
}
