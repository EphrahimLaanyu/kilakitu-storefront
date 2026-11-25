"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeNextPath } from "@/lib/auth/redirects";

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

export type AuthGateReason = "cart" | "checkout" | null;

type PendingCartAdd = {
  item: Omit<CartItem, "quantity">;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  isDrawerOpen: boolean;
  lastAddedProductId: string | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authGateReason: AuthGateReason;
  authGateNextPath: string;
  totalCount: number;
  subtotalKes: number;
  hasBulkyItem: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  openAuthGate: (
    reason: Exclude<AuthGateReason, null>,
    nextPath?: string
  ) => void;
  closeAuthGate: () => void;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => boolean;
  commitPendingItem: () => boolean;
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
  const [lastAddedProductId, setLastAddedProductId] = useState<string | null>(
    null
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authGateReason, setAuthGateReason] = useState<AuthGateReason>(null);
  const [authGateNextPath, setAuthGateNextPath] = useState("/checkout");
  const pendingAddRef = useRef<PendingCartAdd | null>(null);

  const appendCartItem = useCallback(
    (incoming: Omit<CartItem, "quantity">, qty = 1) => {
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
    },
    []
  );

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
    let verifySeq = 0;

    async function verifyAuthUser() {
      const seq = ++verifySeq;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!active || seq !== verifySeq) return;
        const signedIn = Boolean(user);
        setIsAuthenticated(signedIn);
        setAuthLoading(false);
        if (signedIn) {
          setAuthGateReason(null);
        }
      } catch {
        if (!active || seq !== verifySeq) return;
        setIsAuthenticated(false);
        setAuthLoading(false);
      }
    }

    void verifyAuthUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        verifySeq += 1;
        pendingAddRef.current = null;
        setIsAuthenticated(false);
        setAuthLoading(false);
        setAuthGateReason(null);
        setIsDrawerOpen(false);
        setLastAddedProductId(null);
        return;
      }

      // Defer getUser() out of onAuthStateChange callback to avoid auth lock contention.
      window.setTimeout(() => {
        if (active) {
          void verifyAuthUser();
        }
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setLastAddedProductId(null);
  }, []);

  const openAuthGate = useCallback(
    (reason: Exclude<AuthGateReason, null>, nextPath = "/checkout") => {
      setAuthGateNextPath(sanitizeNextPath(nextPath, "/checkout"));
      setAuthGateReason(reason);
    },
    []
  );

  const closeAuthGate = useCallback(() => {
    pendingAddRef.current = null;
    setAuthGateReason(null);
  }, []);

  const commitPendingItem = useCallback(() => {
    const pending = pendingAddRef.current;
    if (!pending) return false;
    pendingAddRef.current = null;
    appendCartItem(pending.item, pending.quantity);
    setLastAddedProductId(pending.item.productId);
    return true;
  }, [appendCartItem]);

  const addItem = useCallback(
    (incoming: Omit<CartItem, "quantity">, qty = 1) => {
      const safeQty = Math.max(1, Math.round(qty));

      if (authLoading) {
        const supabase = createClient();
        void supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            setIsAuthenticated(true);
            setAuthLoading(false);
            appendCartItem(incoming, safeQty);
            setLastAddedProductId(incoming.productId);
            setIsDrawerOpen(true);
          } else {
            setIsAuthenticated(false);
            setAuthLoading(false);
            pendingAddRef.current = { item: incoming, quantity: safeQty };
            setAuthGateNextPath(
              sanitizeNextPath(`/products/${incoming.slug}`, "/")
            );
            setAuthGateReason("cart");
          }
        });
        return false;
      }

      if (!isAuthenticated) {
        pendingAddRef.current = { item: incoming, quantity: safeQty };
        setAuthGateNextPath(
          sanitizeNextPath(`/products/${incoming.slug}`, "/")
        );
        setAuthGateReason("cart");
        return false;
      }

      appendCartItem(incoming, safeQty);
      setLastAddedProductId(incoming.productId);
      return true;
    },
    [authLoading, isAuthenticated, appendCartItem]
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
      lastAddedProductId,
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
      commitPendingItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [
      items,
      isDrawerOpen,
      lastAddedProductId,
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
      commitPendingItem,
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
