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
import { isProfileComplete as checkProfileComplete } from "@/lib/auth/profile";

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
export type ProfileSetupReason =
  | "onboarding"
  | "cart"
  | "checkout"
  | "orders"
  | null;

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
  isProfileComplete: boolean;
  profileLoading: boolean;
  authGateReason: AuthGateReason;
  authGateNextPath: string;
  profileSetupOpen: boolean;
  profileSetupReason: ProfileSetupReason;
  profileSetupNextPath: string | null;
  profileSetupRequired: boolean;
  totalCount: number;
  subtotalKes: number;
  hasBulkyItem: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  openAuthGate: (
    reason: Exclude<AuthGateReason, null>,
    nextPath?: string
  ) => void;
  closeAuthGate: (preservePending?: boolean) => void;
  openProfileSetup: (
    reason: Exclude<ProfileSetupReason, null>,
    options?: { nextPath?: string | null; required?: boolean }
  ) => void;
  closeProfileSetup: () => void;
  markProfileCompleted: () => void;
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
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [authGateReason, setAuthGateReason] = useState<AuthGateReason>(null);
  const [authGateNextPath, setAuthGateNextPath] = useState("/checkout");
  const [profileSetupOpen, setProfileSetupOpen] = useState(false);
  const [profileSetupReason, setProfileSetupReason] =
    useState<ProfileSetupReason>(null);
  const [profileSetupNextPath, setProfileSetupNextPath] = useState<
    string | null
  >(null);
  const [profileSetupRequired, setProfileSetupRequired] = useState(false);
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

    async function verifyAuthAndProfile() {
      const seq = ++verifySeq;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!active || seq !== verifySeq) return;

        if (!user) {
          setIsAuthenticated(false);
          setIsProfileComplete(false);
          setAuthLoading(false);
          setProfileLoading(false);
          return;
        }

        setIsAuthenticated(true);
        setAuthLoading(false);
        setAuthGateReason(null);

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .maybeSingle();

        if (!active || seq !== verifySeq) return;
        const ready = checkProfileComplete(profile);
        setIsProfileComplete(ready);
        setProfileLoading(false);
        if (ready) {
          setProfileSetupOpen(false);
          setProfileSetupReason(null);
          setProfileSetupNextPath(null);
          setProfileSetupRequired(false);
        }
      } catch {
        if (!active || seq !== verifySeq) return;
        setIsAuthenticated(false);
        setIsProfileComplete(false);
        setAuthLoading(false);
        setProfileLoading(false);
      }
    }

    void verifyAuthAndProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        verifySeq += 1;
        pendingAddRef.current = null;
        setIsAuthenticated(false);
        setIsProfileComplete(false);
        setAuthLoading(false);
        setProfileLoading(false);
        setAuthGateReason(null);
        setProfileSetupOpen(false);
        setProfileSetupReason(null);
        setProfileSetupNextPath(null);
        setProfileSetupRequired(false);
        setIsDrawerOpen(false);
        setLastAddedProductId(null);
        return;
      }

      // Defer getUser() out of onAuthStateChange callback to avoid auth lock contention.
      window.setTimeout(() => {
        if (active) {
          void verifyAuthAndProfile();
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

  const closeAuthGate = useCallback((preservePending = false) => {
    if (!preservePending) {
      pendingAddRef.current = null;
    }
    setAuthGateReason(null);
  }, []);

  const openProfileSetup = useCallback(
    (
      reason: Exclude<ProfileSetupReason, null>,
      options?: { nextPath?: string | null; required?: boolean }
    ) => {
      setProfileSetupReason(reason);
      setProfileSetupNextPath(
        options?.nextPath ? sanitizeNextPath(options.nextPath, "/") : null
      );
      setProfileSetupRequired(Boolean(options?.required));
      setProfileSetupOpen(true);
    },
    []
  );

  const closeProfileSetup = useCallback(() => {
    pendingAddRef.current = null;
    setProfileSetupOpen(false);
    setProfileSetupReason(null);
    setProfileSetupNextPath(null);
    setProfileSetupRequired(false);
  }, []);

  const markProfileCompleted = useCallback(() => {
    setIsProfileComplete(true);
    setProfileLoading(false);
    setProfileSetupOpen(false);
    setProfileSetupReason(null);
    setProfileSetupNextPath(null);
    setProfileSetupRequired(false);
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

      if (authLoading || (isAuthenticated && profileLoading)) {
        const supabase = createClient();
        void supabase.auth.getUser().then(async ({ data: { user } }) => {
          if (!user) {
            setIsAuthenticated(false);
            setIsProfileComplete(false);
            setAuthLoading(false);
            setProfileLoading(false);
            pendingAddRef.current = { item: incoming, quantity: safeQty };
            setAuthGateNextPath(
              sanitizeNextPath(`/products/${incoming.slug}`, "/")
            );
            setAuthGateReason("cart");
            return;
          }

          setIsAuthenticated(true);
          setAuthLoading(false);

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("id", user.id)
            .maybeSingle();

          const ready = checkProfileComplete(profile);
          setIsProfileComplete(ready);
          setProfileLoading(false);

          if (!ready) {
            pendingAddRef.current = { item: incoming, quantity: safeQty };
            setProfileSetupReason("cart");
            setProfileSetupNextPath(null);
            setProfileSetupRequired(false);
            setProfileSetupOpen(true);
            return;
          }

          appendCartItem(incoming, safeQty);
          setLastAddedProductId(incoming.productId);
          setIsDrawerOpen(true);
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

      if (!isProfileComplete) {
        pendingAddRef.current = { item: incoming, quantity: safeQty };
        setProfileSetupReason("cart");
        setProfileSetupNextPath(null);
        setProfileSetupRequired(false);
        setProfileSetupOpen(true);
        return false;
      }

      appendCartItem(incoming, safeQty);
      setLastAddedProductId(incoming.productId);
      return true;
    },
    [
      authLoading,
      isAuthenticated,
      profileLoading,
      isProfileComplete,
      appendCartItem,
    ]
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
      isProfileComplete,
      profileLoading,
      authGateReason,
      authGateNextPath,
      profileSetupOpen,
      profileSetupReason,
      profileSetupNextPath,
      profileSetupRequired,
      totalCount,
      subtotalKes,
      hasBulkyItem,
      openDrawer,
      closeDrawer,
      openAuthGate,
      closeAuthGate,
      openProfileSetup,
      closeProfileSetup,
      markProfileCompleted,
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
      isProfileComplete,
      profileLoading,
      authGateReason,
      authGateNextPath,
      profileSetupOpen,
      profileSetupReason,
      profileSetupNextPath,
      profileSetupRequired,
      totalCount,
      subtotalKes,
      hasBulkyItem,
      openDrawer,
      closeDrawer,
      openAuthGate,
      closeAuthGate,
      openProfileSetup,
      closeProfileSetup,
      markProfileCompleted,
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
