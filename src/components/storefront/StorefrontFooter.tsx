import Link from "next/link";
import type { StorefrontStoreInfo } from "@/lib/db/storefront";

type StorefrontFooterProps = {
  store: StorefrontStoreInfo | null;
};

export function StorefrontFooter({ store }: StorefrontFooterProps) {
  const storeName = store?.name || "KilaKitu.co.ke";
  const pickupAddress = store?.pickup_address || "Nairobi CBD, Kenya";
  const phone = store?.phone || null;
  const whatsapp = store?.whatsapp_number || null;
  const openingHours =
    store?.opening_hours || "Mon – Sat · 8:30 AM – 6:30 PM";
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-neutral-200 text-neutral-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-12 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 pb-10">
          {/* Column 1: Brand Identity */}
          <div className="space-y-3.5">
            <Link
              href="/"
              prefetch={false}
              aria-label="KilaKitu Home"
              className="inline-flex items-center focus:outline-none"
            >
              <img
                src="/logo11.svg"
                alt="KilaKitu"
                width={748}
                height={238}
                loading="lazy"
                decoding="async"
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-neutral-500 leading-relaxed max-w-xs">
              Genuine electronics with verified manufacturer &amp; shop
              warranties, transparent KES pricing, and secure 4-digit handover
              PINs on every order.
            </p>
          </div>

          {/* Column 2: Navigation */}
          <div className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              Navigation
            </h2>
            <ul className="space-y-2.5 text-xs font-medium text-neutral-700">
              <li>
                <Link
                  href="/"
                  prefetch={false}
                  className="hover:text-[#C81E2B] transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/catalog"
                  prefetch={false}
                  className="hover:text-[#C81E2B] transition-colors"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/orders"
                  prefetch={false}
                  className="hover:text-[#C81E2B] transition-colors"
                >
                  My Orders
                </Link>
              </li>
              <li>
                <Link
                  href="/policies"
                  prefetch={false}
                  className="hover:text-[#C81E2B] transition-colors"
                >
                  Policies
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Pickup & Contact */}
          <div className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              Store &amp; Pickup
            </h2>
            <dl className="space-y-2 text-xs text-neutral-600 leading-relaxed">
              <div>
                <dt className="sr-only">Pickup address</dt>
                <dd className="text-neutral-900 font-medium">
                  {pickupAddress}
                </dd>
              </div>

              {phone && (
                <div>
                  <dt className="inline text-neutral-400">Phone: </dt>
                  <dd className="inline tabular-nums">
                    <a
                      href={`tel:${phone.replace(/\s+/g, "")}`}
                      className="text-neutral-800 hover:text-[#C81E2B] transition-colors"
                    >
                      {phone}
                    </a>
                  </dd>
                </div>
              )}

              {whatsapp && (
                <div>
                  <dt className="inline text-neutral-400">WhatsApp: </dt>
                  <dd className="inline tabular-nums text-neutral-800">
                    {whatsapp}
                  </dd>
                </div>
              )}

              <div>
                <dt className="inline text-neutral-400">Hours: </dt>
                <dd className="inline text-neutral-600">{openingHours}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Bottom Copyright Hairline Bar */}
        <div className="pt-6 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-neutral-400">
          <p className="tabular-nums">
            &copy; {currentYear} {storeName}. All rights reserved.
          </p>
          <p className="text-neutral-500">
            <span className="text-[#D4A024]">●</span> Genuine Tech · Verified
            Warranty · Safe Handover PIN
          </p>
        </div>
      </div>
    </footer>
  );
}
