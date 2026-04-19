import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { products, getTierForQty, type VolumeTier } from "@/data/products";

export type CartItem = {
  id: string; // unique line id (productSlug + sizeKey + customizationHash)
  productSlug: string;
  productName: string;
  productImage: string;
  sizeKey: string; // e.g. "adult-M" | "kids-8"
  sizeLabel: string; // e.g. "M" | "Inf. 8a"
  qty: number;
  customization?: {
    /** generic logo customization */
    positions?: string[];
    fileName?: string;
    notes?: string;
    /** team / sport customization */
    team?: {
      color?: string;
      teamName?: string;
      crestFileName?: string;
      roster?: { number: string; name: string }[];
    };
  };
};

type AddPayload = Omit<CartItem, "id"> & { id?: string };

type CartContextValue = {
  items: CartItem[];
  addItems: (items: AddPayload[]) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  totalQty: number;
  subtotal: number; // base price total
  discountedTotal: number; // tier-applied total
  savings: number; // subtotal - discountedTotal
  tier: VolumeTier;
  nextTier: VolumeTier | null;
  unitsToNext: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "agrotech.cart.v1";

const buildLineId = (payload: AddPayload) => {
  const c = payload.customization;
  const cKey = c
    ? [
        (c.positions ?? []).slice().sort().join(","),
        c.fileName ?? "",
        (c.notes ?? "").slice(0, 40),
        c.team?.color ?? "",
        c.team?.teamName ?? "",
        c.team?.crestFileName ?? "",
        (c.team?.roster ?? []).map((r) => `${r.number}-${r.name}`).join("|"),
      ].join("::")
    : "none";
  return `${payload.productSlug}::${payload.sizeKey}::${cKey}`;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore quota errors
    }
  }, [items]);

  const addItems = useCallback((incoming: AddPayload[]) => {
    setItems((prev) => {
      const next = [...prev];
      for (const p of incoming) {
        if (p.qty <= 0) continue;
        const id = p.id ?? buildLineId(p);
        const idx = next.findIndex((i) => i.id === id);
        if (idx >= 0) {
          next[idx] = { ...next[idx], qty: next[idx].qty + p.qty };
        } else {
          next.push({ ...p, id });
        }
      }
      return next;
    });
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: Math.max(0, qty) } : i))
        .filter((i) => i.qty > 0),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const computed = useMemo(() => {
    // Group items by product so each product applies its own tiers.
    const bySlug = new Map<string, CartItem[]>();
    for (const i of items) {
      const arr = bySlug.get(i.productSlug) ?? [];
      arr.push(i);
      bySlug.set(i.productSlug, arr);
    }

    let totalQty = 0;
    let subtotal = 0;
    let discountedTotal = 0;

    for (const [slug, lines] of bySlug) {
      const product = products.find((p) => p.slug === slug) ?? products[0];
      const qty = lines.reduce((s, l) => s + l.qty, 0);
      const tier = getTierForQty(product.tiers, Math.max(1, qty));
      totalQty += qty;
      subtotal += qty * product.basePrice;
      discountedTotal += qty * tier.price;
    }

    const savings = Math.max(0, subtotal - discountedTotal);

    // Reference product for the global progress bar (largest cart product, fallback first)
    const refSlug = [...bySlug.entries()].sort((a, b) => {
      const qa = a[1].reduce((s, l) => s + l.qty, 0);
      const qb = b[1].reduce((s, l) => s + l.qty, 0);
      return qb - qa;
    })[0]?.[0];
    const refProduct = products.find((p) => p.slug === refSlug) ?? products[0];
    const refQty = bySlug.get(refProduct.slug)?.reduce((s, l) => s + l.qty, 0) ?? 0;
    const tier = getTierForQty(refProduct.tiers, Math.max(1, refQty));
    const idx = refProduct.tiers.indexOf(tier);
    const nextTier = idx >= 0 && idx < refProduct.tiers.length - 1 ? refProduct.tiers[idx + 1] : null;
    const unitsToNext = nextTier ? Math.max(0, nextTier.minQty - refQty) : 0;

    return { totalQty, tier, subtotal, discountedTotal, savings, nextTier, unitsToNext };
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({ items, addItems, updateQty, removeItem, clear, ...computed }),
    [items, addItems, updateQty, removeItem, clear, computed],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
