import Link from "next/link";
import type { StorefrontProductCard } from "@/lib/db/storefront";
import { CatalogAddToCartButton } from "./CatalogAddToCartButton";

function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

function getStockMeta(status: string) {
  switch (status) {
    case "in_stock":
      return {
        label: "In stock",
        dotClass: "bg-emerald-600",
        textClass: "text-neutral-600",
      };
    case "low_stock":
      return {
        label: "Low stock",
        dotClass: "bg-[#D4A024]",
        textClass: "text-neutral-700",
      };
    case "confirm_availability":
      return {
        label: "Confirm stock",
        dotClass: "bg-neutral-400",
        textClass: "text-neutral-600",
      };
    default:
      return {
        label: "Out of stock",
        dotClass: "bg-[#C81E2B]",
        textClass: "text-neutral-400",
      };
  }
}

function getWarrantyText(
  warrantyType: "manufacturer" | "shop" | "none",
  warrantyMonths: number
) {
  if (warrantyType === "none" || warrantyMonths <= 0) return null;
  const unit = warrantyMonths === 1 ? "month" : "months";
  return warrantyType === "shop"
    ? `${warrantyMonths}-${unit} shop warranty`
    : `${warrantyMonths}-${unit} manufacturer warranty`;
}

export function ProductCard({
  product,
  variant = "default",
  eager = false,
  mobileStacked = false,
}: {
  product: StorefrontProductCard;
  variant?: "default" | "deal";
  eager?: boolean;
  mobileStacked?: boolean;
}) {
  const stock = getStockMeta(product.stock_status);
  const warranty = getWarrantyText(
    product.warranty_type,
    product.warranty_months
  );
  const hasDiscount =
    typeof product.compare_at_price_kes === "number" &&
    product.compare_at_price_kes > product.price_kes;
  const savingsKes = hasDiscount
    ? product.compare_at_price_kes! - product.price_kes
    : 0;
  const discountPct = hasDiscount
    ? Math.round((savingsKes / product.compare_at_price_kes!) * 100)
    : 0;
  const isOutOfStock = product.stock_status === "out_of_stock";

  return (
    <article className="group flex flex-col justify-between h-full">
      <Link
        href={`/products/${product.slug}`}
        prefetch={false}
        className="block flex-1"
      >
        {/* Clean Studio Product Canvas */}
        <div
          className={`relative ${
            mobileStacked ? "aspect-[4/3] sm:aspect-square" : "aspect-square"
          } bg-[#F7F7F7] border border-neutral-200/70 group-hover:border-neutral-400 transition-colors overflow-hidden flex items-center justify-center p-5 sm:p-6`}
        >
          {product.primary_image_url ? (
            <img
              src={product.primary_image_url}
              alt={product.primary_image_alt || product.name}
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300"
            />
          ) : (
            <span className="text-xs text-neutral-400">Image unavailable</span>
          )}

          {/* Unboxed Editorial Label (Plain Text Only) */}
          {hasDiscount && discountPct > 0 ? (
            <span className="absolute top-3 left-3 text-[11px] font-semibold tracking-wide text-[#C81E2B] tabular-nums">
              -{discountPct}%
            </span>
          ) : product.is_featured ? (
            <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-900">
              Featured
            </span>
          ) : null}
        </div>

        {/* Typographic Product Details */}
        <div className="pt-3.5 space-y-1">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold uppercase tracking-[0.08em] text-neutral-500 truncate">
              {product.brand}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 font-medium shrink-0 ${stock.textClass}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${stock.dotClass}`}
              />
              <span>{stock.label}</span>
            </span>
          </div>

          <h3 className="text-sm sm:text-[15px] font-medium text-neutral-950 group-hover:text-[#C81E2B] transition-colors line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {warranty && (
            <p className="text-xs text-neutral-500 pt-0.5">{warranty}</p>
          )}
        </div>
      </Link>

      {/* Clean Hairline Price Footer + Direct Add to Cart */}
      <div className="mt-3 pt-2.5 border-t border-neutral-100">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <span className="text-sm sm:text-base font-semibold text-neutral-950 tabular-nums">
            {formatKes(product.price_kes)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-neutral-400 line-through tabular-nums">
              {formatKes(product.compare_at_price_kes!)}
            </span>
          )}
        </div>

        {variant === "deal" && hasDiscount && savingsKes > 0 && (
          <p className="text-[11px] font-medium text-[#C81E2B] tabular-nums mt-0.5">
            Save {formatKes(savingsKes)}
            {discountPct > 0 ? ` (${discountPct}% off)` : ""}
          </p>
        )}

        <CatalogAddToCartButton
          productId={product.id}
          slug={product.slug}
          name={product.name}
          brand={product.brand}
          priceKes={product.price_kes}
          imageUrl={product.primary_image_url}
          warrantyText={warranty || "No warranty stated"}
          isBulky={product.is_bulky}
          disabled={isOutOfStock}
        />
      </div>
    </article>
  );
}
