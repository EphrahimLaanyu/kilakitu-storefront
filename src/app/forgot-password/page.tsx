"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  async function handleResetRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setSubmitting(true);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo }
      );

      if (error) {
        setErrorMsg(error.message);
        setSubmitting(false);
        return;
      }

      setInfoMsg(
        "Password reset link sent. Open the link in your email to choose a new password."
      );
      setSubmitting(false);
    } catch {
      setErrorMsg("Could not send password reset email. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-white min-h-screen flex items-center justify-center px-4 py-14">
      <div className="w-full max-w-md border border-neutral-200 p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5 border-b border-neutral-100 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C81E2B]">
            Account Recovery
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
            Reset password
          </h1>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Enter the email address associated with your KilaKitu account and we
            will send you a recovery link.
          </p>
        </div>

        {errorMsg && (
          <div className="border-l-2 border-[#C81E2B] bg-neutral-50 px-3.5 py-2.5 text-xs text-[#C81E2B] font-medium">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="border-l-2 border-neutral-950 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-800">
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleResetRequest} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="reset-email"
              className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
            >
              Email Address
            </label>
            <input
              id="reset-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-md bg-[#C81E2B] hover:bg-[#A61621] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold tracking-wide transition-colors cursor-pointer"
          >
            {submitting ? "Sending link..." : "Send Reset Link"}
          </button>
        </form>

        <div className="pt-4 border-t border-neutral-100 text-xs text-neutral-600">
          <Link
            href="/login"
            className="font-semibold text-neutral-950 hover:text-[#C81E2B] underline underline-offset-4"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}