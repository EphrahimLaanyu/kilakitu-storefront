"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  KeyRound,
  Truck,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type TrackedOrderItem = {
  product_name: string;
  quantity: number;
  unit_price_kes: number;
  line_total_kes: number;
  warranty_summary: string | null;
};

type TrackedOrderResult = {
  order_number: string;
  delivery_code: string;
  payment_status: string;
  fulfillment_status: string;
  delivery_zone_name: string;
  total_kes: number;
  rider_or_courier_name: string | null;
  tracking_or_waybill_number: string | null;
  created_at: string;
  items: TrackedOrderItem[];
};

function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrderResult | null>(null);

  async function handleTrack(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSearched(true);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("track_guest_order", {
        p_order_number: orderNumber.trim(),
        p_customer_phone: phone.trim(),
      });

      if (error) {
        setErrorMsg(error.message);
        setOrder(null);
        setLoading(false);
        return;
      }

      setOrder((data as TrackedOrderResult | null) ?? null);
      setLoading(false);
    } catch {
      setErrorMsg("Unable to look up order right now.");
      setOrder(null);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Catalog</span>
          </Link>
          <span className="text-xs font-semibold text-teal-700">
            Order Tracker
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Track Your Order
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your order number (e.g. KK-2611-1001) and the phone number
              used at checkout.
            </p>
          </div>

          <form
            onSubmit={handleTrack}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <input
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Order # (e.g. KK-...)"
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900"
            />
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-bold cursor-pointer"
            >
              <Search className="h-4 w-4" />
              <span>{loading ? "Checking..." : "Track Order"}</span>
            </button>
          </form>

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </section>

        {searched && !loading && !order && !errorMsg && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-600">
            No matching order found. Double-check your order number and phone
            number.
          </div>
        )}

        {order && (
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {order.order_number}
                </h2>
                <p className="text-xs text-slate-500">
                  Placed {new Date(order.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  <KeyRound className="h-3.5 w-3.5" />
                  Handover PIN: {order.delivery_code}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 capitalize">
                  {order.fulfillment_status.replaceAll("_", " ")}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                  Payment: {order.payment_status.replaceAll("_", " ")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Zone & Dispatch
                </p>
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-teal-700" />
                  <span>{order.delivery_zone_name}</span>
                </p>
                {order.rider_or_courier_name && (
                  <p className="text-xs text-slate-600">
                    Rider / Courier: <strong>{order.rider_or_courier_name}</strong>
                  </p>
                )}
                {order.tracking_or_waybill_number && (
                  <p className="text-xs text-slate-600">
                    Waybill / Tracking:{" "}
                    <strong>{order.tracking_or_waybill_number}</strong>
                  </p>
                )}
              </div>

              <div className="sm:text-right space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Order Total
                </p>
                <p className="text-xl font-extrabold text-slate-900">
                  {formatKes(order.total_kes)}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Items
              </p>
              {order.items.map((item, idx) => (
                <div
                  key={`${item.product_name}-${idx}`}
                  className="flex items-center justify-between text-sm bg-white border border-slate-200 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.product_name} × {item.quantity}
                    </p>
                    {item.warranty_summary && (
                      <p className="text-xs text-slate-500">
                        {item.warranty_summary}
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-slate-900">
                    {formatKes(item.line_total_kes)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}