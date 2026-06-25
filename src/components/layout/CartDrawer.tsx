import { X, Plus, Minus, ShoppingBag, Trash2, ImagePlus } from "lucide-react";
import { useCart, buildVariantKey } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/lib/router-adapter";
import { useMultiCurrency } from "@/contexts/CurrencyContext";
import { parseDeliveryBadge } from "@/lib/deliveryBadge";
import { cn } from "@/lib/utils";

const CartDrawer = () => {
  const { items, removeItem, updateQuantity, totalPrice, totalItems, isOpen, setIsOpen } = useCart();
  const { formatPrice } = useMultiCurrency();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[60]"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card z-[70] shadow-luxe flex flex-col border-l border-border/60"
          >
            {/* Header */}
            <div className="relative flex items-center justify-between px-5 py-4 border-b border-border/70 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
              <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold)/0.45)] to-transparent" />
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[hsl(var(--gold-light))] border border-[hsl(var(--gold)/0.3)] text-[hsl(var(--gold-deep))]">
                  <ShoppingBag size={17} />
                </span>
                <div>
                  <p className="eyebrow text-[10px]">Your Selection</p>
                  <h2 className="font-display text-base sm:text-lg font-semibold text-foreground leading-none mt-0.5">
                    Cart <span className="text-muted-foreground font-normal">· {totalItems}</span>
                  </h2>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors ease-luxe">
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-muted flex items-center justify-center">
                    <ShoppingBag size={36} className="opacity-40" />
                  </div>
                  <p className="font-semibold text-base text-foreground">Your cart is empty</p>
                  <p className="text-sm mt-1.5 text-muted-foreground">Start adding some beautiful gifts!</p>
                  <Button variant="outline" className="mt-5 rounded-full" onClick={() => setIsOpen(false)}>
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                items.map((item, index) => {
                  const variantKey = buildVariantKey(item.variant);
                  const lineUnit = item.product.price + (item.variant?.size?.extraPrice || 0);
                  // Resolve delivery badge: explicit delivery_time wins, else infer from districts
                  let badge = parseDeliveryBadge(item.product.deliveryTime);
                  if (!badge) {
                    const sd = item.product.sameDayDistricts;
                    const nd = item.product.nextDayDistricts;
                    if (Array.isArray(sd) && sd.length > 0) badge = parseDeliveryBadge("same day");
                    else if (Array.isArray(nd) && nd.length > 0) badge = parseDeliveryBadge("next day");
                    else badge = parseDeliveryBadge("standard");
                  }
                  return (
                  <motion.div
                    key={`${item.product.id}-${variantKey}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-secondary/50 rounded-2xl border border-border/30 hover:border-border/60 transition-colors overflow-hidden"
                  >
                    {badge && (
                      <div className="flex items-center gap-2 px-3.5 py-2 bg-primary/[0.06] border-b border-border/40 text-[12px]">
                        <span className="font-semibold text-foreground">Express Delivery</span>
                        <span className={cn(
                          "inline-flex items-center gap-1 font-semibold",
                          "text-primary"
                        )}>
                          <badge.Icon size={13} className="shrink-0" />
                          {badge.label}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-3.5 p-3">
                    <Link to={`/product/${item.product.id}`} onClick={() => setIsOpen(false)} className="flex-shrink-0">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl shadow-sm"
                        loading="lazy"
                      />
                    </Link>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <Link to={`/product/${item.product.id}`} onClick={() => setIsOpen(false)}>
                          <h4 className="font-semibold text-sm sm:text-[15px] text-foreground line-clamp-2 hover:text-primary transition-colors leading-snug">
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
                        <p className="text-primary font-bold text-sm sm:text-base mt-1">{formatPrice(lineUnit)}</p>
                        {item.customImages && item.customImages.length > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <ImagePlus size={12} className="text-primary" /> {item.customImages.length} custom photo(s)
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5 bg-card rounded-full border border-border px-1 py-0.5">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1, variantKey)}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1, variantKey)}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.product.id, variantKey)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    </div>
                  </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-4 border-t border-border bg-gradient-to-t from-secondary/40 via-transparent to-transparent space-y-3 relative">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold)/0.4)] to-transparent" />
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {totalItems} {totalItems === 1 ? "item" : "items"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Taxes & delivery at checkout</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="eyebrow text-[11px]">Subtotal</span>
                  <span
                    className="text-primary text-xl sm:text-2xl font-bold tabular-nums leading-none"
                    style={{ fontFamily: "'Lora', serif" }}
                  >
                    {formatPrice(totalPrice)}
                  </span>
                </div>
                <Link to="/checkout" onClick={() => setIsOpen(false)} className="block">
                  <Button className="btn-luxe w-full h-12 text-sm sm:text-base">
                    Proceed to Checkout
                  </Button>
                </Link>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1 uppercase tracking-[0.2em] font-semibold"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
