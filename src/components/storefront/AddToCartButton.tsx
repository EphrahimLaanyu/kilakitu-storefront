"use client";

import { useState } from "react";
import { ShoppingBag, Check } from "lucide-react";
import { useCart } from "./CartContext";

export function AddToCartButton({
  product,
  disabled,
}: {
  product: {
    productId: string;
    slug: string;
    name: string;
    brand: string;
    priceKes: number;
    imageUrl: string | null;
    warrantyText: string;
    isBulky: boolean;
  };
  disabled?: boolean;
}) {
  const { addItem, openDrawer } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    if (disabled) return;
    const didAdd = addItem(product, 1);
    if (!didAdd) return;
    setAdded(true);
    openDrawer();
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleAdd}
      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-500 text-white text-sm font-bold transition cursor-pointer disabled:cursor-not-allowed"
    >
      {added ? (
        <>
          <Check className="h-4 w-4" />
          <span>Added to Cart</span>
        </>
      ) : (
        <>
          <ShoppingBag className="h-4 w-4" />
          <span>{disabled ? "Out of Stock" : "Add to Cart"}</span>
        </>
      )}
    </button>
  );
}