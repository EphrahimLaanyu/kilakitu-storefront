"use client";

import Link from "next/link";
import { X, ShieldCheck, LogIn, UserPlus } from "lucide-react";
import { useCart } from "./CartContext";

export function AccountGateModal() {
  const { authGateReason, authGateNextPath, closeAuthGate } = useCart();

  if (!authGateReason) return null;

  const isCartAction = authGateReason === "cart";
  const loginHref = `/login?next=${encodeURIComponent(authGateNextPath)}`;
  const signupHref = `/signup?next=${encodeURIComponent(authGateNextPath)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Account Required to {isCartAction ? "Add to Cart" : "Checkout"}
              </h2>
              <p className="text-xs text-slate-500">
                Sign in or create an account in under a minute.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeAuthGate}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-700 space-y-1.5">
          <p className="font-semibold text-slate-900">
            Why we require an account on KilaKitu:
          </p>
          <p>
            • Keeps your warranty details, device serial/IMEI records, and 4-digit handover PIN tied to your order.
          </p>
          <p>
            • Lets you view all past and active orders anytime under My Orders.
          </p>
          <p className="text-slate-500 pt-0.5">
            Already have a KilaKitu merchant or staff account? You can sign in with that same login.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href={loginHref}
            onClick={closeAuthGate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition"
          >
            <LogIn className="h-4 w-4" />
            <span>Log In</span>
          </Link>

          <Link
            href={signupHref}
            onClick={closeAuthGate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold transition"
          >
            <UserPlus className="h-4 w-4 text-teal-700" />
            <span>Create Account</span>
          </Link>
        </div>
      </div>
    </div>
  );
}