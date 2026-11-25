export default function StorefrontHomeLoading() {
  return (
    <main className="bg-white min-h-screen" aria-busy="true">
      {/* Value Strip Skeleton */}
      <div className="border-b border-neutral-200 bg-neutral-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="h-3.5 w-64 bg-neutral-200/70 rounded animate-pulse" />
          <div className="hidden md:block h-3.5 w-44 bg-neutral-200/70 rounded animate-pulse" />
        </div>
      </div>

      {/* Curated Homepage Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-20 space-y-14">
        <div className="pb-8 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="space-y-2">
            <div className="h-3 w-28 bg-neutral-100 rounded animate-pulse" />
            <div className="h-8 w-80 max-w-full bg-neutral-100 rounded animate-pulse" />
          </div>
          <div className="h-9 w-40 bg-neutral-100 rounded-md animate-pulse" />
        </div>

        {Array.from({ length: 2 }).map((_, sectionIdx) => (
          <section key={sectionIdx} className="space-y-6">
            <div className="flex items-end justify-between gap-4 pb-4 border-b border-neutral-200">
              <div className="space-y-1.5">
                <div className="h-2.5 w-20 bg-neutral-100 rounded animate-pulse" />
                <div className="h-6 w-36 bg-neutral-100 rounded animate-pulse" />
              </div>
              <div className="h-4 w-16 bg-neutral-100 rounded animate-pulse" />
            </div>

            <div className="flex gap-4 sm:gap-6 overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="w-[220px] sm:w-[248px] lg:w-[272px] shrink-0 flex flex-col justify-between"
                >
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
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
