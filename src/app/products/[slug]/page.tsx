import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getActiveStoreBySlug,
  getStorefrontProductBySlug,
} from "@/lib/db/storefront";
import { AddToCartButton } from "@/components/storefront/AddToCartButton";

export const dynamic = "force-dynamic";

function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

function getStockMeta(status: string) {
  switch (status) {
    case "in_stock":
      return {
        label: "In stock",
        note: "Ready for shop pickup or zone dispatch.",
        dotClass: "bg-emerald-600",
        canBuy: true,
      };
    case "low_stock":
      return {
        label: "Low stock",
        note: "Limited units remaining in store.",
        dotClass: "bg-[#D4A024]",
        canBuy: true,
      };
    case "confirm_availability":
      return {
        label: "Confirm availability",
        note: "Stock is verified with the shop team prior to handover.",
        dotClass: "bg-neutral-400",
        canBuy: true,
      };
    default:
      return {
        label: "Out of stock",
        note: "Currently unavailable.",
        dotClass: "bg-[#C81E2B]",
        canBuy: false,
      };
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const storeSlug =
    process.env.NEXT_PUBLIC_STORE_SLUG || "kilakitu-electronics";
  const store = await getActiveStoreBySlug(storeSlug);

  if (!store) {
    notFound();
  }

  const product = await getStorefrontProductBySlug(store.id, slug);
  if (!product) {
    notFound();
  }

  const stock = getStockMeta(product.stock_status);
  const specEntries = Object.entries(product.specs || {});
  const hasDiscount =
    typeof product.compare_at_price_kes === "number" &&
    product.compare_at_price_kes > product.price_kes;

  const warrantyLabel =
    product.warranty_type === "none" || product.warranty_months <= 0
      ? "No warranty stated"
      : `${product.warranty_months}-${
          product.warranty_months === 1 ? "month" : "months"
        } ${
          product.warranty_type === "shop"
            ? "shop warranty"
            : "manufacturer warranty"
        }`;

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-20">
        {/* Top Breadcrumb Bar */}
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-neutral-200 text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-medium text-neutral-600 hover:text-neutral-950 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Catalog</span>
          </Link>
          <Link
            href="/policies"
            className="font-medium text-neutral-600 hover:text-neutral-950 underline underline-offset-4 transition-colors"
          >
            Warranty & Return Policy
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pt-8">
          {/* Gallery Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="aspect-square bg-[#F7F7F7] border border-neutral-200/80 flex items-center justify-center p-6 sm:p-12">
              {product.primary_image_url ? (
                <img
                  src={product.primary_image_url}
                  alt={product.primary_image_alt || product.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-neutral-400">
                  Image unavailable
                </span>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.map((img) => (
                  <div
                    key={img.id}
                    className="aspect-square bg-[#F7F7F7] border border-neutral-200/80 p-2 flex items-center justify-center"
                  >
                    <img
                      src={img.public_url}
                      alt={img.alt_text || product.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="lg:col-span-5 space-y-7">
            <div className="space-y-3 pb-6 border-b border-neutral-200">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  {product.brand}
                  {product.category_name ? ` / ${product.category_name}` : ""}
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700">
                  <span className={`h-1.5 w-1.5 rounded-full ${stock.dotClass}`} />
                  <span>{stock.label}</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 leading-tight">
                {product.name}
              </h1>

              {(product.model_number || product.sku) && (
                <p className="text-xs text-neutral-500">
                  {product.model_number ? `Model ${product.model_number}` : ""}
                  {product.model_number && product.sku ? "  •  " : ""}
                  {product.sku ? `SKU ${product.sku}` : ""}
                </p>
              )}

              <div className="pt-2 flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-semibold text-neutral-950 tabular-nums">
                  {formatKes(product.price_kes)}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-neutral-400 line-through tabular-nums">
                    {formatKes(product.compare_at_price_kes!)}
                  </span>
                )}
              </div>

              <p className="text-xs text-neutral-500">{stock.note}</p>
            </div>

            {product.short_description && (
              <p className="text-sm text-neutral-700 leading-relaxed">
                {product.short_description}
              </p>
            )}

            <div className="space-y-3">
              <AddToCartButton
                productId={product.id}
                slug={product.slug}
                name={product.name}
                brand={product.brand}
                priceKes={product.price_kes}
                imageUrl={product.primary_image_url}
                warrantyText={warrantyLabel}
                isBulky={product.is_bulky}
                disabled={!stock.canBuy}
              />
            </div>

            {/* Key Terms & Fulfillment Breakdown */}
            <div className="border-t border-neutral-200 divide-y divide-neutral-100 text-xs sm:text-sm">
              <div className="py-3.5 flex items-baseline justify-between gap-4">
                <span className="text-neutral-500">Warranty</span>
                <span className="font-medium text-neutral-950 text-right">
                  {warrantyLabel}
                </span>
              </div>
              {product.warranty_notes && (
                <div className="py-3 text-xs text-neutral-600 leading-relaxed">
                  {product.warranty_notes}
                </div>
              )}
              <div className="py-3.5 flex items-baseline justify-between gap-4">
                <span className="text-neutral-500">Fulfillment</span>
                <span className="font-medium text-neutral-950 text-right">
                  Pickup & zone delivery
                </span>
              </div>
              <div className="py-3.5 flex items-baseline justify-between gap-4">
                <span className="text-neutral-500">Pickup Point</span>
                <span className="font-medium text-neutral-950 text-right">
                  {store.pickup_address}
                </span>
              </div>
              {product.is_bulky && (
                <div className="py-3 text-xs text-neutral-700">
                  Bulky item — additional delivery zone surcharge applies.
                </div>
              )}
              {product.requires_insured_courier && (
                <div className="py-3 text-xs text-neutral-700">
                  High-value item — insured courier dispatch supported.
                </div>
              )}
            </div>

            {/* Technical Specifications */}
            {specEntries.length > 0 && (
              <div className="pt-4 border-t border-neutral-200 space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Specifications
                </h2>
                <dl className="divide-y divide-neutral-100 border-t border-b border-neutral-100 text-xs sm:text-sm">
                  {specEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="py-3 flex items-baseline justify-between gap-4"
                    >
                      <dt className="text-neutral-500">{key}</dt>
                      <dd className="font-medium text-neutral-950 text-right">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Overview */}
            {product.description && (
              <div className="pt-4 border-t border-neutral-200 space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Overview
                </h2>
                <p className="text-sm text-neutral-700 whitespace-pre-line leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}