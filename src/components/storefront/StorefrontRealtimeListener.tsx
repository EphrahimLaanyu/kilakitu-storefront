"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function StorefrontRealtimeListener() {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const triggerRefresh = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        router.refresh();
      }, 250);
    };

    const channel = supabase
      .channel("kilakitu-storefront-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        triggerRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_images" },
        triggerRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        triggerRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stores" },
        triggerRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_policies" },
        triggerRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_zones" },
        triggerRefresh
      )
      .subscribe();

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}