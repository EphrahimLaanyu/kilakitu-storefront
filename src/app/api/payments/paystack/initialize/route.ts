import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!paystackSecretKey || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Paystack server environment variables are not configured." },
        { status: 500 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in before initializing payment." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const orderId = typeof body?.order_id === "string" ? body.order_id.trim() : "";
    const callbackUrl =
      typeof body?.callback_url === "string" ? body.callback_url.trim() : "";

    if (!orderId) {
      return NextResponse.json(
        { error: "order_id is required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(
        "id, order_number, store_id, customer_user_id, customer_email, customer_phone, total_kes, payment_status"
      )
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.customer_user_id && order.customer_user_id !== user.id) {
      return NextResponse.json(
        { error: "You are not authorized to pay for this order." },
        { status: 403 }
      );
    }

    if (order.payment_status === "paid") {
      return NextResponse.json(
        { error: "This order has already been paid." },
        { status: 400 }
      );
    }

    const reference = `KK-${order.order_number}-${Date.now()}`;
    const amountSubunits = Math.round(Number(order.total_kes) * 100);
    const customerEmail =
      order.customer_email || user.email || "orders@kilakitu.co.ke";

    const origin = new URL(request.url).origin;
    const resolvedCallback =
      callbackUrl && callbackUrl.startsWith("http")
        ? callbackUrl
        : `${origin}/orders`;

    const paystackRes = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: customerEmail,
          amount: amountSubunits,
          currency: "KES",
          reference,
          callback_url: resolvedCallback,
          metadata: {
            order_id: order.id,
            order_number: order.order_number,
            store_id: order.store_id,
            customer_phone: order.customer_phone,
          },
        }),
      }
    );

    const paystackJson = await paystackRes.json();

    if (
      !paystackRes.ok ||
      !paystackJson?.status ||
      !paystackJson?.data?.authorization_url
    ) {
      return NextResponse.json(
        {
          error:
            paystackJson?.message ||
            "Paystack could not initialize this transaction.",
        },
        { status: 502 }
      );
    }

    const { error: txError } = await admin.from("payment_transactions").insert({
      order_id: order.id,
      provider: "paystack",
      provider_reference: reference,
      phone_number: order.customer_phone,
      amount_kes: order.total_kes,
      status: "pending",
      raw_payload: paystackJson.data,
    });

    if (txError) {
      return NextResponse.json(
        { error: `Failed to save payment transaction: ${txError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      authorization_url: paystackJson.data.authorization_url,
      access_code: paystackJson.data.access_code,
      reference,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to initialize payment.",
      },
      { status: 500 }
    );
  }
}