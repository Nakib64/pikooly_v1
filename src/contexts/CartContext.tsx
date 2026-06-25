import React, { createContext, useContext, useState, useCallback } from "react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  categoryId?: string | null;
  badge?: string;
  rating?: number;
  inStock: boolean;
  deliveryTime?: string | null;
  sameDayDistricts?: string[] | null;
  nextDayDistricts?: string[] | null;
  isPreorder?: boolean;
  preorderAdvancePercent?: number;
}

export interface VariantSelection {
  size?: { name: string; extraPrice: number };
  color?: { name: string; hex: string };
}

interface CartItem {
  product: Product;
  quantity: number;
  customImages?: File[];
  extraImageUrls?: string[];
  variant?: VariantSelection;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, customImages?: File[], skipDrawer?: boolean, variant?: VariantSelection, extraImageUrls?: string[]) => void;

  removeItem: (productId: string, variantKey?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantKey?: string) => void;
  updateCustomImages: (productId: string, images: File[], variantKey?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Build a unique key combining product id + variant so the same product with
// different size/color sit as separate cart lines.
export const buildVariantKey = (variant?: VariantSelection) =>
  `${variant?.size?.name || ""}|${variant?.color?.name || ""}`;

const matchKey = (item: CartItem, productId: string, variantKey?: string) => {
  if (item.product.id !== productId) return false;
  if (variantKey === undefined) return true;
  return buildVariantKey(item.variant) === variantKey;
};

const lineUnitPrice = (item: CartItem) =>
  item.product.price + (item.variant?.size?.extraPrice || 0);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback(
    (product: Product, customImages?: File[], skipDrawer?: boolean, variant?: VariantSelection, extraImageUrls?: string[]) => {
      const newKey = buildVariantKey(variant);
      let wasExisting = false;
      setItems((prev) => {
        const existing = prev.find(
          (i) => i.product.id === product.id && buildVariantKey(i.variant) === newKey
        );
        if (existing) {
          wasExisting = true;
          return prev.map((i) =>
            i.product.id === product.id && buildVariantKey(i.variant) === newKey
              ? {
                  ...i,
                  quantity: i.quantity + 1,
                  customImages: customImages?.length ? customImages : i.customImages,
                  extraImageUrls: extraImageUrls?.length ? extraImageUrls : i.extraImageUrls,
                }
              : i
          );
        }
        return [...prev, { product, quantity: 1, customImages, variant, extraImageUrls }];
      });
      toast.success(wasExisting ? "Quantity updated" : "Added to cart", {
        description: product.name,
      });
      if (!skipDrawer) setIsOpen(true);
    },
    []
  );


  const removeItem = useCallback((productId: string, variantKey?: string) => {
    setItems((prev) => prev.filter((i) => !matchKey(i, productId, variantKey)));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, variantKey?: string) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => !matchKey(i, productId, variantKey)));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (matchKey(i, productId, variantKey) ? { ...i, quantity } : i))
    );
  }, []);

  const updateCustomImages = useCallback(
    (productId: string, images: File[], variantKey?: string) => {
      setItems((prev) =>
        prev.map((i) => (matchKey(i, productId, variantKey) ? { ...i, customImages: images } : i))
      );
    },
    []
  );

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + lineUnitPrice(i) * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, updateCustomImages, clearCart, totalItems, totalPrice, isOpen, setIsOpen }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
