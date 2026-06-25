import { Plus, Minus, ShoppingBag, Trash2, ImagePlus, ChevronUp, ReceiptText } from "lucide-react";
import { useCart, buildVariantKey } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "@/lib/router-adapter";
import { useMultiCurrency } from "@/contexts/CurrencyContext";
import { parseDeliveryBadge } from "@/lib/deliveryBadge";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import SEOHead from "@/components/seo/SEOHead";
import { useCheckoutDelivery } from "@/hooks/useCheckoutDelivery";
import DeliveryModeCards from "@/components/checkout/DeliveryModeCards";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

type CartAddonProduct = {
  id: string;
  slug?: string | null;
  name: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  is_active: boolean | null;
};

const CartPage = () => {
  const { items, removeItem, updateQuantity, totalPrice, totalItems, addItem, setIsOpen } = useCart();
  const { formatPrice } = useMultiCurrency();
  const navigate = useNavigate();
  const { groups: deliveryGroups } = useCheckoutDelivery(items as any);
  const productModeMap = new Map<string, { name: string; delivery_time: string; badge_text: string | null; icon: string | null }>();
  deliveryGroups.forEach((g) => {
    g.productIds.forEach((pid) => productModeMap.set(pid, g.mode));
  });

  // Compute totals & savings (Floweraura-style)
  const originalTotal = items.reduce((sum, i) => {
    const base = i.product.originalPrice ?? i.product.price;
    const unit = base + (i.variant?.size?.extraPrice || 0);
    return sum + unit * i.quantity;
  }, 0);
  const savings = Math.max(0, originalTotal - totalPrice);

  // Make sure the drawer is never open while on the dedicated cart page
  useEffect(() => { setIsOpen(false); }, [setIsOpen]);

  const [preferredDistrict, setPreferredDistrict] = useState<string>(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("preferred_delivery_district") || "").trim().toLowerCase()
      : ""
  );

  useEffect(() => {
    const read = () =>
      setPreferredDistrict(
        (localStorage.getItem("preferred_delivery_district") || "").trim().toLowerCase()
      );
    const onCustom = (e: Event) => {
      const val = (e as CustomEvent<string>).detail;
      if (typeof val === "string") setPreferredDistrict(val.trim().toLowerCase());
      else read();
    };
    window.addEventListener("delivery-district-changed", onCustom as EventListener);
    window.addEventListener("storage", read);
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener("delivery-district-changed", onCustom as EventListener);
      window.removeEventListener("storage", read);
      window.removeEventListener("focus", read);
    };
  }, []);


  const { data: addonProducts = [] } = useQuery<Array<CartAddonProduct & { available_districts: string[] }>>({
    queryKey: ["cart-page-addons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_addons")
        .select("product_id, sort_order, available_districts, products!inner(id, name, slug, price, original_price, image_url, is_active)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as Array<{ available_districts: string[] | null; products: CartAddonProduct | null }>;
      return rows
        .filter((r) => Boolean(r.products?.is_active))
        .map((r) => ({ ...(r.products as CartAddonProduct), available_districts: r.available_districts || [] }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const inCartIds = new Set(items.map((i) => i.product.id));
  const addons = addonProducts
    .filter((p) => !inCartIds.has(p.id))
    .filter((p) => {
      if (!p.available_districts || p.available_districts.length === 0) return true;
      if (!preferredDistrict) return true; // no district picked yet → show all
      return p.available_districts.some(
        (d) => (d || "").trim().toLowerCase() === preferredDistrict
      );
    })
    .slice(0, 8);


  return (
    <>
      <SEOHead title="Your Cart" description="Review the items in your cart and proceed to checkout." />
      <main className="bg-muted/30 pb-6 lg:pb-10">
        <div className="container mx-auto px-3 sm:px-4 pt-3 sm:pt-5 pb-4 max-w-3xl lg:max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:items-start">
          {items.length === 0 ? (
            <div className="lg:col-span-2 text-center py-20 text-muted-foreground bg-card rounded-2xl border border-border/40">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-muted flex items-center justify-center">
                <ShoppingBag size={36} className="opacity-40" />
              </div>
              <p className="font-semibold text-base text-foreground">Your cart is empty</p>
              <p className="text-sm mt-1.5">Start adding some beautiful gifts!</p>
              <Button variant="outline" className="mt-5 rounded-full" onClick={() => navigate("/")}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const variantKey = buildVariantKey(item.variant);
                const lineUnit = item.product.price + (item.variant?.size?.extraPrice || 0);
                const mode = productModeMap.get(item.product.id);
                let badge = parseDeliveryBadge(item.product.deliveryTime);
                if (!badge) {
                  const sd = item.product.sameDayDistricts;
                  const nd = item.product.nextDayDistricts;
                  if (Array.isArray(sd) && sd.length > 0) badge = parseDeliveryBadge("same day");
                  else if (Array.isArray(nd) && nd.length > 0) badge = parseDeliveryBadge("next day");
                  else badge = parseDeliveryBadge("standard");
                }
                return (
                  <div
                    key={`${item.product.id}-${variantKey}`}
                    className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden"
                  >
                    {(mode || badge) && (
                      <div className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-cart-delivery border-b border-border/40 text-[11px] sm:text-[12px] min-w-0">
                        {badge && <badge.Icon size={13} className="shrink-0 text-cart-teal" />}
                        <p className="flex-1 min-w-0 truncate whitespace-nowrap leading-tight">
                          <span className="font-bold text-cart-teal">
                            {mode ? `${mode.name} · ${mode.delivery_time}` : `Fast Delivery ${badge!.label}`}
                          </span>
                          {mode?.badge_text && (
                            <span className="text-cart-teal/70"> · {mode.badge_text}</span>
                          )}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-3.5 p-3">
                      <Link to={`/product/${item.product.id}`} className="flex-shrink-0">
                        <img
                          src={getOptimizedImageUrl(item.product.image, { width: 224 })}
                          alt={item.product.name}
                          className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl shadow-sm"
                          loading="lazy"
                          decoding="async"
                        />
                      </Link>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <Link to={`/product/${item.product.id}`}>
                            <h4 className="font-bold text-[16px] sm:text-[17px] text-foreground line-clamp-2 hover:text-primary transition-colors leading-snug">
                              {item.product.name}
                            </h4>
                          </Link>
                          {(item.variant?.size || item.variant?.color) && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {item.variant.size && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wide">
                                  {item.variant.size.name}
                                </span>
                              )}
                              {item.variant.color && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-foreground text-[10px] font-semibold">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full ring-1 ring-border"
                                    style={{ backgroundColor: item.variant.color.hex }}
                                  />
                                  {item.variant.color.name}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-baseline gap-2 mt-1.5">
                            <p className="text-cart-teal font-bold text-[17px] sm:text-[18px]">{formatPrice(lineUnit)}</p>
                            {item.product.originalPrice && item.product.originalPrice > item.product.price && (
                              <span className="text-[13px] text-muted-foreground line-through">
                                {formatPrice(item.product.originalPrice + (item.variant?.size?.extraPrice || 0))}
                              </span>
                            )}
                          </div>
                          {item.customImages && item.customImages.length > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <ImagePlus size={12} className="text-cart-teal" /> {item.customImages.length} custom photo(s)
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5 bg-cart-teal text-primary-foreground rounded-full px-1 py-0.5">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1, variantKey)}
                              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-primary-foreground/15 transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-bold w-7 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1, variantKey)}
                              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-primary-foreground/15 transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.product.id, variantKey)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Delivery Method */}
              {deliveryGroups.length > 0 && (
                <div className="mt-2">
                  <h3 className="text-base font-bold text-foreground mb-2 px-1">Delivery Method</h3>
                  <DeliveryModeCards groups={deliveryGroups} formatPrice={formatPrice} />
                </div>
              )}

              {/* Last minute add-ons */}
              {addons.length > 0 && (
                <section className="mt-5 sm:mt-8 md:mt-10">
                  <div className="mb-3">
                    <h2 className="text-foreground font-medium leading-tight" style={{ fontSize: "clamp(0.92rem, 1vw + 0.55rem, 1.05rem)" }}>
                      Recommended Addon Products
                    </h2>
                  </div>
                  <div className="flex gap-4 sm:gap-4 overflow-x-auto snap-x scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 pb-2.5">
                    {addons.map((p) => (
                      <div
                        key={p.id}
                        className="snap-start shrink-0 w-[114px] sm:w-[132px] md:w-[150px] lg:w-[166px] bg-card rounded-md border border-border/70 shadow-sm overflow-hidden flex flex-col"
                      >
                        <Link to={`/product/${p.slug || p.id}`} className="block p-2 pb-1 bg-card">
                          <img
                            src={getOptimizedImageUrl(p.image_url || "/placeholder.svg", { width: 320 })}
                            alt={p.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full aspect-square object-cover rounded-[4px] bg-muted/20"
                          />
                        </Link>
                        <div className="px-2 pb-2 pt-1 flex flex-col gap-1 flex-1">
                          <p className="text-[12px] sm:text-[13px] text-foreground line-clamp-2 leading-[1.18] min-h-[2.36em]">{p.name}</p>
                          <p className="text-[13px] sm:text-sm font-bold text-foreground tabular-nums leading-tight">{formatPrice(p.price)}</p>
                          <button
                            onClick={() =>
                              addItem(
                                {
                                  id: p.id,
                                  name: p.name,
                                  price: p.price,
                                  originalPrice: p.original_price ?? undefined,
                                  image: p.image_url || "/placeholder.svg",
                                  category: "",
                                  inStock: true,
                                },
                                undefined,
                                true
                              )
                            }
                            className="mt-1 h-8 rounded-[4px] border border-primary text-primary text-[13px] font-bold tracking-wide uppercase hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Bill Summary - right column on desktop */}
          {items.length > 0 && (
            <aside className="mt-4 lg:mt-0 lg:sticky lg:top-24">
              {savings > 0 && (
                <div className="flex justify-center -mb-3 relative z-10">
                  <span className="inline-block bg-cart-delivery text-cart-teal text-[13px] font-semibold px-4 py-1.5 rounded-full border border-cart-teal/15 shadow-sm">
                    You have saved {formatPrice(savings)} on this order
                  </span>
                </div>
              )}
              <div className="bg-card rounded-2xl border border-border/40 p-4 pt-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-dashed border-border">
                  <h3 className="font-bold text-cart-teal text-base lg:text-lg">Bill Summary</h3>
                  <span className="text-cart-teal font-semibold text-sm">{totalItems} {totalItems === 1 ? "Item" : "Items"}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-dashed border-border">
                  <span className="inline-flex items-center gap-2 text-foreground text-sm">
                    <ReceiptText size={18} className="text-cart-teal" />
                    <span>Order Total</span>
                  </span>
                  <span className="flex items-baseline gap-2">
                    {savings > 0 && (
                      <span className="text-[13px] text-muted-foreground line-through">{formatPrice(originalTotal)}</span>
                    )}
                    <span className="font-bold text-foreground">{formatPrice(totalPrice)}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 pb-1">
                  <span className="text-cart-teal font-bold">Grand Total</span>
                  <span className="font-bold text-cart-teal text-lg">{formatPrice(totalPrice)}</span>
                </div>
                {/* Desktop-only Place Order button inside summary */}
                <Link to="/checkout" className="hidden lg:block mt-4">
                  <Button className="w-full h-12 text-base rounded-xl bg-cart-teal text-primary-foreground hover:bg-cart-teal-dark font-bold tracking-wide">PLACE ORDER</Button>
                </Link>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4 px-2 leading-7">
                <span className="font-bold text-foreground">Have a Coupon Code?</span> You can apply the discount coupon in the Checkout Process.
              </p>
            </aside>
          )}
        </div>

        {/* Sticky bottom bar */}
        {items.length > 0 && (
          <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-md lg:hidden">
            <div className="container mx-auto max-w-3xl px-3 sm:px-4 py-3 flex items-center gap-3">
              <div className="flex-1 flex items-center justify-between gap-2 rounded-2xl bg-cart-delivery px-3.5 py-2.5">
                <div>
                  <p className="text-[11px] text-muted-foreground font-semibold">Total</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <p className="text-cart-teal font-bold text-base sm:text-lg leading-none">{formatPrice(totalPrice)}</p>
                    {savings > 0 && (
                      <span className="text-[11px] text-muted-foreground line-through leading-none">{formatPrice(originalTotal)}</span>
                    )}
                  </div>
                </div>
                <ChevronUp size={18} className="text-cart-teal" />
              </div>
              <Link to="/checkout" className="flex-[1.4]">
                <Button className="w-full h-12 text-sm sm:text-base rounded-2xl bg-cart-teal text-primary-foreground hover:bg-cart-teal-dark font-bold tracking-wide">PLACE ORDER</Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default CartPage;
