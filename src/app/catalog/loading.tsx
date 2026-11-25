export default function CatalogLoading() {
  return (
    <main className="bg-white min-h-screen" aria-busy="true">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-20 space-y-8">
        {/* Page Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-neutral-200">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-neutral-100 rounded animate-pulse" />
            <div className="h-8 w-48 bg-neutral-100 rounded animate-pulse" />
          </div>
          <div className="h-3.5 w-32 bg-neutral-100 rounded animate-pulse" />
        </div>

        {/* Filter Bar Skeleton */}
        <div className="space-y-5 pb-6 border-b border-neutral-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-4 items-end">
            <div className="col-span-2 sm:col-span-3 lg:col-span-3 h-12 bg-neutral-100 rounded animate-pulse" />
            <div className="col-span-1 lg:col-span-2 h-12 bg-neutral-100 rounded animate-pulse" />
            <div className="col-span-1 lg:col-span-2 h-12 bg-neutral-100 rounded animate-pulse" />
            <div className="col-span-1 lg:col-span-2 h-12 bg-neutral-100 rounded animate-pulse" />
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 h-12 bg-neutral-100 rounded animate-pulse" />
          </div>
        </div>

        {/* Product Grid Skeleton */}
        <section
          aria-label="Loading catalog"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-7 sm:gap-y-12"
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex flex-col justify-between">
              <div>
                <div className="aspect-square bg-neutral-100 border border-neutral-200/70 animate-pulse" />
                <div className="pt-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-3 w-16 bg-neutral-100 rounded animate-pulse" />
                    <div className="h-3 w-14 bg-neutral-100 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-full bg-neutral-100 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-neutral-100 rounded animate-pulse" />
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-neutral-100 space-y-3">
                <div className="h-5 w-24 bg-neutral-100 rounded animate-pulse" />
                <div className="h-8 w-full bg-neutral-100 rounded-md animate-pulse" />
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
