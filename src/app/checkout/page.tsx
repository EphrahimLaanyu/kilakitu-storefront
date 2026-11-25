"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/components/storefront/CartContext";
import type { StorefrontDeliveryZone } from "@/lib/db/storefront";

function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

type CreatedOrderSummary = {
  order_id: string;
  order_number: string;
  delivery_code: string;
  subtotal_kes: number;
  delivery_fee_kes: number;
  bulky_surcharge_kes: number;
  total_kes: number;
  payment_status: string;
  fulfillment_status: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotalKes, hasBulkyItem, clearCart } = useCart();

  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("KilaKitu Electronics");
  const [zones, setZones] = useState<StorefrontDeliveryZone[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [deliveryLandmark, setDeliveryLandmark] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "mpesa_stk" | "pay_on_delivery" | "pay_on_pickup"
  >("mpesa_stk");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrderSummary | null>(
    null
  );

  useEffect(() => {
    let active = true;
    async function initCheckout() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login?next=/checkout");
          return;
        }

        if (!active) return;
        setUserEmail(user.email ?? null);

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone, email")
          .eq("id", user.id)
          .single();

        if (profile && active) {
          if (profile.full_name) setCustomerName(profile.full_name);
          if (profile.phone) setCustomerPhone(profile.phone);
        }

        const storeSlug =
          process.env.NEXT_PUBLIC_STORE_SLUG || "kilakitu-electronics";

        const { data: store } = await supabase
          .from("stores")
          .select("id, name")
          .eq("slug", storeSlug)
          .eq("is_active", true)
          .single();

        if (!store || !active) {
          setLoadingZones(false);
          setAuthChecked(true);
          return;
        }

        setStoreId(store.id);
        setStoreName(store.name);

        const { data: zoneRows } = await supabase
          .from("delivery_zones")
          .select(
            "id, name, description, fulfillment_type, fee_kes, bulky_surcharge_kes, estimated_delivery_text, cutoff_time_text"
          )
          .eq("store_id", store.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (!active) return;
        const list = (zoneRows ?? []) as StorefrontDeliveryZone[];
        setZones(list);
        if (list.length > 0) {
          setSelectedZoneId(list[0].id);
        }
      } finally {
        if (active) {
          setLoadingZones(false);
          setAuthChecked(true);
        }
      }
    }

    initCheckout();
    return () => {
      active = false;
    };
  }, [router]);

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === selectedZoneId) ?? null,
    [zones, selectedZoneId]
  );

  const deliveryFeeKes = selectedZone?.fee_kes ?? 0;
  const bulkySurchargeKes =
    hasBulkyItem && selectedZone ? selectedZone.bulky_surcharge_kes : 0;
  const totalKes = subtotalKes + deliveryFeeKes + bulkySurchargeKes;

  async function handlePlaceOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    if (!storeId) {
      setErrorMsg("Store configuration could not be loaded.");
      return;
    }
    if (items.length === 0) {
      setErrorMsg("Your bag is empty.");
      return;
    }
    if (!selectedZoneId) {
      setErrorMsg("Please select a delivery or pickup zone.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const payloadItems = items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      }));

      const { data, error } = await supabase.rpc("create_guest_order", {
        p_store_id: storeId,
        p_customer_name: customerName.trim(),
        p_customer_phone: customerPhone.trim(),
        p_delivery_zone_id: selectedZoneId,
        p_delivery_landmark: deliveryLandmark.trim(),
        p_items: payloadItems,
        p_customer_whatsapp: customerWhatsapp.trim() || null,
        p_customer_email: userEmail,
        p_delivery_notes: deliveryNotes.trim() || null,
        p_payment_method: paymentMethod,
      });

      if (error) {
        setErrorMsg(error.message);
        setSubmitting(false);
        return;
      }

      setCreatedOrder(data as CreatedOrderSummary);
      clearCart();
      setSubmitting(false);
    } catch {
      setErrorMsg("Unexpected error placing order. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 pb-20">
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-neutral-200 text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-medium text-neutral-600 hover:text-neutral-950 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Catalog</span>
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            {storeName}
          </span>
        </div>

        {!authChecked ? (
          <div className="py-16 text-center text-sm text-neutral-500">
            Verifying account session...
          </div>
        ) : createdOrder ? (
          <div className="max-w-2xl mx-auto pt-10 space-y-6">
            <div className="border-b border-neutral-200 pb-5 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C81E2B]">
                Order Confirmed
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950">
                Thank you for your order
              </h1>
              <p className="text-xs text-neutral-500">
                Recorded under {storeName} and linked to your account.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 border border-neutral-200">
              <div className="p-5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  Order Number
                </p>
                <p className="text-lg font-semibold text-neutral-950 mt-1 tabular-nums">
                  {createdOrder.order_number}
                </p>
              </div>
              <div className="p-5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  4-Digit Handover PIN
                </p>
                <p className="text-lg font-semibold text-[#C81E2B] mt-1 tabular-nums tracking-widest">
                  {createdOrder.delivery_code}
                </p>
              </div>
            </div>

            <div className="divide-y divide-neutral-100 border-t border-b border-neutral-200 text-xs sm:text-sm">
              <div className="py-3 flex justify-between text-neutral-600">
                <span>Items Subtotal</span>
                <span className="tabular-nums text-neutral-950">
                  {formatKes(createdOrder.subtotal_kes)}
                </span>
              </div>
              <div className="py-3 flex justify-between text-neutral-600">
                <span>Delivery Zone Fee</span>
                <span className="tabular-nums text-neutral-950">
                  {formatKes(createdOrder.delivery_fee_kes)}
                </span>
              </div>
              {createdOrder.bulky_surcharge_kes > 0 && (
                <div className="py-3 flex justify-between text-neutral-700">
                  <span>Bulky Item Surcharge</span>
                  <span className="tabular-nums text-neutral-950">
                    {formatKes(createdOrder.bulky_surcharge_kes)}
                  </span>
                </div>
              )}
              <div className="py-3.5 flex justify-between text-sm sm:text-base font-semibold text-neutral-950">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatKes(createdOrder.total_kes)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/orders"
                className="py-3 px-5 rounded-md bg-[#C81E2B] hover:bg-[#A61621] text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                View My Orders
              </Link>
              <Link
                href="/"
                className="py-3 px-4 text-xs sm:text-sm font-medium text-neutral-600 hover:text-neutral-950 underline underline-offset-4"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto space-y-4">
            <h1 className="text-xl font-semibold text-neutral-950">
              Your shopping bag is empty
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500">
              Add items to your bag before proceeding to checkout.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-block py-3 px-5 rounded-md bg-neutral-950 text-white text-xs font-semibold"
              >
                Browse Catalog
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pt-8">
            <form
              onSubmit={handlePlaceOrder}
              className="lg:col-span-7 space-y-6"
            >
              <div className="border-b border-neutral-200 pb-4">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950">
                  Checkout
                </h1>
                {userEmail && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Account: <span className="text-neutral-900">{userEmail}</span>
                  </p>
                )}
              </div>

              {errorMsg && (
                <div className="border-l-2 border-[#C81E2B] bg-neutral-50 px-4 py-3 text-xs text-[#C81E2B] font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Brian Otieno"
                    className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+254712345678"
                    className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    WhatsApp (Optional)
                  </label>
                  <input
                    type="tel"
                    value={customerWhatsapp}
                    onChange={(e) => setCustomerWhatsapp(e.target.value)}
                    placeholder="Same as phone if blank"
                    className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    Delivery / Pickup Zone
                  </label>
                  <select
                    required
                    disabled={loadingZones}
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm font-medium text-neutral-950 focus:outline-none"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} — {formatKes(z.fee_kes)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedZone && (
                <div className="border-t border-b border-neutral-100 py-3.5 text-xs text-neutral-600 space-y-1">
                  <p className="font-medium text-neutral-950">
                    {selectedZone.name} • {selectedZone.estimated_delivery_text}
                  </p>
                  {selectedZone.cutoff_time_text && (
                    <p>{selectedZone.cutoff_time_text}</p>
                  )}
                  {hasBulkyItem && selectedZone.bulky_surcharge_kes > 0 && (
                    <p className="text-neutral-800">
                      Bulky item surcharge:{" "}
                      <span className="font-semibold tabular-nums">
                        {formatKes(selectedZone.bulky_surcharge_kes)}
                      </span>
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  Delivery Landmark / Estate / Building
                </label>
                <input
                  type="text"
                  value={deliveryLandmark}
                  onChange={(e) => setDeliveryLandmark(e.target.value)}
                  placeholder="Kilimani, Yaya Centre side, Apartment B4"
                  className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(
                      e.target.value as
                        | "mpesa_stk"
                        | "pay_on_delivery"
                        | "pay_on_pickup"
                    )
                  }
                  className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm font-medium text-neutral-950 focus:outline-none"
                >
                  <option value="mpesa_stk">M-Pesa</option>
                  <option value="pay_on_delivery">Pay on Delivery</option>
                  <option value="pay_on_pickup">Pay at Shop Pickup</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  Delivery Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Instructions for rider or shop handover"
                  className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || items.length === 0}
                className="w-full py-3.5 px-5 rounded-md bg-[#C81E2B] hover:bg-[#A61621] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold tracking-wide transition-colors cursor-pointer tabular-nums"
              >
                {submitting
                  ? "Placing Order..."
                  : `Place Order • ${formatKes(totalKes)}`}
              </button>
            </form>

            {/* Summary Column */}
            <aside className="lg:col-span-5 lg:border-l lg:border-neutral-200 lg:pl-10 space-y-6 h-fit">
              <div className="border-b border-neutral-200 pb-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Order Summary
                </h2>
              </div>

              <div className="divide-y divide-neutral-100 text-xs sm:text-sm">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="py-3.5 flex items-baseline justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-950 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-neutral-500 tabular-nums">
                        {item.quantity} × {formatKes(item.priceKes)}
                      </p>
                    </div>
                    <span className="font-semibold text-neutral-950 tabular-nums shrink-0">
                      {formatKes(item.quantity * item.priceKes)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-200 pt-4 space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums text-neutral-950">
                    {formatKes(subtotalKes)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Delivery Fee</span>
                  <span className="tabular-nums text-neutral-950">
                    {formatKes(deliveryFeeKes)}
                  </span>
                </div>
                {bulkySurchargeKes > 0 && (
                  <div className="flex justify-between text-neutral-700">
                    <span>Bulky Item Surcharge</span>
                    <span className="tabular-nums text-neutral-950">
                      {formatKes(bulkySurchargeKes)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm sm:text-base font-semibold text-neutral-950 pt-3 border-t border-neutral-200">
                  <span>Total Payable</span>
                  <span className="tabular-nums">{formatKes(totalKes)}</span>
                </div>
              </div>

              <p className="text-xs text-neutral-500 leading-relaxed border-t border-neutral-100 pt-4">
                Pricing, stock availability, and your 4-digit handover PIN are
                issued upon order confirmation.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}