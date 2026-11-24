"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  priceKes: number;
  imageUrl: string | null;
  warrantyText: string;
  isBulky: boolean;
  quantity: number;
};

type AuthGateReason = "cart" | "checkout" | null;

type CartContextValue = {
  items: CartItem[];
  isDrawerOpen: boolean;
  isAuthenticated: boolean;
  authLoading: boolean;
  authGateReason: AuthGateReason;
  authGateNextPath: string;
  totalCount: number;
  subtotalKes: number;
  hasBulkyItem: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  openAuthGate: (reason: Exclude<AuthGateReason, null>, nextPath?: string) => void;
  closeAuthGate: () => void;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => boolean;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "kilakitu_storefront_cart_v1";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authGateReason, setAuthGateReason] = useState<AuthGateReason>(null);
  const [authGateNextPath, setAuthGateNextPath] = useState("/checkout");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // Ignore storage read errors
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage write errors
    }
  }, [items, hydrated]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      setIsAuthenticated(Boolean(user));
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setIsAuthenticated(Boolean(session?.user));
      setAuthLoading(false);
      if (session?.user) {
        setAuthGateReason(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const openAuthGate = useCallback(
    (reason: Exclude<AuthGateReason, null>, nextPath = "/checkout") => {
      setAuthGateNextPath(nextPath);
      setAuthGateReason(reason);
    },
    []
  );

  const closeAuthGate = useCallback(() => setAuthGateReason(null), []);

  const addItem = useCallback(
    (incoming: Omit<CartItem, "quantity">, qty = 1) => {
      if (!authLoading && !isAuthenticated) {
        setAuthGateNextPath(`/products/${incoming.slug}`);
        setAuthGateReason("cart");
        return false;
      }

      const safeQty = Math.max(1, Math.round(qty));
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.productId === incoming.productId);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            quantity: next[idx].quantity + safeQty,
          };
          return next;
        }
        return [...prev, { ...incoming, quantity: safeQty }];
      });
      return true;
    },
    [authLoading, isAuthenticated]
  );

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.productId !== productId);
      return prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.max(1, Math.round(quantity)) }
          : i
      );
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalCount = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items]
  );
  const subtotalKes = useMemo(
    () => items.reduce((s, i) => s + i.priceKes * i.quantity, 0),
    [items]
  );
  const hasBulkyItem = useMemo(
    () => items.some((i) => i.isBulky),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      isDrawerOpen,
      isAuthenticated,
      authLoading,
      authGateReason,
      authGateNextPath,
      totalCount,
      subtotalKes,
      hasBulkyItem,
      openDrawer,
      closeDrawer,
      openAuthGate,
      closeAuthGate,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [
      items,
      isDrawerOpen,
      isAuthenticated,
      authLoading,
      authGateReason,
      authGateNextPath,
      totalCount,
      subtotalKes,
      hasBulkyItem,
      openDrawer,
      closeDrawer,
      openAuthGate,
      closeAuthGate,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}