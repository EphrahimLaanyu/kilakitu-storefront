import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getActiveStoreBySlug,
  getPaginatedStorefrontCatalog,
  getStorefrontCategories,
  type StorefrontCatalogSort,
} from "@/lib/db/storefront";
import { ProductCard } from "@/components/storefront/ProductCard";

export const revalidate = 30;

const PAGE_SIZE = 16;

const VALID_SORTS = new Set<StorefrontCatalogSort>([
  "featured",
  "deals",
  "newest",
  "price_asc",
  "price_desc",
]);

function buildCatalogHref(
  params: {
    q?: string;
    category?: string;
    brand?: string;
    maxPrice?: number;
    available?: boolean;
    featured?: boolean;
    deals?: boolean;
    sort?: StorefrontCatalogSort;
  },
  targetPage: number
): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.category && params.category !== "all") {
    sp.set("category", params.category);
  }
  if (params.brand && params.brand !== "all") {
    sp.set("brand", params.brand);
  }
  if (params.maxPrice && params.maxPrice > 0) {
    sp.set("maxPrice", String(Math.round(params.maxPrice)));
  }
  if (params.available) sp.set("available", "1");
  if (params.featured) sp.set("featured", "1");
  if (params.deals) sp.set("deals", "1");
  if (params.sort && params.sort !== "featured") {
    sp.set("sort", params.sort);
  }
  if (targetPage > 1) {
    sp.set("page", String(targetPage));
  }
  const qs = sp.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

