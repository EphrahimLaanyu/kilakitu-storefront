import Link from "next/link";
import {
  getActiveStoreBySlug,
  getStorefrontCategories,
  getStorefrontProducts,
} from "@/lib/db/storefront";
import { CatalogAddToCartButton } from "@/components/storefront/CatalogAddToCartButton";

export const revalidate = 30;

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

export default async function StorefrontHomePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    search?: string;
    category?: string;
    brand?: string;
    maxPrice?: string;
    available?: string;
  }>;
}) {
  const params = await searchParams;
  const searchQuery = (params.q || params.search || "").trim();
  const categorySlug = (params.category || "all").trim();
  const brandFilter = (params.brand || "all").trim();
  const maxPriceNum = params.maxPrice ? Number(params.maxPrice) : undefined;
  const onlyAvailable = params.available === "1";

  const storeSlug =
    process.env.NEXT_PUBLIC_STORE_SLUG || "kilakitu-electronics";

  const [store, categories] = await Promise.all([
    getActiveStoreBySlug(storeSlug),
    getStorefrontCategories(),
  ]);

  if (!store) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-20 text-center space-y-2">
        <h1 className="text-xl font-semibold text-neutral-950">
          Storefront Unavailable
        </h1>
        <p className="text-sm text-neutral-500">
          Active store &ldquo;{storeSlug}&rdquo; could not be found.
        </p>
      </main>
    );
  }

  const { products, brands } = await getStorefrontProducts(store.id, {
    search: searchQuery || undefined,
    categorySlug: categorySlug !== "all" ? categorySlug : undefined,
    brand: brandFilter !== "all" ? brandFilter : undefined,
    maxPriceKes:
      typeof maxPriceNum === "number" &&
      Number.isFinite(maxPriceNum) &&
      maxPriceNum > 0
        ? maxPriceNum
        : undefined,
    onlyAvailable,
  });

  const activeCategoryObj =
    categorySlug !== "all"
      ? categories.find((c) => c.slug === categorySlug)
      : null;

  const hasActiveFilters =
    Boolean(searchQuery) ||
    categorySlug !== "all" ||
    brandFilter !== "all" ||
    (typeof maxPriceNum === "number" && maxPriceNum > 0) ||
    onlyAvailable;

  return (
    <main className="bg-white min-h-screen">
      {/* Editorial Value Strip — Pure Typography & Hairline Dividers */}
      <div className="border-b border-neutral-200 bg-neutral-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-y-1.5 text-[11px] sm:text-xs text-neutral-600">
          <div className="flex items-center divide-x divide-neutral-300">
            <span className="pr-3 sm:pr-4 font-medium text-neutral-900">
              Genuine Electronics
            </span>
            <span className="px-3 sm:px-4">Verified Warranty</span>
            <span className="pl-3 sm:pl-4">4-Digit Handover PIN</span>
          </div>
          <span className="hidden md:inline text-neutral-500">
            {store.pickup_address}
          </span>
        </div>
      </div>

      {/* Main Catalog Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-20 space-y-8">
        {/* Editorial Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-neutral-200">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C81E2B]">
              {store.name}
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950">
              {searchQuery
                ? `Search: “${searchQuery}”`
                : activeCategoryObj
                ? activeCategoryObj.name
                : "All Electronics"}
            </h1>
          </div>

          <p className="text-xs text-neutral-500 tabular-nums">
            Showing {products.length}{" "}
            {products.length === 1 ? "product" : "products"}
          </p>
        </div>

        {/* Clean Architectural Filter Bar */}
        <form
          method="GET"
          action="/"
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-4 pb-6 border-b border-neutral-200 items-end"
        >
          {searchQuery && <input type="hidden" name="q" value={searchQuery} />}

          <div className="col-span-1 lg:col-span-3 space-y-1.5">
            <label
              htmlFor="filter-category"
              className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
            >
              Category
            </label>
            <select
              id="filter-category"
              name="category"
              defaultValue={categorySlug}
              className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-xs sm:text-sm font-medium text-neutral-950 focus:outline-none transition-colors"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-1 lg:col-span-3 space-y-1.5">
            <label
              htmlFor="filter-brand"
              className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
            >
              Brand
            </label>
            <select
              id="filter-brand"
              name="brand"
              defaultValue={brandFilter}
              className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-xs sm:text-sm font-medium text-neutral-950 focus:outline-none transition-colors"
            >
              <option value="all">All Brands</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-1 lg:col-span-2 space-y-1.5">
            <label
              htmlFor="filter-max-price"
              className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
            >
              Max Budget (KES)
            </label>
            <input
              id="filter-max-price"
              type="number"
              name="maxPrice"
              min={0}
              step={500}
              defaultValue={maxPriceNum && maxPriceNum > 0 ? maxPriceNum : ""}
              placeholder="No limit"
              className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-xs sm:text-sm font-medium text-neutral-950 placeholder:text-neutral-400 focus:outline-none transition-colors tabular-nums"
            />
          </div>

          <div className="col-span-1 lg:col-span-2 flex items-center h-9">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer select-none">
              <input
                type="checkbox"
                name="available"
                value="1"
                defaultChecked={onlyAvailable}
                className="h-3.5 w-3.5 rounded-none border-neutral-400 text-neutral-950 focus:ring-0"
              />
              <span>In stock only</span>
            </label>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-md bg-neutral-950 hover:bg-[#C81E2B] text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer"
            >
              Apply
            </button>
            {hasActiveFilters && (
              <Link
                href="/"
                className="py-2.5 px-2 text-xs font-medium text-neutral-500 hover:text-neutral-950 underline underline-offset-4 transition-colors"
              >
                Reset
              </Link>
            )}
          </div>
        </form>

        {/* Product Grid */}
        {products.length === 0 ? (
          <div className="py-16 text-center space-y-3 border-b border-neutral-200">
            <h2 className="text-base font-semibold text-neutral-950">
              No matching products
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
              Adjust your search terms or clear active filters to view the full
              catalog.
            </p>
            {hasActiveFilters && (
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-block px-5 py-2.5 rounded-md bg-neutral-950 text-white text-xs font-semibold"
                >
                  Clear All Filters
                </Link>
              </div>
            )}
          </div>
        ) : (
          <section
            aria-label="Products"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-7 sm:gap-y-12"
          >
            {products.map((product, index) => {
              const stock = getStockMeta(product.stock_status);
              const warranty = getWarrantyText(
                product.warranty_type,
                product.warranty_months
              );
              const hasDiscount =
                typeof product.compare_at_price_kes === "number" &&
                product.compare_at_price_kes > product.price_kes;
              const discountPct = hasDiscount
                ? Math.round(
                    ((product.compare_at_price_kes! - product.price_kes) /
                      product.compare_at_price_kes!) *
                      100
                  )
                : 0;

              const isOutOfStock = product.stock_status === "out_of_stock";

              return (
                <article
                  key={product.id}
                  className="group flex flex-col justify-between"
                >
                  <Link
                    href={`/products/${product.slug}`}
                    prefetch={false}
                    className="block flex-1"
                  >
                    {/* Clean Studio Product Canvas */}
                    <div className="relative aspect-square bg-[#F7F7F7] border border-neutral-200/70 group-hover:border-neutral-400 transition-colors overflow-hidden flex items-center justify-center p-4 sm:p-6">
                      {product.primary_image_url ? (
                        <img
                          src={product.primary_image_url}
                          alt={product.primary_image_alt || product.name}
                          loading={index < 4 ? "eager" : "lazy"}
                          decoding="async"
                          className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      ) : (
                        <span className="text-xs text-neutral-400">
                          Image unavailable
                        </span>
                      )}

                      {/* Unboxed Top-Left Editorial Label (Plain Text Only) */}
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

                      <h2 className="text-sm sm:text-[15px] font-medium text-neutral-950 group-hover:text-[#C81E2B] transition-colors line-clamp-2 leading-snug">
                        {product.name}
                      </h2>

                      {warranty && (
                        <p className="text-xs text-neutral-500 pt-0.5">
                          {warranty}
                        </p>
                      )}
                    </div>
                  </Link>

                  {/* Clean Hairline Price Footer + Direct Add to Cart */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-100">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm sm:text-base font-semibold text-neutral-950 tabular-nums">
                        {formatKes(product.price_kes)}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-neutral-400 line-through tabular-nums">
                          {formatKes(product.compare_at_price_kes!)}
                        </span>
                      )}
                    </div>

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
            })}
          </section>
        )}
      </div>
    </main>
  );
}