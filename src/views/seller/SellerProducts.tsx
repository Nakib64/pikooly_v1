import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/router-adapter";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/useSeller";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Plus, Pencil, Trash2, Image as ImageIcon, Package, Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  stock: number;
  image_url: string | null;
  images: string[] | null;
  approval_status: "pending" | "approved" | "rejected";
  is_active: boolean;
  rejection_reason: string | null;
  created_at: string;
}

const StatusBadge = ({ status }: { status: ProductRow["approval_status"] }) => {
  const map = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  } as const;
  return <Badge variant="outline" className={`capitalize ${map[status]}`}>{status}</Badge>;
};

const SELECT_COLS =
  "id, name, slug, price, original_price, stock, image_url, images, approval_status, is_active, rejection_reason, category_id, subcategory_id, short_description, description, instructions, delivery_time, delivery_info, seo_title, seo_description, created_at";

export default function SellerProducts() {
  const { seller, loading: sellerLoading } = useSeller();
  const navigate = useNavigate();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    if (!seller) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select(SELECT_COLS)
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false });
    setProducts((data || []) as ProductRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (sellerLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seller, sellerLoading]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("products").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    setProducts((ps) => ps.filter((p) => p.id !== deleteId));
    setDeleteId(null);
    toast.success("Product deleted");
  };

  if (sellerLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!seller) {
    return <div className="min-h-screen flex items-center justify-center p-6 text-center text-muted-foreground">No seller profile found.</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/seller/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard
          </Button>
          <h1 className="text-base md:text-lg font-semibold">My Products</h1>
          <Button size="sm" onClick={() => navigate("/seller/products/new")}><Plus className="h-4 w-4 mr-1.5" /> Add Product</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-4">
        {products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">You haven't added any products yet.</p>
              <Button onClick={() => navigate("/seller/products/new")} size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add your first product</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {products.map((p) => (
              <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <Link to={`/seller/products/${p.id}`} className="block">
                  <div className="aspect-video bg-muted relative">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>
                    )}
                    <div className="absolute top-2 left-2"><StatusBadge status={p.approval_status} /></div>
                  </div>
                </Link>
                <CardContent className="p-3 space-y-2">
                  <Link to={`/seller/products/${p.id}`} className="block font-medium text-sm line-clamp-2 hover:text-primary">{p.name}</Link>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>৳{Number(p.price).toFixed(0)}</span>
                    <span>Stock: {p.stock >= 999999 ? "∞" : p.stock}</span>
                  </div>
                  {p.approval_status === "rejected" && p.rejection_reason && (
                    <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 line-clamp-2">
                      Reason: {p.rejection_reason}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/seller/products/${p.id}/edit`)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setDeleteId(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the product from your catalog. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
