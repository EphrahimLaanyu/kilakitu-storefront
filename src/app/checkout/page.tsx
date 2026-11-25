"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isGoogleUser } from "@/lib/auth/profile";
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
  const activeUserIdRef = useRef<string | null>(null);

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
    const supabase = createClient();

    function resetUserSpecificState() {
      activeUserIdRef.current = null;
      setUserEmail(null);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerWhatsapp("");
      setDeliveryLandmark("");
      setDeliveryNotes("");
      setCreatedOrder(null);
      setErrorMsg(null);
    }

    async function loadUserProfile(user: {
      id: string;
      email?: string | null;
      app_metadata?: Record<string, unknown>;
      identities?: Array<{ provider: string }>;
      user_metadata?: Record<string, unknown>;
    }): Promise<boolean> {
      const switchedAccount =
        activeUserIdRef.current !== null && activeUserIdRef.current !== user.id;
      activeUserIdRef.current = user.id;

      if (switchedAccount) {
        setCustomerWhatsapp("");
        setDeliveryLandmark("");
        setDeliveryNotes("");
        setCreatedOrder(null);
        setErrorMsg(null);
      }

      setUserEmail(user.email ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, email")
        .eq("id", user.id)
        .maybeSingle();

      if (!active || activeUserIdRef.current !== user.id) return false;

      if (
        isGoogleUser(user as Parameters<typeof isGoogleUser>[0]) &&
        !profile?.phone?.trim()
      ) {
        router.replace("/signup?mode=complete&next=%2Fcheckout");
        return false;
      }

      const metaFullName =
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : "";
      const metaPhone =
        typeof user.user_metadata?.phone === "string"
          ? user.user_metadata.phone
          : "";

      setCustomerName(profile?.full_name?.trim() || metaFullName.trim() || "");
      setCustomerPhone(profile?.phone?.trim() || metaPhone.trim() || "");
      return true;
    }

    async function initCheckout() {
      let redirected = false;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (active) {
            resetUserSpecificState();
          }
          redirected = true;
          router.replace("/login?next=%2Fcheckout");
          return;
        }

        if (!active) return;
        const canContinue = await loadUserProfile(user);
        if (!canContinue || !active) {
          redirected = true;
          return;
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
        if (active && !redirected) {
          setLoadingZones(false);
          setAuthChecked(true);
        }
      }
    }

    void initCheckout();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        resetUserSpecificState();
        setAuthChecked(false);
        router.replace("/login?next=%2Fcheckout");
        return;
      }

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        window.setTimeout(() => {
          if (!active) return;
          void supabase.auth.getUser().then(({ data: { user } }) => {
            if (!active) return;
            if (!user) {
              resetUserSpecificState();
              setAuthChecked(false);
              router.replace("/login?next=%2Fcheckout");
              return;
            }
            if (activeUserIdRef.current !== user.id || event === "USER_UPDATED") {
              void loadUserProfile(user);
            }
          });
        }, 0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
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

  async function startPaystackCheckout(orderId: string) {
    const res = await fetch("/api/payments/paystack/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        callback_url: `${window.location.origin}/orders`,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json?.authorization_url) {
      throw new Error(json?.error || "Could not start Paystack payment.");
    }

    clearCart();
    window.location.href = json.authorization_url;
  }

  async function handlePlaceOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    if (!storeId) {
      setErrorMsg("Store configuration could not be loaded.");
      return;
    }
    if (items.length === 0) {
      setErrorMsg("Your cart is empty.");
      return;
    }
    if (!selectedZoneId) {
      setErrorMsg("Please select a delivery or pickup zone.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSubmitting(false);
        router.replace("/login?next=%2Fcheckout");
        return;
      }

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

      const summary = data as CreatedOrderSummary;

      if (paymentMethod === "mpesa_stk") {
        await startPaystackCheckout(summary.order_id);
        return;
      }

      setCreatedOrder(summary);
      clearCart();
      setSubmitting(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Unexpected error placing order. Please try again."
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Catalog</span>
          </Link>
          <span className="text-xs font-semibold text-[#C81E2B]">
            Checkout • {storeName}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {!authChecked ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500 max-w-md mx-auto">
            Checking account session...
          </div>
        ) : createdOrder ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto space-y-5">
            <div className="flex items-center gap-3 text-emerald-700">
              <CheckCircle2 className="h-7 w-7 shrink-0" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Order Placed Successfully!
                </h1>
                <p className="text-xs text-slate-600">
                  Saved to your account for {storeName}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Order Number
                </p>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {createdOrder.order_number}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  4-Digit Handover PIN
                </p>
                <p className="inline-flex items-center gap-1.5 text-lg font-extrabold text-neutral-900 mt-0.5">
                  <KeyRound className="h-4 w-4 text-[#C81E2B]" />
                  <span>{createdOrder.delivery_code}</span>
                </p>
              </div>
            </div>

            <div className="text-sm space-y-1.5 border-t border-slate-100 pt-4">
              <div className="flex justify-between text-base font-extrabold text-slate-900">
                <span>Total</span>
                <span>{formatKes(createdOrder.total_kes)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/orders"
                className="px-4 py-2.5 rounded-xl bg-[#C81E2B] hover:bg-[#A61621] text-white text-xs font-bold"
              >
                View My Orders
              </Link>
              <Link
                href="/"
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-lg mx-auto space-y-3">
            <h1 className="text-lg font-bold text-slate-900">
              Your cart is empty
            </h1>
            <p className="text-sm text-slate-600">
              Add at least one item to your cart before checking out.
            </p>
            <Link
              href="/"
              className="inline-block px-4 py-2.5 rounded-xl bg-[#C81E2B] text-white text-xs font-bold"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={handlePlaceOrder}
              className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
            >
              <div>
                <h1 className="text-xl font-bold text-slate-900">Checkout</h1>
                {userEmail && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Signed in as <strong>{userEmail}</strong>
                  </p>
                )}
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Brian Otieno"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. +254712345678"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    WhatsApp Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={customerWhatsapp}
                    onChange={(e) => setCustomerWhatsapp(e.target.value)}
                    placeholder="Same as phone if blank"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery / Pickup Zone *
                  </label>
                  <select
                    required
                    disabled={loadingZones}
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({formatKes(z.fee_kes)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedZone && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700 space-y-1">
                  <p className="font-semibold text-slate-900">
                    {selectedZone.name} • {selectedZone.estimated_delivery_text}
                  </p>
                  {selectedZone.cutoff_time_text && (
                    <p className="text-slate-500">
                      {selectedZone.cutoff_time_text}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Landmark / Building / Estate
                </label>
                <input
                  type="text"
                  value={deliveryLandmark}
                  onChange={(e) => setDeliveryLandmark(e.target.value)}
                  placeholder="e.g. Kilimani, Yaya Centre side, Apartment B4"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900"
                >
                  <option value="mpesa_stk">
                    Pay Online via Paystack (M-Pesa / Card)
                  </option>
                  <option value="pay_on_delivery">Pay on Delivery</option>
                  <option value="pay_on_pickup">Pay at Shop Pickup</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Any helpful instructions for rider or shop staff..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || items.length === 0}
                className="w-full py-3 rounded-xl bg-[#C81E2B] hover:bg-[#A61621] disabled:opacity-60 text-white text-sm font-bold transition cursor-pointer"
              >
                {submitting
                  ? "Processing..."
                  : paymentMethod === "mpesa_stk"
                  ? `Pay via Paystack • ${formatKes(totalKes)}`
                  : `Place Order • ${formatKes(totalKes)}`}
              </button>
            </form>

            <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 h-fit">
              <h2 className="text-base font-bold text-slate-900">
                Order Summary
              </h2>

              <div className="divide-y divide-slate-100 text-sm">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} × {formatKes(item.priceKes)}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900 shrink-0">
                      {formatKes(item.quantity * item.priceKes)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatKes(subtotalKes)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Zone Fee</span>
                  <span>{formatKes(deliveryFeeKes)}</span>
                </div>
                {bulkySurchargeKes > 0 && (
                  <div className="flex justify-between text-amber-800">
                    <span>Bulky Item Surcharge</span>
                    <span>{formatKes(bulkySurchargeKes)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total Payable</span>
                  <span>{formatKes(totalKes)}</span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-[#C81E2B] shrink-0 mt-0.5" />
                <span>
                  Order totals are verified on the server and confirmed via
                  Paystack webhook.
                </span>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}