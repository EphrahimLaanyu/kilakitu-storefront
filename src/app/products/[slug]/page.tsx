import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Phone,
  AlertTriangle,
} from "lucide-react";
import {
  getActiveStoreBySlug,
  getStorefrontProductBySlug,
} from "@/lib/db/storefront";
import { AddToCartButton } from "@/components/storefront/AddToCartButton";
import { CartHeaderButton } from "@/components/storefront/CartDrawer";

export const dynamic = "force-dynamic";

function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

function getWarrantyText(
  warrantyType: "manufacturer" | "shop" | "none",
  months: number
) {
  if (warrantyType === "none" || months <= 0) return "No Warranty Included";
  if (warrantyType === "shop") return `${months}-Month Shop Warranty`;
  return `${months}-Month Manufacturer Warranty`;
}

export default async function StorefrontProductDetailPage({
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

  const specEntries = Object.entries(product.specs);
  const warrantyText = getWarrantyText(
    product.warranty_type,
    product.warranty_months
  );
  const isOutOfStock = product.stock_status === "out_of_stock";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Catalog</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/track"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Track Order
            </Link>
            <CartHeaderButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-3">
            <div className="aspect-square bg-white border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center">
              {product.primary_image_url ? (
                <img
                  src={product.primary_image_url}
                  alt={product.primary_image_alt || product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm text-slate-400">No Photo Available</span>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2.5">
                {product.images.map((img) => (
                  <div
                    key={img.id}
                    className="aspect-square bg-white border border-slate-200 rounded-xl overflow-hidden"
                  >
                    <img
                      src={img.public_url}
                      alt={img.alt_text || product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="uppercase tracking-wider text-teal-700">
                  {product.brand}
                </span>
                {product.category_name && (
                  <span>• {product.category_name}</span>
                )}
                {product.model_number && (
                  <span>• Model: {product.model_number}</span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-slate-900">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-slate-900">
                  {formatKes(product.price_kes)}
                </span>
                {product.compare_at_price_kes &&
                  product.compare_at_price_kes > product.price_kes && (
                    <span className="text-sm text-slate-400 line-through">
                      {formatKes(product.compare_at_price_kes)}
                    </span>
                  )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 capitalize">
                  Status: {product.stock_status.replaceAll("_", " ")}
                </span>
                {product.is_bulky && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    Bulky Item (Special Dispatch)
                  </span>
                )}
              </div>

              {product.short_description && (
                <p className="text-sm text-slate-600 leading-relaxed">
                  {product.short_description}
                </p>
              )}

              <div className="pt-1">
                <AddToCartButton
                  disabled={isOutOfStock}
                  product={{
                    productId: product.id,
                    slug: product.slug,
                    name: product.name,
                    brand: product.brand,
                    priceKes: product.price_kes,
                    imageUrl: product.primary_image_url,
                    warrantyText,
                    isBulky: product.is_bulky,
                  }}
                />
              </div>

              <div className="rounded-xl bg-teal-50/70 border border-teal-200/80 p-4 space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-teal-900">
                  <ShieldCheck className="h-4 w-4 text-teal-700 shrink-0" />
                  <span>{warrantyText}</span>
                </div>
                {product.warranty_notes && (
                  <p className="text-xs text-teal-900/80 pl-6">
                    {product.warranty_notes}
                  </p>
                )}
              </div>

              {product.stock_status === "confirm_availability" && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Stock is moving fast in the physical shop—confirming
                    availability before dispatch is recommended.
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Shop Pickup:</strong> {product.store.pickup_address}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>
                    <strong>Support / WhatsApp:</strong>{" "}
                    {product.store.whatsapp_number}
                  </span>
                </div>
              </div>
            </div>

            {specEntries.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                <h2 className="text-base font-bold text-slate-900">
                  Technical Specifications
                </h2>
                <dl className="divide-y divide-slate-100 text-sm">
                  {specEntries.map(([key, val]) => (
                    <div
                      key={key}
                      className="py-2.5 flex items-center justify-between gap-4"
                    >
                      <dt className="text-slate-500 font-medium">{key}</dt>
                      <dd className="text-slate-900 font-semibold text-right">
                        {val}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {product.description && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2">
                <h2 className="text-base font-bold text-slate-900">
                  Product Overview
                </h2>
                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}