function getVisiblePageNumbers(
  currentPage: number,
  totalPages: number
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("ellipsis");
  for (let p = start; p <= end; p++) {
    pages.push(p);
  }
  if (end < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    search?: string;
    category?: string;
    brand?: string;
    maxPrice?: string;
    available?: string;
    featured?: string;
    deals?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const searchQuery = (params.q || params.search || "").trim();
  const categorySlug = (params.category || "all").trim();
  const brandFilter = (params.brand || "all").trim();
  const maxPriceNum = params.maxPrice ? Number(params.maxPrice) : undefined;
  const validMaxPrice =
    typeof maxPriceNum === "number" &&
    Number.isFinite(maxPriceNum) &&
    maxPriceNum > 0
      ? maxPriceNum
      : undefined;
  const onlyAvailable = params.available === "1";
  const onlyFeatured = params.featured === "1";
  const onlyDeals = params.deals === "1";
  const rawSort = (params.sort || "").trim() as StorefrontCatalogSort;
  const sort: StorefrontCatalogSort = VALID_SORTS.has(rawSort)
    ? rawSort
    : onlyDeals
    ? "deals"
    : "featured";
  const parsedPage = params.page ? Number(params.page) : 1;
  const requestedPage =
    Number.isFinite(parsedPage) && parsedPage >= 1
      ? Math.floor(parsedPage)
      : 1;

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
          Catalog Unavailable
        </h1>
        <p className="text-sm text-neutral-500">
          Active store &ldquo;{storeSlug}&rdquo; could not be found.
        </p>
      </main>
    );
  }

  const catalog = await getPaginatedStorefrontCatalog(store.id, {
    search: searchQuery || undefined,
    categorySlug: categorySlug !== "all" ? categorySlug : undefined,
    brand: brandFilter !== "all" ? brandFilter : undefined,
    maxPriceKes: validMaxPrice,
    onlyAvailable,
    onlyFeatured,
    onlyDeals,
    sort,
    page: requestedPage,
    pageSize: PAGE_SIZE,
  });

  const activeCategoryObj =
    categorySlug !== "all"
      ? categories.find((c) => c.slug === categorySlug)
      : null;

  const hasActiveFilters =
    Boolean(searchQuery) ||
    categorySlug !== "all" ||
    brandFilter !== "all" ||
    Boolean(validMaxPrice) ||
    onlyAvailable ||
    onlyFeatured ||
    onlyDeals ||
    sort !== "featured";

  const startIndex =
    catalog.totalCount === 0 ? 0 : (catalog.page - 1) * catalog.pageSize + 1;
  const endIndex = Math.min(
    catalog.totalCount,
    catalog.page * catalog.pageSize
  );

  const headingTitle = searchQuery
    ? `Search: “${searchQuery}”`
    : activeCategoryObj
    ? activeCategoryObj.name
    : onlyDeals || sort === "deals"
    ? "Hottest Deals"
    : onlyFeatured
    ? "Featured"
    : sort === "newest"
    ? "New Arrivals"
    : "Full Catalog";

  const paginationParams = {
    q: searchQuery || undefined,
    category: categorySlug !== "all" ? categorySlug : undefined,
    brand: brandFilter !== "all" ? brandFilter : undefined,
    maxPrice: validMaxPrice,
    available: onlyAvailable,
    featured: onlyFeatured,
    deals: onlyDeals,
    sort,
  };

  const pageNumbers = getVisiblePageNumbers(catalog.page, catalog.totalPages);
  const showDealSavings = onlyDeals || sort === "deals";

  return (
    <main className="bg-white min-h-screen">
      {/* Main Catalog Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-20 space-y-8">
        {/* Editorial Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-neutral-200">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C81E2B]">
              {store.name}
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950">
              {headingTitle}
            </h1>
          </div>

          <p className="text-xs text-neutral-500 tabular-nums">
            {catalog.totalCount === 0
              ? "0 products"
              : `Showing ${startIndex}–${endIndex} of ${catalog.totalCount} ${
                  catalog.totalCount === 1 ? "product" : "products"
                }`}
          </p>
        </div>

        {/* Architectural Filter & Sort Bar */}
        <form
          method="GET"
          action="/catalog"
          className="space-y-5 pb-6 border-b border-neutral-200"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-4 items-end">
            <div className="col-span-2 sm:col-span-3 lg:col-span-3 space-y-1.5">
              <label
                htmlFor="catalog-search"
                className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
              >
                Search
              </label>
              <input
                id="catalog-search"
                type="search"
                name="q"
                defaultValue={searchQuery}
                placeholder="Model, brand, keyword..."
                className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-xs sm:text-sm font-medium text-neutral-950 placeholder:text-neutral-400 focus:outline-none transition-colors"
              />
            </div>

            <div className="col-span-1 lg:col-span-2 space-y-1.5">
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

            <div className="col-span-1 lg:col-span-2 space-y-1.5">
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
                {catalog.brands.map((brand) => (
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
                defaultValue={validMaxPrice ?? ""}
                placeholder="No limit"
                className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-xs sm:text-sm font-medium text-neutral-950 placeholder:text-neutral-400 focus:outline-none transition-colors tabular-nums"
              />
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-1.5">
              <label
                htmlFor="filter-sort"
                className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
              >
                Sort By
              </label>
              <select
                id="filter-sort"
                name="sort"
                defaultValue={sort}
                className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-xs sm:text-sm font-medium text-neutral-950 focus:outline-none transition-colors"
              >
                <option value="featured">Featured</option>
                <option value="deals">Hottest Deals (% Off)</option>
                <option value="newest">New Arrivals</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-neutral-700">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="available"
                  value="1"
                  defaultChecked={onlyAvailable}
                  className="h-3.5 w-3.5 rounded-none border-neutral-400 text-neutral-950 focus:ring-0"
                />
                <span>In stock only</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="deals"
                  value="1"
                  defaultChecked={onlyDeals}
                  className="h-3.5 w-3.5 rounded-none border-neutral-400 text-neutral-950 focus:ring-0"
                />
                <span>Deals only</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="featured"
                  value="1"
                  defaultChecked={onlyFeatured}
                  className="h-3.5 w-3.5 rounded-none border-neutral-400 text-neutral-950 focus:ring-0"
                />
                <span>Featured only</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="py-2 px-5 rounded-md bg-neutral-950 hover:bg-[#C81E2B] text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer"
              >
                Apply Filters
              </button>
              {hasActiveFilters && (
                <Link
                  href="/catalog"
                  prefetch={false}
                  className="py-2 px-2 text-xs font-medium text-neutral-500 hover:text-neutral-950 underline underline-offset-4 transition-colors"
                >
                  Reset
                </Link>
              )}
            </div>
          </div>
        </form>

        {/* Product Grid */}
        {catalog.products.length === 0 ? (
          <div className="py-16 text-center space-y-3 border-b border-neutral-200">
            <h2 className="text-base font-semibold text-neutral-950">
              No matching products
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
              Adjust your search terms or clear active filters to browse the
              full catalog.
            </p>
            {hasActiveFilters && (
              <div className="pt-2">
                <Link
                  href="/catalog"
                  prefetch={false}
                  className="inline-block px-5 py-2.5 rounded-md bg-neutral-950 text-white text-xs font-semibold"
                >
                  Clear All Filters
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            <section
              aria-label="Catalog products"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-7 sm:gap-y-12"
            >
              {catalog.products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  variant={showDealSavings ? "deal" : "default"}
                  eager={index < 4}
                />
              ))}
            </section>

            {/* Pagination Footer */}
            {catalog.totalPages > 1 && (
              <nav
                aria-label="Catalog pagination"
                className="pt-8 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <p className="text-xs text-neutral-500 tabular-nums">
                  Showing {startIndex}–{endIndex} of {catalog.totalCount}{" "}
                  products · Page {catalog.page} of {catalog.totalPages}
                </p>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {catalog.page > 1 ? (
                    <Link
                      href={buildCatalogHref(
                        paginationParams,
                        catalog.page - 1
                      )}
                      prefetch={false}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-neutral-200 hover:border-neutral-950 text-xs font-semibold text-neutral-900 transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Previous</span>
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-neutral-100 text-xs font-semibold text-neutral-300 cursor-not-allowed select-none">
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Previous</span>
                    </span>
                  )}

                  {pageNumbers.map((entry, idx) =>
                    entry === "ellipsis" ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-2 text-xs text-neutral-400 select-none"
                      >
                        …
                      </span>
                    ) : entry === catalog.page ? (
                      <span
                        key={entry}
                        aria-current="page"
                        className="min-w-8 h-8 px-2.5 inline-flex items-center justify-center rounded-md bg-neutral-950 text-white text-xs font-semibold tabular-nums"
                      >
                        {entry}
                      </span>
                    ) : (
                      <Link
                        key={entry}
                        href={buildCatalogHref(paginationParams, entry)}
                        prefetch={false}
                        className="min-w-8 h-8 px-2.5 inline-flex items-center justify-center rounded-md border border-neutral-200 hover:border-neutral-950 text-xs font-medium text-neutral-700 hover:text-neutral-950 tabular-nums transition-colors"
                      >
                        {entry}
                      </Link>
                    )
                  )}

                  {catalog.page < catalog.totalPages ? (
                    <Link
                      href={buildCatalogHref(
                        paginationParams,
                        catalog.page + 1
                      )}
                      prefetch={false}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-neutral-200 hover:border-neutral-950 text-xs font-semibold text-neutral-900 transition-colors"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-neutral-100 text-xs font-semibold text-neutral-300 cursor-not-allowed select-none">
                      <span>Next</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}
