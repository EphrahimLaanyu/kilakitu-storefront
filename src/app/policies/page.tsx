import Link from "next/link";
import { ArrowLeft, ShieldCheck, MapPin, Phone, Clock } from "lucide-react";
import {
  getActiveStoreBySlug,
  getPublishedStorePolicies,
} from "@/lib/db/storefront";

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  const storeSlug =
    process.env.NEXT_PUBLIC_STORE_SLUG || "kilakitu-electronics";
  const store = await getActiveStoreBySlug(storeSlug);
  const policies = store ? await getPublishedStorePolicies(store.id) : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Catalog</span>
          </Link>
          <span className="text-xs font-semibold text-teal-700">
            Policies & Pickup Info
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {store && (
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-teal-700">
              <ShieldCheck className="h-5 w-5" />
              <h1 className="text-xl font-bold text-slate-900">
                {store.name} — Shop Information & Policies
              </h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{store.pickup_address}</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Phone: {store.phone}
                  <br />
                  WhatsApp: {store.whatsapp_number}
                </span>
              </div>
              {store.opening_hours && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{store.opening_hours}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {policies.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-sm text-slate-600">
            No published policies yet. You can add and publish Returns, Warranty,
            and Delivery policies from your Admin Panel under Zones & Policies.
          </div>
        ) : (
          <div className="space-y-4">
            {policies.map((policy) => (
              <article
                key={policy.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2"
              >
                <h2 className="text-lg font-bold text-slate-900">
                  {policy.title}
                </h2>
                <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {policy.content_markdown}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
