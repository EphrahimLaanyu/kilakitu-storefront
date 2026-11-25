"use client";

import Link from "next/link";
import { X, Plus, Minus, Trash2 } from "lucide-react";
import { useCart } from "./CartContext";

function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function CartDrawer() {
  const {
    items,
    isDrawerOpen,
    totalCount,
    subtotalKes,
    hasBulkyItem,
    closeDrawer,
    updateQuantity,
    removeItem,
  } = useCart();

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-neutral-950/45 backdrop-blur-[1px]">
      <div className="w-full max-w-md bg-white h-full border-l border-neutral-200 flex flex-col justify-between">
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-neutral-950">
              Shopping Bag
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5 tabular-nums">
              {totalCount} {totalCount === 1 ? "item" : "items"}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close shopping bag"
            className="p-2 text-neutral-500 hover:text-neutral-950 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Bag Items */}
        <div className="flex-1 overflow-y-auto px-6 divide-y divide-neutral-100">
          {items.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <p className="text-sm font-medium text-neutral-900">
                Your bag is empty
              </p>
              <p className="text-xs text-neutral-500">
                Explore phones, laptops, audio, and electronics in the catalog.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="px-4 py-2.5 rounded-md border border-neutral-300 hover:border-neutral-950 text-xs font-semibold text-neutral-950 transition-colors cursor-pointer"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="py-5 flex gap-4">
                <Link
                  href={`/products/${item.slug}`}
                  onClick={closeDrawer}
                  className="h-20 w-20 bg-[#F7F7F7] border border-neutral-200/80 flex items-center justify-center p-2 shrink-0"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-neutral-400">No img</span>
                  )}
                </Link>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/products/${item.slug}`}
                        onClick={closeDrawer}
                        className="text-xs sm:text-sm font-medium text-neutral-950 hover:text-[#C81E2B] line-clamp-2 leading-snug"
                      >
                        {item.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        aria-label={`Remove ${item.name}`}
                        className="text-neutral-400 hover:text-[#C81E2B] p-0.5 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                      {item.brand}
                    </p>
                    {item.isBulky && (
                      <p className="text-[11px] text-neutral-600">
                        Bulky item — zone surcharge may apply
                      </p>
                    )}
                  </div>

                  <div className="pt-3 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center border border-neutral-300 rounded-md">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                        aria-label="Decrease quantity"
                        className="p-1.5 text-neutral-700 hover:text-neutral-950 cursor-pointer"
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
                        className="p-1.5 text-neutral-700 hover:text-neutral-950 cursor-pointer"
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
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t border-neutral-200 bg-neutral-50/60 space-y-4">
            <div className="space-y-1.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-semibold text-neutral-950 tabular-nums">
                  {formatKes(subtotalKes)}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Delivery fees, bulky surcharges, and payment options are calculated
                at checkout.
              </p>
              {hasBulkyItem && (
                <p className="text-[11px] text-neutral-700 font-medium">
                  Includes bulky item(s).
                </p>
              )}
            </div>

            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="block w-full py-3.5 px-5 rounded-md bg-[#C81E2B] hover:bg-[#A61621] text-white text-center text-xs sm:text-sm font-semibold tracking-wide transition-colors"
            >
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}