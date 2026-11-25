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
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reference =
      typeof body?.reference === "string" ? body.reference.trim() : "";

    if (!reference) {
      return NextResponse.json(
        { error: "reference is required." },
        { status: 400 }
      );
    }

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
        cache: "no-store",
      }
    );

    const verifyJson = await verifyRes.json();
    if (!verifyRes.ok || !verifyJson?.status) {
      return NextResponse.json(
        { error: verifyJson?.message || "Unable to verify transaction." },
        { status: 502 }
      );
    }

    const txData = verifyJson.data ?? {};
    if (txData.status !== "success") {
      return NextResponse.json({ verified: false, status: txData.status });
    }

    const admin = createAdminClient(supabaseUrl, serviceRoleKey);

    const { data: txRow } = await admin
      .from("payment_transactions")
      .select("id, order_id, amount_kes")
      .eq("provider_reference", reference)
      .single();

    if (!txRow) {
      return NextResponse.json(
        { error: "Transaction record not found." },
        { status: 404 }
      );
    }

    const paidSubunits = Number(txData.amount ?? 0);
    const expectedSubunits = Math.round(Number(txRow.amount_kes) * 100);
    const currency = String(txData.currency ?? "").toUpperCase();

    if (currency !== "KES" || paidSubunits < expectedSubunits) {
      return NextResponse.json(
        { error: "Paid amount or currency mismatch." },
        { status: 400 }
      );
    }

    await admin
      .from("payment_transactions")
      .update({
        status: "success",
        raw_payload: txData,
      })
      .eq("id", txRow.id);

    await admin
      .from("orders")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", txRow.order_id);

    return NextResponse.json({ verified: true, order_id: txRow.order_id });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Payment verification failed.",
      },
      { status: 500 }
    );
  }
}