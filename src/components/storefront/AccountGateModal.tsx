"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildAuthPath, sanitizeNextPath } from "@/lib/auth/redirects";
import { syncUserProfile } from "@/lib/auth/profile";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { useCart } from "./CartContext";

type GateDetail = {
  nextUrl?: string;
  reason?: string;
};

const DEFAULT_REASON =
  "Sign in or create an account to save your order, warranty records, and 4-digit handover PIN.";
const CART_REASON =
  "Sign in or create a KilaKitu account to add items to your bag so your orders, warranty records, and 4-digit handover PIN stay linked to your account.";
const CHECKOUT_REASON =
  "Sign in or create a KilaKitu account to complete checkout. Your shopping bag items will stay saved.";

export function AccountGateModal() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    authGateReason,
    authGateNextPath,
    closeAuthGate,
    commitPendingItem,
    openDrawer,
  } = useCart();

  const [eventOpen, setEventOpen] = useState(false);
  const [eventNextUrl, setEventNextUrl] = useState("/checkout");
  const [eventReason, setEventReason] = useState(DEFAULT_REASON);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  useEffect(() => {
    function handleGateEvent(event: Event) {
      const customEvent = event as CustomEvent<GateDetail>;
      setEventNextUrl(
        sanitizeNextPath(customEvent.detail?.nextUrl, "/checkout")
      );
      setEventReason(customEvent.detail?.reason || DEFAULT_REASON);
      setErrorMsg(null);
      setInfoMsg(null);
      setNeedsConfirmation(false);
      setEventOpen(true);
    }

    window.addEventListener("kilakitu:account-gate", handleGateEvent);
    return () =>
      window.removeEventListener("kilakitu:account-gate", handleGateEvent);
  }, []);

  const isContextOpen = authGateReason !== null;
  const open = isContextOpen || eventOpen;

  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setInfoMsg(null);
      setNeedsConfirmation(false);
    }
  }, [open]);

  if (!open) return null;

  const safeNext = sanitizeNextPath(
    isContextOpen ? authGateNextPath : eventNextUrl,
    "/checkout"
  );
  const reasonText = isContextOpen
    ? authGateReason === "cart"
      ? CART_REASON
      : CHECKOUT_REASON
    : eventReason;

  function handleClose() {
    setEventOpen(false);
    setPassword("");
    setErrorMsg(null);
    setInfoMsg(null);
    setNeedsConfirmation(false);
    closeAuthGate();
  }

  async function handleInlineLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setNeedsConfirmation(false);
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setNeedsConfirmation(true);
        }
        setErrorMsg(error.message);
        setSubmitting(false);
        return;
      }

      const {
        data: { user: verifiedUser },
      } = await supabase.auth.getUser();
      const activeUser = verifiedUser ?? data.user;

      if (activeUser) {
        await syncUserProfile(supabase, activeUser);
      }

      const addedPending = authGateReason === "cart" && commitPendingItem();

      setEventOpen(false);
      setEmail("");
      setPassword("");
      setSubmitting(false);
      closeAuthGate();
      router.refresh();

      if (addedPending) {
        openDrawer();
      } else if (safeNext && safeNext !== pathname) {
        router.push(safeNext);
      }
    } catch {
      setErrorMsg("Unable to sign in right now. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleResendConfirmation() {
    if (!email.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            safeNext
          )}`,
        },
      });
      if (error) {
        setErrorMsg(error.message);
      } else {
        setNeedsConfirmation(false);
        setInfoMsg(
          "Confirmation email resent. Check your inbox and spam folder."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-[1px]">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-lg p-6 sm:p-7 space-y-5 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C81E2B]">
              Account Required
            </p>
            <h2 className="text-lg font-semibold text-neutral-950 mt-1">
              Sign in to continue
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="p-1 text-neutral-400 hover:text-neutral-950 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-600 leading-relaxed">{reasonText}</p>

        {errorMsg && (
          <div className="border-l-2 border-[#C81E2B] bg-neutral-50 px-3.5 py-2.5 text-xs text-[#C81E2B] font-medium space-y-2">
            <p>{errorMsg}</p>
            {needsConfirmation && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                className="underline underline-offset-4 font-semibold text-neutral-950 cursor-pointer"
              >
                Resend confirmation email
              </button>
            )}
          </div>
        )}

        {infoMsg && (
          <div className="border-l-2 border-neutral-950 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-800">
            {infoMsg}
          </div>
        )}

        <GoogleAuthButton nextPath={safeNext} label="Continue with Google" />

        <div className="relative flex items-center py-0.5">
          <div className="flex-grow border-t border-neutral-200" />
          <span className="px-3 text-[10px] uppercase tracking-widest text-neutral-400">
            or email
          </span>
          <div className="flex-grow border-t border-neutral-200" />
        </div>

        <form onSubmit={handleInlineLogin} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="modal-login-email"
              className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
            >
              Email Address
            </label>
            <input
              id="modal-login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-1.5 text-sm text-neutral-950 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="modal-login-password"
                className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                onClick={handleClose}
                className="text-[11px] font-medium text-neutral-500 hover:text-neutral-950 underline underline-offset-4"
              >
                Forgot?
              </Link>
            </div>
            <input
              id="modal-login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-1.5 text-sm text-neutral-950 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-md bg-[#C81E2B] hover:bg-[#A61621] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold tracking-wide transition-colors cursor-pointer"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600 gap-3">
          <Link
            href={buildAuthPath("/login", safeNext, "/checkout")}
            onClick={handleClose}
            className="font-medium text-neutral-600 hover:text-neutral-950 underline underline-offset-4"
          >
            Full sign-in page
          </Link>
          <Link
            href={buildAuthPath("/signup", safeNext, "/checkout")}
            onClick={handleClose}
            className="font-semibold text-neutral-950 hover:text-[#C81E2B] underline underline-offset-4"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
