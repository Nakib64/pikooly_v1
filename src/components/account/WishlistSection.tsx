import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@/lib/router-adapter";
import { Heart, Trash2, ShoppingCart } from "lucide-react";
import { useMultiCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface WishlistSectionProps {
  userId: string;
}

const WishlistSection = ({ userId }: WishlistSectionProps) => {
  const queryClient = useQueryClient();
  const { formatPrice } = useMultiCurrency();
  const { addItem } = useCart();

  const { data: items = [] } = useQuery({
    queryKey: ["wishlist", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist")
        .select("id, product_id, products(id, name, slug, price, original_price, image_url, stock)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const removeItem = async (id: string) => {
    await supabase.from("wishlist").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["wishlist", userId] });
    toast.success("Removed from wishlist");
  };

  const handleAddToCart = (product: any) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url || "/placeholder.svg",
      category: "",
      inStock: product.stock > 0,
    });
    toast.success("Added to cart!");
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
      <h2 className="text-base font-display font-semibold text-foreground mb-4 flex items-center gap-2">
        <Heart size={18} className="text-destructive" />
        Wishlist
        {items.length > 0 && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{items.length}</span>
        )}
      </h2>

      {items.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">Your wishlist is empty</p>
          <Link to="/" className="text-sm font-medium text-primary hover:underline">Browse Products →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item: any) => {
            const p = item.products;
            if (!p) return null;
            return (
              <div key={item.id} className="border border-border/50 rounded-xl overflow-hidden group hover:border-border transition-colors">
                <Link to={`/product/${p.slug}`} className="block">
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={p.image_url || "/placeholder.svg"}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                </Link>
                <div className="p-2.5">
                  <Link to={`/product/${p.slug}`}>
                    <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug hover:text-primary transition-colors">{p.name}</p>
                  </Link>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-sm font-bold text-primary">{formatPrice(p.price)}</span>
                    {p.original_price && (
                      <span className="text-[10px] text-muted-foreground line-through">{formatPrice(p.original_price)}</span>
                    )}
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => handleAddToCart(p)}
                      className="flex-1 flex items-center justify-center gap-1 bg-primary text-primary-foreground py-1.5 rounded-lg text-[11px] font-semibold hover:opacity-90 transition-opacity"
                    >
                      <ShoppingCart size={12} /> Add
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WishlistSection;
