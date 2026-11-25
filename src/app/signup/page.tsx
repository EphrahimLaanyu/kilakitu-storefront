"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildAuthPath, sanitizeNextPath } from "@/lib/auth/redirects";
import { syncUserProfile } from "@/lib/auth/profile";
import { GoogleAuthButton } from "@/components/storefront/GoogleAuthButton";

function SignupFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeNext = sanitizeNextPath(searchParams.get("next"), "/");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<
    string | null
  >(null);

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
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setPendingConfirmationEmail(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedPhone || !trimmedEmail) {
      setErrorMsg("Please fill in your full name, phone number, and email.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            safeNext
          )}`,
          data: {
            full_name: trimmedName,
            phone: trimmedPhone,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setSubmitting(false);
        return;
      }

      // Supabase returns an empty identities array when email confirmation is on
      // and the email address is already registered.
      if (
        data.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
      ) {
        setErrorMsg(
          "An account with this email already exists. Please sign in or reset your password."
        );
        setSubmitting(false);
        return;
      }

      if (data.session && data.user) {
        await syncUserProfile(supabase, data.user, {
          fullName: trimmedName,
          phone: trimmedPhone,
          email: trimmedEmail,
        });
        router.replace(safeNext);
        router.refresh();
        return;
      }

      // Email confirmation is required before an active session exists.
      // Full name and phone are stored in user_metadata and will be synced into
      // public.profiles automatically when the confirmation link or first sign-in completes.
      setPendingConfirmationEmail(trimmedEmail);
      setInfoMsg(
        `Account created for ${trimmedEmail}. Please confirm your email address using the link sent to your inbox before signing in.`
      );
      setSubmitting(false);
    } catch {
      setErrorMsg("Could not create your account. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleResendConfirmation() {
    if (!pendingConfirmationEmail) return;
    setResending(true);
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingConfirmationEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            safeNext
          )}`,
        },
      });
      if (error) {
        setErrorMsg(error.message);
      } else {
        setInfoMsg(
          `Confirmation email resent to ${pendingConfirmationEmail}. Check your inbox and spam folder, then open the link to continue.`
        );
      }
    } finally {
      setResending(false);
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
            Create account
          </h1>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Save your contact details for faster checkout, live order tracking,
            and warranty records.
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
          <div className="border-l-2 border-[#C81E2B] bg-neutral-50 px-3.5 py-2.5 text-xs text-[#C81E2B] font-medium">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="border-l-2 border-neutral-950 bg-neutral-50 px-3.5 py-3 text-xs text-neutral-800 space-y-2.5">
            <p>{infoMsg}</p>
            {pendingConfirmationEmail && (
              <div className="flex flex-wrap items-center gap-4 pt-0.5">
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResendConfirmation}
                  className="font-semibold text-neutral-950 hover:text-[#C81E2B] underline underline-offset-4 cursor-pointer disabled:opacity-50"
                >
                  {resending ? "Resending..." : "Resend confirmation email"}
                </button>
                <Link
                  href={buildAuthPath("/login", safeNext)}
                  className="font-semibold text-[#C81E2B] underline underline-offset-4"
                >
                  Go to Sign In
                </Link>
              </div>
            )}
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
              htmlFor="signup-name"
              className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
            >
              Full Name
            </label>
            <input
              id="signup-name"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Brian Otieno"
              className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signup-phone"
              className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
            >
              Phone Number
            </label>
            <input
              id="signup-phone"
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +254712345678"
              className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signup-email"
              className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
            >
              Email Address
            </label>
            <input
              id="signup-email"
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
            <label
              htmlFor="signup-password"
              className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
            >
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-md bg-[#C81E2B] hover:bg-[#A61621] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold tracking-wide transition-colors cursor-pointer"
          >
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
          <span>Already have an account?</span>
          <Link
            href={buildAuthPath("/login", safeNext)}
            className="font-semibold text-neutral-950 hover:text-[#C81E2B] underline underline-offset-4"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SignupFormInner />
    </Suspense>
  );
}
