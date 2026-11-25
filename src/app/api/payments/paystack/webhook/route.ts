import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function timingSafeEqualHex(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function computeHmacSha512Hex(
  secret: string,
  rawText: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const rawBytes = encoder.encode(rawText);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, rawBytes);
  return Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: Request) {
  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!paystackSecretKey || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Webhook server environment is not configured." },
        { status: 500 }
      );
    }

    const signatureHeader = (
      request.headers.get("x-paystack-signature") ?? ""
    ).toLowerCase();
    const rawText = await request.text();
    const expectedHex = (
      await computeHmacSha512Hex(paystackSecretKey, rawText)
    ).toLowerCase();

    if (!timingSafeEqualHex(signatureHeader, expectedHex)) {
      return NextResponse.json(
        { error: "Invalid Paystack signature." },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawText);
    const eventName: string = event?.event ?? "";
    const data = event?.data ?? {};
    const reference: string | undefined = data?.reference;

    if (!reference) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const admin = createAdminClient(supabaseUrl, serviceRoleKey);

    const { data: txRow } = await admin
      .from("payment_transactions")
      .select("id, order_id, amount_kes, status")
      .eq("provider_reference", reference)
      .single();

    if (!txRow) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (eventName === "charge.success") {
      const paidSubunits = Number(data?.amount ?? 0);
      const expectedSubunits = Math.round(Number(txRow.amount_kes) * 100);
      const currency = String(data?.currency ?? "").toUpperCase();

      if (currency === "KES" && paidSubunits >= expectedSubunits) {
        await admin
          .from("payment_transactions")
          .update({
            status: "success",
            raw_payload: event,
          })
          .eq("id", txRow.id);

        await admin
          .from("orders")
          .update({
            payment_status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("id", txRow.order_id);
      }
    } else if (eventName === "charge.failed") {
      if (txRow.status !== "success") {
        await admin
          .from("payment_transactions")
          .update({
            status: "failed",
            failure_reason: data?.gateway_response || "Charge failed",
            raw_payload: event,
          })
          .eq("id", txRow.id);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Webhook processing error.",
      },
      { status: 500 }
    );
  }
}