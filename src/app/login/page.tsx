"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildAuthPath, sanitizeNextPath } from "@/lib/auth/redirects";
import { syncUserProfile } from "@/lib/auth/profile";
import { GoogleAuthButton } from "@/components/storefront/GoogleAuthButton";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeNext = sanitizeNextPath(searchParams.get("next"), "/");
  const callbackError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    callbackError
      ? "Authentication link or Google sign-in expired. Please try again."
      : null
  );
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      setSignedInEmail(user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        setSignedInEmail(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSwitchAccount() {
    setSigningOut(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setSignedInEmail(null);
      setEmail("");
      setPassword("");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
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

      router.replace(safeNext);
      router.refresh();
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
    <main className="bg-white min-h-screen flex items-center justify-center px-4 py-14">
      <div className="w-full max-w-md border border-neutral-200 p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5 border-b border-neutral-100 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C81E2B]">
            KilaKitu Account
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
            Sign in
          </h1>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Access your orders, 4-digit handover PINs, and warranty records.
          </p>
        </div>

        {signedInEmail && (
          <div className="border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-xs text-neutral-700 space-y-2">
            <p>
              You are already signed in as{" "}
              <strong className="text-neutral-950">{signedInEmail}</strong>.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={safeNext}
                className="font-semibold text-[#C81E2B] underline underline-offset-4"
              >
                Continue
              </Link>
              <button
                type="button"
                disabled={signingOut}
                onClick={handleSwitchAccount}
                className="font-semibold text-neutral-700 hover:text-neutral-950 underline underline-offset-4 cursor-pointer disabled:opacity-50"
              >
                {signingOut ? "Signing out..." : "Sign out to switch accounts"}
              </button>
            </div>
          </div>
        )}

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

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-neutral-200" />
          <span className="px-3 text-[11px] uppercase tracking-widest text-neutral-400">
            or
          </span>
          <div className="flex-grow border-t border-neutral-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
            >
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-medium text-neutral-500 hover:text-neutral-950 underline underline-offset-4"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none transition-colors"
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

        <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
          <span>New to KilaKitu?</span>
          <Link
            href={buildAuthPath("/signup", safeNext)}
            className="font-semibold text-neutral-950 hover:text-[#C81E2B] underline underline-offset-4"
          >
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginFormInner />
    </Suspense>
  );
}
