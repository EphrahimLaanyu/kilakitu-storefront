"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildAuthPath, sanitizeNextPath } from "@/lib/auth/redirects";
import {
  getGoogleProvidedFields,
  isGoogleUser,
  isProfileComplete,
  syncUserProfile,
} from "@/lib/auth/profile";
import { GoogleAuthButton } from "@/components/storefront/GoogleAuthButton";

type CompleteSessionState = {
  user: User;
  emailLocked: boolean;
  fullNameLocked: boolean;
  fromGoogle: boolean;
};

function SignupFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const isCompleteRequested = modeParam === "complete";
  const safeNext = sanitizeNextPath(searchParams.get("next"), "/");

  const [checkingAuth, setCheckingAuth] = useState(isCompleteRequested);
  const [completeState, setCompleteState] =
    useState<CompleteSessionState | null>(null);

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

    async function inspectCurrentUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active) return;

        if (!user) {
          setCompleteState(null);
          setSignedInEmail(null);
          setCheckingAuth(false);
          return;
        }

        const fromGoogle = isGoogleUser(user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone, email")
          .eq("id", user.id)
          .maybeSingle();

        if (!active) return;

        const profileReady = isProfileComplete(profile);

        // Returning user who already completed onboarding should skip straight to `safeNext`.
        if (isCompleteRequested && profileReady) {
          router.replace(safeNext);
          router.refresh();
          return;
        }

        // Enter Google OAuth / profile completion mode when explicitly requested
        // or when a Google-authenticated user has an incomplete profile.
        if (isCompleteRequested || (fromGoogle && !profileReady)) {
          const googleFields = getGoogleProvidedFields(user);
          const prefillEmail =
            googleFields.email || profile?.email?.trim() || "";
          const prefillName =
            googleFields.fullName || profile?.full_name?.trim() || "";
          const prefillPhone =
            profile?.phone?.trim() ||
            (typeof user.user_metadata?.phone === "string"
              ? user.user_metadata.phone.trim()
              : "");

          setEmail(prefillEmail);
          setFullName(prefillName);
          setPhone(prefillPhone);
          setSignedInEmail(user.email ?? null);
          setCompleteState({
            user,
            emailLocked: Boolean(prefillEmail),
            fullNameLocked: Boolean(fromGoogle && googleFields.fullName),
            fromGoogle,
          });
          setCheckingAuth(false);
          return;
        }

        setCompleteState(null);
        setSignedInEmail(user.email ?? null);
        setCheckingAuth(false);
      } catch {
        if (!active) return;
        setCompleteState(null);
        setSignedInEmail(null);
        setCheckingAuth(false);
      }
    }

    void inspectCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        setCompleteState(null);
        setSignedInEmail(null);
        setFullName("");
        setPhone("");
        setEmail("");
        setPassword("");
        setErrorMsg(null);
        setInfoMsg(null);
        setCheckingAuth(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isCompleteRequested, router, safeNext]);

  async function handleSwitchAccount() {
    setSigningOut(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setCompleteState(null);
      setSignedInEmail(null);
      setFullName("");
      setPhone("");
      setEmail("");
      setPassword("");
      router.replace(buildAuthPath("/signup", safeNext));
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  async function handleCompleteOnboarding(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!completeState) return;

    setErrorMsg(null);
    setInfoMsg(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedPhone) {
      setErrorMsg("Please enter both your full name and phone number.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMsg("Your session expired. Please sign in again to continue.");
        setCompleteState(null);
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: trimmedEmail || user.email || null,
          full_name: trimmedName,
          phone: trimmedPhone,
        },
        { onConflict: "id" }
      );

      if (error) {
        setErrorMsg(error.message);
        setSubmitting(false);
        return;
      }

      // Best-effort sync to auth user_metadata so navbar/checkout fallbacks stay fresh.
      await supabase.auth
        .updateUser({
          data: {
            full_name: trimmedName,
            phone: trimmedPhone,
          },
        })
        .catch(() => null);

      router.replace(safeNext);
      router.refresh();
    } catch {
      setErrorMsg("Could not save your profile details. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleStandardSignup(e: FormEvent<HTMLFormElement>) {
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

  const isOnboardingMode = Boolean(completeState);
  const providerLabel = completeState?.fromGoogle
    ? "Provided by Google"
    : "Verified account email";

  return (
    <main className="bg-white min-h-screen flex items-center justify-center px-4 py-14">
      <div className="w-full max-w-md border border-neutral-200 p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5 border-b border-neutral-100 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C81E2B]">
            {isOnboardingMode ? "Finish Account Setup" : "KilaKitu Account"}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
            {isOnboardingMode ? "Complete your account" : "Create account"}
          </h1>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {isOnboardingMode
              ? "Confirm your delivery contact details so riders and shop staff can reach you for orders, handover PINs, and warranty records."
              : "Save your contact details for faster checkout, live order tracking, and warranty records."}
          </p>
        </div>

        {checkingAuth ? (
          <p className="text-xs text-neutral-500 py-4">
            Loading your account details...
          </p>
        ) : (
          <>
            {!isOnboardingMode && signedInEmail && (
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
                    {signingOut
                      ? "Signing out..."
                      : "Sign out to switch accounts"}
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
                      {resending
                        ? "Resending..."
                        : "Resend confirmation email"}
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

            {!isOnboardingMode && (
              <>
                <GoogleAuthButton
                  nextPath={safeNext}
                  label="Continue with Google"
                />

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-neutral-200" />
                  <span className="px-3 text-[11px] uppercase tracking-widest text-neutral-400">
                    or
                  </span>
                  <div className="flex-grow border-t border-neutral-200" />
                </div>
              </>
            )}

            <form
              onSubmit={
                isOnboardingMode
                  ? handleCompleteOnboarding
                  : handleStandardSignup
              }
              className="space-y-5"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="signup-name"
                    className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
                  >
                    Full Name
                  </label>
                  {completeState?.fullNameLocked && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-500">
                      <Lock className="h-3 w-3" />
                      <span>Provided by Google</span>
                    </span>
                  )}
                </div>
                <input
                  id="signup-name"
                  type="text"
                  required
                  readOnly={Boolean(completeState?.fullNameLocked)}
                  aria-readonly={Boolean(completeState?.fullNameLocked)}
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => {
                    if (!completeState?.fullNameLocked) {
                      setFullName(e.target.value);
                    }
                  }}
                  placeholder="e.g. Brian Otieno"
                  className={
                    completeState?.fullNameLocked
                      ? "w-full border border-neutral-200 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600 cursor-not-allowed focus:outline-none"
                      : "w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none transition-colors"
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="signup-phone"
                  className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
                >
                  Phone Number {isOnboardingMode ? "*" : ""}
                </label>
                <input
                  id="signup-phone"
                  type="tel"
                  required
                  autoFocus={isOnboardingMode}
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +254712345678"
                  className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="signup-email"
                    className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
                  >
                    Email Address
                  </label>
                  {completeState?.emailLocked && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-500">
                      <Lock className="h-3 w-3" />
                      <span>{providerLabel}</span>
                    </span>
                  )}
                </div>
                <input
                  id="signup-email"
                  type="email"
                  required
                  readOnly={Boolean(completeState?.emailLocked)}
                  aria-readonly={Boolean(completeState?.emailLocked)}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    if (!completeState?.emailLocked) {
                      setEmail(e.target.value);
                    }
                  }}
                  placeholder="you@example.com"
                  className={
                    completeState?.emailLocked
                      ? "w-full border border-neutral-200 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600 cursor-not-allowed focus:outline-none"
                      : "w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none transition-colors"
                  }
                />
              </div>

              {!isOnboardingMode && (
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
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-md bg-[#C81E2B] hover:bg-[#A61621] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold tracking-wide transition-colors cursor-pointer"
              >
                {submitting
                  ? isOnboardingMode
                    ? "Saving details..."
                    : "Creating account..."
                  : isOnboardingMode
                  ? "Save & Continue"
                  : "Create Account"}
              </button>
            </form>

            {isOnboardingMode ? (
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
                <span>Wrong Google account?</span>
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={handleSwitchAccount}
                  className="font-semibold text-neutral-950 hover:text-[#C81E2B] underline underline-offset-4 cursor-pointer disabled:opacity-50"
                >
                  {signingOut ? "Signing out..." : "Sign out & switch"}
                </button>
              </div>
            ) : (
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
                <span>Already have an account?</span>
                <Link
                  href={buildAuthPath("/login", safeNext)}
                  className="font-semibold text-neutral-950 hover:text-[#C81E2B] underline underline-offset-4"
                >
                  Sign in
                </Link>
              </div>
            )}
          </>
        )}
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
