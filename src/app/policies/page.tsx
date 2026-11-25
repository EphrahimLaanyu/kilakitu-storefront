import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getActiveStoreBySlug,
  getPublishedStorePolicies,
} from "@/lib/db/storefront";

export const revalidate = 60;

export default async function StorefrontPoliciesPage() {
  const storeSlug =
    process.env.NEXT_PUBLIC_STORE_SLUG || "kilakitu-electronics";
  const store = await getActiveStoreBySlug(storeSlug);
  const policies = store ? await getPublishedStorePolicies(store.id) : [];

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-6 pb-20 space-y-8">
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-neutral-200 text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-medium text-neutral-600 hover:text-neutral-950 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Catalog</span>
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Policies & Shop Info
          </span>
        </div>

        {store && (
          <section className="border-b border-neutral-200 pb-6 space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C81E2B]">
                {store.name}
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 mt-1">
                Store Policies & Pickup Details
              </h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs text-neutral-600">
              <div>
                <p className="font-medium uppercase tracking-wider text-neutral-400 text-[10px]">
                  Pickup Location
                </p>
                <p className="text-neutral-900 mt-1">{store.pickup_address}</p>
              </div>
              <div>
                <p className="font-medium uppercase tracking-wider text-neutral-400 text-[10px]">
                  Contact
                </p>
                <p className="text-neutral-900 mt-1">
                  {store.phone}
                  <br />
                  WhatsApp: {store.whatsapp_number}
                </p>
              </div>
              {store.opening_hours && (
                <div>
                  <p className="font-medium uppercase tracking-wider text-neutral-400 text-[10px]">
                    Hours
                  </p>
                  <p className="text-neutral-900 mt-1">{store.opening_hours}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {policies.length === 0 ? (
          <div className="py-12 text-sm text-neutral-500">
            Published store policies will appear here once added.
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 border-b border-neutral-200">
            {policies.map((policy) => (
              <article key={policy.id} className="py-7 space-y-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  {policy.policy_type}
                </p>
                <h2 className="text-lg sm:text-xl font-semibold text-neutral-950">
                  {policy.title}
                </h2>
                <div className="text-sm text-neutral-700 whitespace-pre-line leading-relaxed pt-1">
                  {policy.content_markdown}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}