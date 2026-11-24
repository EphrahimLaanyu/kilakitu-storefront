"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Truck, Package, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type CustomerOrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price_kes: number;
  line_total_kes: number;
  warranty_summary: string | null;
  serial_numbers?: string[];
};

type CustomerOrderRow = {
  id: string;
  order_number: string;
  delivery_code: string;
  payment_status: string;
  fulfillment_status: string;
  delivery_zone_name: string;
  total_kes: number;
  rider_or_courier_name: string | null;
  tracking_or_waybill_number: string | null;
  created_at: string;
  items: CustomerOrderItem[];
};

function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export default function MyOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<CustomerOrderRow[]>([]);

  const fetchOrdersForUser = useCallback(async (uid: string) => {
    const supabase = createClient();
    const { data: orderRows } = await supabase
      .from("orders")
      .select(
        "id, order_number, delivery_code, payment_status, fulfillment_status, delivery_zone_name, total_kes, rider_or_courier_name, tracking_or_waybill_number, created_at"
      )
      .eq("customer_user_id", uid)
      .order("created_at", { ascending: false });

    const list = orderRows ?? [];
    if (list.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const ids = list.map((o) => o.id);
    const { data: itemRows } = await supabase
      .from("order_items")
      .select(
        "id, order_id, product_name, quantity, unit_price_kes, line_total_kes, warranty_summary, serial_numbers"
      )
      .in("order_id", ids);

    const byOrder = new Map<string, CustomerOrderItem[]>();
    for (const item of itemRows ?? []) {
      const arr = byOrder.get(item.order_id) ?? [];
      arr.push(item);
      byOrder.set(item.order_id, arr);
    }

    setOrders(
      list.map((o) => ({
        ...o,
        items: byOrder.get(o.id) ?? [],
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      if (!user) {
        router.replace("/login?next=/orders");
        return;
      }
      setUserId(user.id);
      fetchOrdersForUser(user.id);
    });

    return () => {
      active = false;
    };
  }, [router, fetchOrdersForUser]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`customer-orders-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `customer_user_id=eq.${userId}`,
        },
        () => {
          fetchOrdersForUser(userId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
        },
        () => {
          fetchOrdersForUser(userId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_transactions",
        },
        () => {
          fetchOrdersForUser(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchOrdersForUser]);

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
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            <span>Live Order Updates</span>
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Updates automatically in real time as your payment, rider, or delivery status changes.
          </p>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-sm text-slate-500">
            Loading your orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
            <Package className="h-8 w-8 text-slate-400 mx-auto" />
            <h2 className="text-base font-bold text-slate-900">
              No orders yet
            </h2>
            <p className="text-xs text-slate-600">
              Once you place an order, it will appear here automatically.
            </p>
            <Link
              href="/"
              className="inline-block px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold"
            >
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <article
                key={order.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      {order.order_number}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      <KeyRound className="h-3.5 w-3.5" />
                      PIN: {order.delivery_code}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 capitalize">
                      {order.fulfillment_status.replaceAll("_", " ")}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                      Payment: {order.payment_status.replaceAll("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-teal-700" />
                      <span>{order.delivery_zone_name}</span>
                    </p>
                    {order.rider_or_courier_name && (
                      <p className="text-xs text-slate-600">
                        Rider / Courier:{" "}
                        <strong>{order.rider_or_courier_name}</strong>
                      </p>
                    )}
                    {order.tracking_or_waybill_number && (
                      <p className="text-xs text-slate-600">
                        Tracking / Waybill:{" "}
                        <strong>{order.tracking_or_waybill_number}</strong>
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="text-lg font-extrabold text-slate-900">
                      {formatKes(order.total_kes)}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs bg-white border border-slate-200 rounded-lg px-3 py-2"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {item.product_name} × {item.quantity}
                        </p>
                        {item.warranty_summary && (
                          <p className="text-[11px] text-slate-500">
                            {item.warranty_summary}
                          </p>
                        )}
                        {Array.isArray(item.serial_numbers) &&
                          item.serial_numbers.length > 0 && (
                            <p className="text-[11px] text-teal-700 font-medium">
                              IMEI / Serial: {item.serial_numbers.join(", ")}
                            </p>
                          )}
                      </div>
                      <span className="font-bold text-slate-900">
                        {formatKes(item.line_total_kes)}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}