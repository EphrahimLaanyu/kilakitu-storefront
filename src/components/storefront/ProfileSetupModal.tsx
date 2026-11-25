"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Lock, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getGoogleProvidedFields,
  isGoogleUser,
  isProfileComplete as checkProfileComplete,
} from "@/lib/auth/profile";
import { useCart, type ProfileSetupReason } from "./CartContext";

function getReasonCopy(reason: ProfileSetupReason): string {
  switch (reason) {
    case "cart":
      return "Add your contact details before adding items to your cart so your orders, warranties, and 4-digit handover PINs stay linked to your account.";
    case "checkout":
      return "Complete your phone number and contact details before proceeding to checkout so riders and shop staff can reach you.";
    case "orders":
      return "Finish your contact details before viewing and managing your orders and handover PINs.";
    default:
      return "Finish setting up your delivery contact details now, or click Fill later to keep browsing.";
  }
}

function ProfileSetupModalInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setupParam = searchParams.get("setup");

  const {
    isAuthenticated,
    authLoading,
    isProfileComplete,
    profileLoading,
    profileSetupOpen,
    profileSetupReason,
    profileSetupNextPath,
    profileSetupRequired,
    openProfileSetup,
    closeProfileSetup,
    markProfileCompleted,
    commitPendingItem,
    openDrawer,
  } = useCart();

  const [loadingFields, setLoadingFields] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailLocked, setEmailLocked] = useState(false);
  const [fullNameLocked, setFullNameLocked] = useState(false);
  const [fromGoogle, setFromGoogle] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-open the setup modal when redirected from /auth/callback with ?setup=1
  useEffect(() => {
    if (setupParam !== "1") return;
    if (authLoading || profileLoading) return;

    // Clean `?setup=1` from the URL so refreshing does not re-trigger it.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("setup");
      const cleanUrl = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, "", cleanUrl);
    } catch {
      // Ignore history errors
    }

    if (isAuthenticated && !isProfileComplete) {
      openProfileSetup("onboarding");
    }
  }, [
    setupParam,
    authLoading,
    profileLoading,
    isAuthenticated,
    isProfileComplete,
    openProfileSetup,
  ]);

  // Populate fields from Supabase user + profiles whenever the modal opens
  useEffect(() => {
    if (!profileSetupOpen) return;
    let active = true;
    setLoadingFields(true);
    setErrorMsg(null);

    async function loadProfileFields() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active) return;
        if (!user) {
          closeProfileSetup();
          return;
        }

        const googleAccount = isGoogleUser(user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone, email")
          .eq("id", user.id)
          .maybeSingle();

        if (!active) return;

        if (checkProfileComplete(profile)) {
          markProfileCompleted();
          return;
        }

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

        setFromGoogle(googleAccount);
        setEmail(prefillEmail);
        setFullName(prefillName);
        setPhone(prefillPhone);
        setEmailLocked(Boolean(prefillEmail));
        setFullNameLocked(Boolean(googleAccount && googleFields.fullName));
      } finally {
        if (active) {
          setLoadingFields(false);
        }
      }
    }

    void loadProfileFields();

    return () => {
      active = false;
    };
  }, [profileSetupOpen, closeProfileSetup, markProfileCompleted]);

  // Allow Escape key to dismiss cleanly
  useEffect(() => {
    if (!profileSetupOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleDismiss();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileSetupOpen, profileSetupRequired, pathname]);

  function handleDismiss() {
    const mustLeaveProtectedPage =
      profileSetupRequired &&
      (pathname?.startsWith("/checkout") || pathname?.startsWith("/orders"));
    setErrorMsg(null);
    closeProfileSetup();
    if (mustLeaveProtectedPage) {
      router.replace("/");
    }
  }

  async function handleSaveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

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
        setErrorMsg("Your session expired. Please sign in again.");
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

      await supabase.auth
        .updateUser({
          data: {
            full_name: trimmedName,
            phone: trimmedPhone,
          },
        })
        .catch(() => null);

      const currentReason = profileSetupReason;
      const targetNext = profileSetupNextPath;
      const addedPending = currentReason === "cart" && commitPendingItem();

      setSubmitting(false);
      markProfileCompleted();
      router.refresh();

      if (addedPending) {
        openDrawer();
      } else if (targetNext && targetNext !== pathname) {
        router.push(targetNext);
      }
    } catch {
      setErrorMsg("Could not save your profile details. Please try again.");
      setSubmitting(false);
    }
  }

  if (!profileSetupOpen) return null;

  const providerBadge = fromGoogle ? "Provided by Google" : "Verified email";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Complete your profile"
      onClick={handleDismiss}
      className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/30 backdrop-blur-[2px] sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet-up w-full sm:max-w-lg max-h-[85vh] bg-white rounded-t-3xl sm:rounded-2xl border-t sm:border border-neutral-200 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Subtle Drag Handle (Mobile) */}
        <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden">
          <span className="h-1 w-9 rounded-full bg-neutral-200" />
        </div>

        {/* Header */}
        <div className="px-5 sm:px-6 pt-3 pb-3.5 sm:py-4 border-b border-neutral-200 flex items-start justify-between gap-4 shrink-0">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#D4A024]">
              Finish Account Setup
            </p>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-neutral-950 mt-0.5">
              Complete your profile
            </h2>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close profile setup"
            className="p-1.5 -mr-1.5 rounded-full text-neutral-400 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form
          id="profile-setup-form"
          onSubmit={handleSaveProfile}
          className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4"
        >
          <p className="text-xs text-neutral-600 leading-relaxed">
            {getReasonCopy(profileSetupReason)}
          </p>

          {errorMsg && (
            <div className="border-l-2 border-[#C81E2B] bg-neutral-50 px-3.5 py-2.5 text-xs text-[#C81E2B] font-medium">
              {errorMsg}
            </div>
          )}

          {loadingFields ? (
            <p className="text-xs text-neutral-500 py-4">
              Loading your account details...
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="setup-email"
                    className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
                  >
                    Email Address
                  </label>
                  {emailLocked && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-500">
                      <Lock className="h-3 w-3" />
                      <span>{providerBadge}</span>
                    </span>
                  )}
                </div>
                <input
                  id="setup-email"
                  type="email"
                  required
                  readOnly={emailLocked}
                  aria-readonly={emailLocked}
                  value={email}
                  onChange={(e) => {
                    if (!emailLocked) setEmail(e.target.value);
                  }}
                  placeholder="you@example.com"
                  className={
                    emailLocked
                      ? "w-full border border-neutral-200 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-600 cursor-not-allowed focus:outline-none"
                      : "w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-1.5 text-sm text-neutral-950 focus:outline-none"
                  }
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="setup-name"
                    className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
                  >
                    Full Name {!fullNameLocked ? "*" : ""}
                  </label>
                  {fullNameLocked && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-500">
                      <Lock className="h-3 w-3" />
                      <span>Provided by Google</span>
                    </span>
                  )}
                </div>
                <input
                  id="setup-name"
                  type="text"
                  required
                  readOnly={fullNameLocked}
                  aria-readonly={fullNameLocked}
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => {
                    if (!fullNameLocked) setFullName(e.target.value);
                  }}
                  placeholder="e.g. Brian Otieno"
                  className={
                    fullNameLocked
                      ? "w-full border border-neutral-200 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-600 cursor-not-allowed focus:outline-none"
                      : "w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-1.5 text-sm text-neutral-950 focus:outline-none"
                  }
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="setup-phone"
                  className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
                >
                  Phone Number *
                </label>
                <input
                  id="setup-phone"
                  type="tel"
                  required
                  autoFocus
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +254712345678"
                  className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-1.5 text-sm text-neutral-950 focus:outline-none tabular-nums"
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-4 border-t border-neutral-200 bg-neutral-50/50 grid grid-cols-2 gap-2.5 shrink-0">
          <button
            type="button"
            disabled={submitting}
            onClick={handleDismiss}
            className="py-2.5 px-3.5 rounded-xl border border-neutral-300 hover:border-neutral-950 bg-white text-neutral-900 text-xs font-semibold tracking-wide transition-colors cursor-pointer disabled:opacity-50"
          >
            Fill later
          </button>
          <button
            type="submit"
            form="profile-setup-form"
            disabled={submitting || loadingFields}
            className="py-2.5 px-3.5 rounded-xl bg-[#C81E2B] hover:bg-[#A61621] disabled:opacity-60 text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer"
          >
            {submitting ? "Saving..." : "Save & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProfileSetupModal() {
  return (
    <Suspense fallback={null}>
      <ProfileSetupModalInner />
    </Suspense>
  );
}
