"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { useCart } from "./CartContext";

type CatalogAddToCartProps = {
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

export function CatalogAddToCartButton({
  productId,
  slug,
  name,
  brand,
  priceKes,
  imageUrl,
  warrantyText,
  isBulky,
  disabled = false,
}: CatalogAddToCartProps) {
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
      aria-label={disabled ? `${name} is out of stock` : `Add ${name} to cart`}
      className={`mt-3 w-full py-2 px-3 rounded-md border text-xs font-semibold tracking-wide transition-colors inline-flex items-center justify-center gap-1.5 ${
        disabled
          ? "border-neutral-200 bg-neutral-50 text-neutral-400 cursor-not-allowed"
          : added
          ? "border-neutral-950 bg-neutral-950 text-white cursor-pointer"
          : "border-neutral-200 bg-white text-neutral-950 hover:border-[#C81E2B] hover:bg-[#C81E2B] hover:text-white cursor-pointer"
      }`}
    >
      {disabled ? (
        <span>Out of stock</span>
      ) : added ? (
        <>
          <Check className="h-3.5 w-3.5 shrink-0" />
          <span>Added to Cart</span>
        </>
      ) : (
        <>
          <ShoppingCart className="h-3.5 w-3.5 stroke-[1.75] shrink-0" />
          <span>Add to Cart</span>
        </>
      )}
    </button>
  );
}
