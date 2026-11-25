import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  getActiveStoreBySlug,
  getHomepageCuratedSections,
} from "@/lib/db/storefront";
import { ProductCard } from "@/components/storefront/ProductCard";

export const revalidate = 30;

export default async function StorefrontHomePage() {
  const storeSlug =
    process.env.NEXT_PUBLIC_STORE_SLUG || "kilakitu-electronics";

  const store = await getActiveStoreBySlug(storeSlug);

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

  const { featured, hottestDeals, newArrivals } =
    await getHomepageCuratedSections(store.id, {
      featured: 8,
      deals: 8,
      arrivals: 8,
    });

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

      {/* Curated Homepage Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-20 space-y-14">
        {/* Minimal Editorial Intro Header */}
        <section className="pb-8 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C81E2B]">
              {store.name}
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 leading-tight">
              Genuine tech, verified warranties, transparent pricing.
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs shrink-0">
            <Link
              href="/catalog"
              prefetch={false}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-neutral-950 hover:bg-[#C81E2B] text-white font-semibold tracking-wide transition-colors"
            >
              <span>Browse Full Catalog</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/catalog?deals=1&sort=deals"
              prefetch={false}
              className="font-semibold text-neutral-700 hover:text-[#C81E2B] underline underline-offset-4 transition-colors"
            >
              Shop Deals
            </Link>
          </div>
        </section>

        {/* Section 1: Featured */}
        {featured.length > 0 && (
          <section aria-labelledby="section-featured" className="space-y-6">
            <div className="flex items-end justify-between gap-4 pb-4 border-b border-neutral-200">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#D4A024]">
                  Curated Picks
                </p>
                <h2
                  id="section-featured"
                  className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-950"
                >
                  Featured
                </h2>
              </div>
              <Link
                href="/catalog?featured=1&sort=featured"
                prefetch={false}
                className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-[#C81E2B] transition-colors shrink-0"
              >
                <span>View all</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {featured.map((product, index) => (
                <div
                  key={product.id}
                  className="w-[220px] sm:w-[248px] lg:w-[272px] shrink-0 snap-start"
                >
                  <ProductCard product={product} eager={index < 4} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 2: Hottest Deals */}
        {hottestDeals.length > 0 && (
          <section aria-labelledby="section-deals" className="space-y-6">
            <div className="flex items-end justify-between gap-4 pb-4 border-b border-neutral-200">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#C81E2B]">
                  Biggest Price Drops
                </p>
                <h2
                  id="section-deals"
                  className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-950"
                >
                  Hottest Deals
                </h2>
              </div>
              <Link
                href="/catalog?deals=1&sort=deals"
                prefetch={false}
                className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-[#C81E2B] transition-colors shrink-0"
              >
                <span>View all</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {hottestDeals.map((product, index) => (
                <div
                  key={product.id}
                  className="w-[220px] sm:w-[248px] lg:w-[272px] shrink-0 snap-start"
                >
                  <ProductCard
                    product={product}
                    variant="deal"
                    eager={featured.length === 0 && index < 4}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: New Arrivals */}
        {newArrivals.length > 0 && (
          <section aria-labelledby="section-arrivals" className="space-y-6">
            <div className="flex items-end justify-between gap-4 pb-4 border-b border-neutral-200">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Just Landed
                </p>
                <h2
                  id="section-arrivals"
                  className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-950"
                >
                  New Arrivals
                </h2>
              </div>
              <Link
                href="/catalog?sort=newest"
                prefetch={false}
                className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-[#C81E2B] transition-colors shrink-0"
              >
                <span>View all</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {newArrivals.map((product) => (
                <div
                  key={product.id}
                  className="w-[220px] sm:w-[248px] lg:w-[272px] shrink-0 snap-start"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Editorial Catalog CTA Strip */}
        <section className="pt-10 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-neutral-950">
              Looking for something specific?
            </p>
            <p className="text-xs text-neutral-500">
              Filter by brand, category, budget, or availability in our full
              catalog.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs shrink-0">
            <Link
              href="/catalog"
              prefetch={false}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md border border-neutral-300 hover:border-neutral-950 text-neutral-950 font-semibold transition-colors"
            >
              <span>View Full Catalog</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
