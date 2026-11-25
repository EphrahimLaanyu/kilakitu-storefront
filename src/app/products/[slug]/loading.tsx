export default function ProductDetailLoading() {
  return (
    <main className="bg-white min-h-screen" aria-busy="true">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-20">
        {/* Top Back Link Skeleton */}
        <div className="pb-5 border-b border-neutral-200">
          <div className="h-4 w-28 bg-neutral-100 rounded animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-8">
          {/* Gallery Column Skeleton */}
          <div className="lg:col-span-7 space-y-4">
            <div className="aspect-square bg-neutral-100 border border-neutral-200/80 animate-pulse" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square bg-neutral-100 border border-neutral-200/80 animate-pulse"
                />
              ))}
            </div>
          </div>

          {/* Details Column Skeleton */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="h-3.5 w-20 bg-neutral-100 rounded animate-pulse" />
                <div className="h-3.5 w-16 bg-neutral-100 rounded animate-pulse" />
              </div>
              <div className="h-8 w-11/12 bg-neutral-100 rounded animate-pulse" />
              <div className="h-8 w-2/3 bg-neutral-100 rounded animate-pulse" />
              <div className="pt-1">
                <div className="h-8 w-36 bg-neutral-100 rounded animate-pulse" />
              </div>
              <div className="space-y-2 pt-1">
                <div className="h-3.5 w-full bg-neutral-100 rounded animate-pulse" />
                <div className="h-3.5 w-4/5 bg-neutral-100 rounded animate-pulse" />
              </div>
            </div>

            <div className="h-12 w-full bg-neutral-100 rounded-md animate-pulse" />

            {/* Collapsed Sections Hairlines Skeleton */}
            <div className="border-t border-b border-neutral-200 divide-y divide-neutral-200">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="py-4 flex items-center justify-between"
                >
                  <div className="h-3.5 w-36 bg-neutral-100 rounded animate-pulse" />
                  <div className="h-4 w-4 bg-neutral-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
