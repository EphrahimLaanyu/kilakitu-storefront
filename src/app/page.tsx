import Link from "next/link";
import { Search, ShieldCheck, Package, Store } from "lucide-react";
import {
  getActiveStoreBySlug,
  getStorefrontCategories,
  getStorefrontProducts,
} from "@/lib/db/storefront";
import { CartHeaderButton } from "@/components/storefront/CartDrawer";

export const dynamic = "force-dynamic";

function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

function getWarrantyLabel(
  warrantyType: "manufacturer" | "shop" | "none",
  months: number
) {
  if (warrantyType === "none" || months <= 0) return "No Warranty";
  if (warrantyType === "shop") return `${months}Mo Shop Warranty`;
  return `${months}Mo Manufacturer Warranty`;
}

function getStockBadge(
  status: "in_stock" | "low_stock" | "confirm_availability" | "out_of_stock"
) {
  switch (status) {
    case "in_stock":
      return {
        label: "In Stock",
        cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "low_stock":
      return {
        label: "Low Stock",
        cls: "bg-amber-50 text-amber-800 border-amber-200",
      };
    case "confirm_availability":
      return {
        label: "Confirm Availability",
        cls: "bg-sky-50 text-sky-700 border-sky-200",
      };
    case "out_of_stock":
      return {
        label: "Out of Stock",
        cls: "bg-slate-100 text-slate-500 border-slate-200",
      };
  }
}

export default async function StorefrontHomePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    maxPrice?: string;
    available?: string;
  }>;
}) {
  const params = await searchParams;
  const storeSlug =
    process.env.NEXT_PUBLIC_STORE_SLUG || "kilakitu-electronics";
  const store = await getActiveStoreBySlug(storeSlug);

  if (!store) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md text-center space-y-2">
          <h1 className="text-lg font-bold text-slate-900">
            Storefront Unavailable
          </h1>
          <p className="text-sm text-slate-600">
            No active store found for slug &ldquo;{storeSlug}&rdquo;.
          </p>
        </div>
      </div>
    );
  }

  const parsedMaxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  const [categories, catalog] = await Promise.all([
    getStorefrontCategories(),
    getStorefrontProducts(store.id, {
      search: params.q,
      categorySlug: params.category || "all",
      brand: params.brand || "all",
      maxPriceKes:
        parsedMaxPrice && Number.isFinite(parsedMaxPrice) && parsedMaxPrice > 0
          ? parsedMaxPrice
          : undefined,
      onlyAvailable: params.available === "1",
    }),
  ]);

  const activeCategory = params.category || "all";
  const activeBrand = params.brand || "all";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className="h-9 w-9 rounded-lg object-contain border border-slate-200 bg-slate-50 p-1 shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
                <Store className="h-5 w-5" />
              </div>
            )}
            <div className="truncate">
              <span className="font-bold text-base text-slate-900">
                {store.name}
              </span>
              <span className="hidden sm:inline text-xs text-slate-500 ml-2">
                by KilaKitu
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <Link href="/track" className="hover:text-slate-900">
              Track Order
            </Link>
            <CartHeaderButton />
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
              Verified Electronics • Fast Dispatch
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {store.name}
            </h1>
            <p className="text-sm text-slate-600">
              {store.description ||
                "Browse genuine electronics with clear warranties, transparent pricing, and convenient shop pickup or zone delivery."}
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-1 shrink-0">
            <p className="font-semibold text-slate-900">Pickup Point</p>
            <p>{store.pickup_address}</p>
            {store.opening_hours && (
              <p className="text-slate-500">{store.opening_hours}</p>
            )}
          </div>
        </section>

        <form
          method="GET"
          action="/"
          className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4"
        >
          {activeCategory !== "all" && (
            <input type="hidden" name="category" value={activeCategory} />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="q"
                defaultValue={params.q || ""}
                placeholder="Search phones, laptops, models..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900"
              />
            </div>

            <div>
              <select
                name="brand"
                defaultValue={activeBrand}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900"
              >
                <option value="all">All Brands</option>
                {catalog.brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <input
                type="number"
                name="maxPrice"
                min={0}
                step={500}
                defaultValue={params.maxPrice || ""}
                placeholder="Max price (KES)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="available"
                  value="1"
                  defaultChecked={params.available === "1"}
                  className="rounded border-slate-300 text-teal-700"
                />
                <span>Available only</span>
              </label>

              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer"
              >
                Filter
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Link
              href="/"
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${
                activeCategory === "all"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              All Items
            </Link>
            {categories.map((cat) => {
              const isSelected = activeCategory === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={`/?category=${encodeURIComponent(cat.slug)}`}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing <strong>{catalog.products.length}</strong>{" "}
            {catalog.products.length === 1 ? "product" : "products"}
          </span>
          {(params.q ||
            activeCategory !== "all" ||
            activeBrand !== "all" ||
            params.maxPrice ||
            params.available) && (
            <Link
              href="/"
              className="text-teal-700 font-semibold hover:underline"
            >
              Clear filters
            </Link>
          )}
        </div>

        {catalog.products.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-2">
            <Package className="h-8 w-8 text-slate-400 mx-auto" />
            <h2 className="text-base font-semibold text-slate-900">
              No matching products found
            </h2>
            <p className="text-sm text-slate-600">
              Try clearing your search or selecting another category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {catalog.products.map((product) => {
              const stockBadge = getStockBadge(product.stock_status);
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-teal-600/50 transition flex flex-col"
                >
                  <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden">
                    {product.primary_image_url ? (
                      <img
                        src={product.primary_image_url}
                        alt={product.primary_image_alt || product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">No Photo</span>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          {product.brand}
                          {product.category_name
                            ? ` • ${product.category_name}`
                            : ""}
                        </span>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${stockBadge.cls}`}
                        >
                          {stockBadge.label}
                        </span>
                      </div>

                      <h2 className="text-base font-bold text-slate-900 line-clamp-2">
                        {product.name}
                      </h2>

                      {product.short_description && (
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {product.short_description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-slate-900">
                          {formatKes(product.price_kes)}
                        </span>
                        {product.compare_at_price_kes &&
                          product.compare_at_price_kes > product.price_kes && (
                            <span className="text-xs text-slate-400 line-through">
                              {formatKes(product.compare_at_price_kes)}
                            </span>
                          )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <ShieldCheck className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                        <span>
                          {getWarrantyLabel(
                            product.warranty_type,
                            product.warranty_months
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}