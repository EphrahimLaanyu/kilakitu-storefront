"use client";

import { useState } from "react";
import { ShoppingBag, Check } from "lucide-react";
import { useCart } from "./CartContext";

type AddToCartProps = {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  priceKes: number;
  imageUrl: string | null;
  warrantyText: string;
  isBulky: boolean;
  disabled?: boolean;
};

export function AddToCartButton({
  productId,
  slug,
  name,
  brand,
  priceKes,
  imageUrl,
  warrantyText,
  isBulky,
  disabled = false,
}: AddToCartProps) {
  const { addItem, openDrawer } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    if (disabled) return;
    const didAdd = addItem(
      {
        productId,
        slug,
        name,
        brand,
        priceKes,
        imageUrl,
        warrantyText,
        isBulky,
      },
      1
    );
    if (!didAdd) return;

    setAdded(true);
    openDrawer();
    window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleAdd}
      className="w-full py-3.5 px-5 rounded-md bg-[#C81E2B] hover:bg-[#A61621] disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-xs sm:text-sm font-semibold tracking-wide transition-colors inline-flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
    >
      {added ? (
        <>
          <Check className="h-4 w-4" />
          <span>Added to Bag</span>
        </>
      ) : (
        <>
          <ShoppingBag className="h-4 w-4 stroke-[1.75]" />
          <span>{disabled ? "Currently Unavailable" : "Add to Bag"}</span>
        </>
      )}
    </button>
  );
}
