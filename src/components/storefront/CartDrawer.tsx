"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Plus, Minus, Trash2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isProfileComplete as checkProfileComplete } from "@/lib/auth/profile";
import { useCart, type CartItem } from "./CartContext";

function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function CartDrawer() {
  const router = useRouter();
  const [checkingOut, setCheckingOut] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const {
    items,
    isDrawerOpen,
    lastAddedProductId,
    isAuthenticated,
    authLoading,
    isProfileComplete,
    profileLoading,
    totalCount,
    subtotalKes,
    hasBulkyItem,
    closeDrawer,
    openAuthGate,
    openProfileSetup,
    updateQuantity,
    removeItem,
  } = useCart();

  useEffect(() => {
    if (!isDrawerOpen) {
      setShowAllItems(false);
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeDrawer();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  const lastAddedItem = lastAddedProductId
    ? items.find((item) => item.productId === lastAddedProductId) ?? null
    : null;
  const isQuickAddedView = Boolean(lastAddedItem) && !showAllItems;
  const visibleItems: CartItem[] = isQuickAddedView
    ? [lastAddedItem!]
    : items;
  const otherItemsCount = isQuickAddedView ? items.length - 1 : 0;

  async function handleProceedToCheckout() {
    if (checkingOut) return;

    if (!authLoading && !isAuthenticated) {
      closeDrawer();
      openAuthGate("checkout", "/checkout");
      return;
    }

    if (!authLoading && isAuthenticated && !profileLoading && !isProfileComplete) {
      closeDrawer();
      openProfileSetup("checkout", { nextPath: "/checkout" });
      return;
    }

    setCheckingOut(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      closeDrawer();
      if (!user) {
        openAuthGate("checkout", "/checkout");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (!checkProfileComplete(profile)) {
        openProfileSetup("checkout", { nextPath: "/checkout" });
        return;
      }

      router.push("/checkout");
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isQuickAddedView ? "Added to cart" : "Shopping cart"}
      onClick={closeDrawer}
      className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/30 backdrop-blur-[2px] sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up w-full sm:max-w-lg max-h-[50vh] sm:max-h-[54vh] bg-white rounded-t-3xl sm:rounded-2xl border-t sm:border border-neutral-200 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Subtle Drag Handle (Mobile) */}
        <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden">
          <span className="h-1 w-9 rounded-full bg-neutral-200" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 sm:px-6 pt-3 pb-3.5 sm:py-4 border-b border-neutral-200 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isQuickAddedView && (
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#D4A024] text-[#D4A024] shrink-0">
                  <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                </span>
              )}
              <h2 className="text-sm sm:text-base font-semibold tracking-tight text-neutral-950 truncate">
                {isQuickAddedView ? "Added to Cart" : "Shopping Cart"}
              </h2>
              <span className="text-xs text-neutral-400 tabular-nums shrink-0">
                ({totalCount} {totalCount === 1 ? "item" : "items"})
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close shopping cart"
            className="p-1.5 -mr-1.5 rounded-full text-neutral-400 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cart Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 divide-y divide-neutral-100">
          {items.length === 0 ? (
            <div className="py-10 text-center space-y-2.5">
              <p className="text-sm font-medium text-neutral-950">
                Your cart is empty
              </p>
              <p className="text-xs text-neutral-500">
                Explore phones, laptops, audio, and electronics in the catalog.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="px-4 py-2 rounded-lg border border-neutral-300 hover:border-neutral-950 text-xs font-semibold text-neutral-950 transition-colors cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          ) : (
            <>
              {visibleItems.map((item) => (
                <div key={item.productId} className="py-3.5 flex gap-3.5">
                  <Link
                    href={`/products/${item.slug}`}
                    onClick={closeDrawer}
                    className="h-16 w-16 bg-[#F7F7F7] border border-neutral-200/80 rounded-xl flex items-center justify-center p-1.5 shrink-0"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-neutral-400">
                        No img
                      </span>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/products/${item.slug}`}
                          onClick={closeDrawer}
                          className="text-xs sm:text-sm font-medium text-neutral-950 hover:text-[#C81E2B] line-clamp-1 leading-snug"
                        >
                          {item.name}
                        </Link>
                        <p className="text-[11px] uppercase tracking-wider text-neutral-400 mt-0.5">
                          {item.brand}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        aria-label={`Remove ${item.name}`}
                        className="text-neutral-400 hover:text-[#C81E2B] p-0.5 shrink-0 cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center border border-neutral-200 rounded-lg bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1)
                          }
                          aria-label="Decrease quantity"
                          className="p-1.5 text-neutral-600 hover:text-neutral-950 cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold text-neutral-950 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1)
                          }
                          aria-label="Increase quantity"
                          className="p-1.5 text-neutral-600 hover:text-neutral-950 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="text-xs sm:text-sm font-semibold text-neutral-950 tabular-nums">
                        {formatKes(item.priceKes * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {otherItemsCount > 0 && (
                <div className="py-2.5 flex items-center justify-between text-xs">
                  <span className="text-neutral-500 tabular-nums">
                    +{otherItemsCount} other{" "}
                    {otherItemsCount === 1 ? "item" : "items"} in your cart
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAllItems(true)}
                    className="font-semibold text-neutral-900 hover:text-[#C81E2B] underline underline-offset-4 cursor-pointer transition-colors"
                  >
                    View all
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sheet Footer */}
        {items.length > 0 && (
          <div className="px-5 sm:px-6 py-4 border-t border-neutral-200 bg-neutral-50/50 space-y-3 shrink-0">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <span className="text-xs font-medium text-neutral-500">
                  Cart Subtotal
                </span>
                {hasBulkyItem && (
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Includes bulky item — delivery calculated at checkout.
                  </p>
                )}
              </div>
              <span className="text-base font-semibold text-neutral-950 tabular-nums">
                {formatKes(subtotalKes)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={closeDrawer}
                className="py-2.5 px-3.5 rounded-xl border border-neutral-300 hover:border-neutral-950 bg-white text-neutral-900 text-xs font-semibold tracking-wide transition-colors cursor-pointer"
              >
                Continue Shopping
              </button>
              <button
                type="button"
                disabled={checkingOut}
                onClick={handleProceedToCheckout}
                className="py-2.5 px-3.5 rounded-xl bg-[#C81E2B] hover:bg-[#A61621] disabled:opacity-60 text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer"
              >
                {checkingOut ? "Checking..." : "Proceed to Checkout"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
