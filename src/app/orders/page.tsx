"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
    <main className="bg-white min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 pb-20 space-y-8">
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-neutral-200 text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-medium text-neutral-600 hover:text-neutral-950 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Catalog</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-neutral-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            <span>Live status</span>
          </span>
        </div>

        <div className="border-b border-neutral-200 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C81E2B]">
            Account History
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 mt-1">
            My Orders
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Handover PINs, fulfillment progress, dispatch tracking, and warranty
            records.
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-sm text-neutral-500">
            Loading your orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center border-b border-neutral-200 space-y-3">
            <h2 className="text-base font-semibold text-neutral-950">
              No orders yet
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Your orders and handover PINs will appear here once placed.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-block py-2.5 px-5 rounded-md bg-neutral-950 text-white text-xs font-semibold"
              >
                Browse Catalog
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 border-t border-b border-neutral-200">
            {orders.map((order) => (
              <article key={order.id} className="py-7 space-y-5">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-neutral-950 tabular-nums">
                      {order.order_number}
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
                    <span className="font-semibold text-[#C81E2B] tabular-nums">
                      PIN: {order.delivery_code}
                    </span>
                    <span className="text-neutral-700 capitalize">
                      {order.fulfillment_status.replaceAll("_", " ")}
                    </span>
                    <span className="text-neutral-500 capitalize">
                      Payment: {order.payment_status.replaceAll("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-4 text-xs sm:text-sm">
                  <div className="space-y-1">
                    <p className="font-medium text-neutral-950">
                      {order.delivery_zone_name}
                    </p>
                    {order.rider_or_courier_name && (
                      <p className="text-xs text-neutral-600">
                        Courier / Rider:{" "}
                        <span className="font-medium text-neutral-900">
                          {order.rider_or_courier_name}
                        </span>
                      </p>
                    )}
                    {order.tracking_or_waybill_number && (
                      <p className="text-xs text-neutral-600">
                        Waybill / Tracking:{" "}
                        <span className="font-medium text-neutral-900 tabular-nums">
                          {order.tracking_or_waybill_number}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-neutral-400">
                      Total
                    </p>
                    <p className="text-base sm:text-lg font-semibold text-neutral-950 tabular-nums">
                      {formatKes(order.total_kes)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-neutral-100 divide-y divide-neutral-100">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 flex items-baseline justify-between gap-4 text-xs sm:text-sm"
                    >
                      <div className="space-y-0.5">
                        <p className="font-medium text-neutral-950">
                          {item.product_name}{" "}
                          <span className="text-neutral-500 tabular-nums">
                            × {item.quantity}
                          </span>
                        </p>
                        {item.warranty_summary && (
                          <p className="text-xs text-neutral-500">
                            {item.warranty_summary}
                          </p>
                        )}
                        {Array.isArray(item.serial_numbers) &&
                          item.serial_numbers.length > 0 && (
                            <p className="text-xs text-neutral-700 tabular-nums">
                              Serial / IMEI: {item.serial_numbers.join(", ")}
                            </p>
                          )}
                      </div>
                      <span className="font-medium text-neutral-950 tabular-nums shrink-0">
                        {formatKes(item.line_total_kes)}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}