"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      setHasValidSession(Boolean(user));
      setCheckingSession(false);
    });

    return () => {
      active = false;
    };
  }, []);

  async function handleUpdatePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMsg(error.message);
        setSubmitting(false);
        return;
      }

      router.replace("/account?updated=password");
      router.refresh();
    } catch {
      setErrorMsg("Could not update password. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-white min-h-screen flex items-center justify-center px-4 py-14">
      <div className="w-full max-w-md border border-neutral-200 p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5 border-b border-neutral-100 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C81E2B]">
            Account Security
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
            Set new password
          </h1>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Choose a strong password for your KilaKitu account.
          </p>
        </div>

        {errorMsg && (
          <div className="border-l-2 border-[#C81E2B] bg-neutral-50 px-3.5 py-2.5 text-xs text-[#C81E2B] font-medium">
            {errorMsg}
          </div>
        )}

        {checkingSession ? (
          <p className="text-xs text-neutral-500">
            Verifying your recovery link...
          </p>
        ) : !hasValidSession ? (
          <div className="space-y-4">
            <div className="border-l-2 border-[#C81E2B] bg-neutral-50 px-3.5 py-2.5 text-xs text-[#C81E2B] font-medium">
              Your password reset link is invalid or has expired. Please request
              a new recovery link.
            </div>
            <Link
              href="/forgot-password"
              className="block w-full py-3 px-4 rounded-md bg-[#C81E2B] hover:bg-[#A61621] text-white text-center text-xs sm:text-sm font-semibold tracking-wide transition-colors"
            >
              Request New Reset Link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="new-password"
                className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
              >
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm-password"
                className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
              >
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-md bg-[#C81E2B] hover:bg-[#A61621] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold tracking-wide transition-colors cursor-pointer"
            >
              {submitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

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
