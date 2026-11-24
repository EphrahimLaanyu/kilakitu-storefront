"use client";

import Link from "next/link";
import { ShoppingCart, X, Plus, Minus, Trash2, ArrowRight } from "lucide-react";
import { useCart } from "./CartContext";

function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function CartHeaderButton() {
  const { totalCount, openDrawer } = useCart();

  return (
    <button
      type="button"
      onClick={openDrawer}
      className="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
    >
      <ShoppingCart className="h-4 w-4 text-teal-400" />
      <span>Cart</span>
      <span className="px-1.5 py-0.5 rounded-full bg-teal-600 text-white text-[11px] font-bold">
        {totalCount}
      </span>
    </button>
  );
}

export function CartDrawer() {
  const {
    items,
    isDrawerOpen,
    isAuthenticated,
    authLoading,
    subtotalKes,
    hasBulkyItem,
    closeDrawer,
    openAuthGate,
    updateQuantity,
    removeItem,
  } = useCart();

  if (!isDrawerOpen) return null;

  function handleCheckoutClick() {
    if (!authLoading && !isAuthenticated) {
      closeDrawer();
      openAuthGate("checkout", "/checkout");
    } else {
      closeDrawer();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50">
      <div className="w-full max-w-md bg-white h-full flex flex-col justify-between shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-teal-700" />
            <h2 className="text-base font-bold text-slate-900">Your Cart</h2>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-14 space-y-2">
              <p className="text-sm font-semibold text-slate-900">Your cart is empty</p>
              <p className="text-xs text-slate-500">
                Add electronics from the catalog to proceed to checkout.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.productId}
                className="flex gap-3.5 bg-slate-50 border border-slate-200 rounded-xl p-3"
              >
                <div className="h-16 w-16 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400">No img</span>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/products/${item.slug}`}
                      onClick={closeDrawer}
                      className="text-sm font-bold text-slate-900 hover:text-teal-700 line-clamp-1"
                    >
                      {item.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs font-semibold text-slate-700">
                    {formatKes(item.priceKes)}
                  </p>

                  {item.isBulky && (
                    <p className="text-[11px] font-medium text-amber-700">Bulky item</p>
                  )}

                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="h-7 w-7 rounded-md border border-slate-300 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs font-bold text-slate-900 w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="h-7 w-7 rounded-md border border-slate-300 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-3">
          {hasBulkyItem && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Cart includes a bulky item—any zone bulky surcharge will be calculated at checkout.
            </p>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600">Subtotal</span>
            <span className="text-base font-extrabold text-slate-900">
              {formatKes(subtotalKes)}
            </span>
          </div>

          {!authLoading && !isAuthenticated ? (
            <button
              type="button"
              disabled={items.length === 0}
              onClick={handleCheckoutClick}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition disabled:bg-slate-300 disabled:text-slate-500 bg-teal-700 hover:bg-teal-800 text-white cursor-pointer"
            >
              <span>Sign In to Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition ${
                items.length === 0
                  ? "pointer-events-none bg-slate-300 text-slate-500"
                  : "bg-teal-700 hover:bg-teal-800 text-white"
              }`}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}