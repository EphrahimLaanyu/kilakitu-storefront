"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildAuthPath, sanitizeNextPath } from "@/lib/auth/redirects";

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeNext = sanitizeNextPath(searchParams.get("next"), "/checkout");

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    function resetState() {
      setUserId(null);
      setEmail("");
      setFullName("");
      setPhone("");
      setErrorMsg(null);
    }

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      if (!user) {
        resetState();
        router.replace(buildAuthPath("/login", safeNext, "/checkout"));
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;
      setFullName(
        profile?.full_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          ""
      );
      setPhone(profile?.phone || user.user_metadata?.phone || "");
      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        resetState();
        router.replace(buildAuthPath("/login", safeNext, "/checkout"));
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        window.setTimeout(() => {
          if (active) void loadUser();
        }, 0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router, safeNext]);

  async function handleCompleteProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;
    setErrorMsg(null);

    if (!fullName.trim() || !phone.trim()) {
      setErrorMsg("Please enter both your full name and phone number.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").upsert(
        {
          id: userId,
          email: email || null,
          full_name: fullName.trim(),
          phone: phone.trim(),
          profile_completed: true,
        },
        { onConflict: "id" }
      );

      if (error) {
        setErrorMsg(error.message);
        setSubmitting(false);
        return;
      }

      router.replace(safeNext);
      router.refresh();
    } catch {
      setErrorMsg("Could not save your profile. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-white min-h-screen flex items-center justify-center px-4 py-14">
      <div className="w-full max-w-md border border-neutral-200 p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5 border-b border-neutral-100 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C81E2B]">
            Complete Setup
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
            Finish your profile
          </h1>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Add your delivery contact details so riders and shop staff can
            reach you for orders, handover PINs, and warranty records.
          </p>
        </div>

        {errorMsg && (
          <div className="border-l-2 border-[#C81E2B] bg-neutral-50 px-3.5 py-2.5 text-xs text-[#C81E2B] font-medium">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <p className="text-xs text-neutral-500">Loading your account...</p>
        ) : (
          <form onSubmit={handleCompleteProfile} className="space-y-5">
            <div className="space-y-1">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                Signed-In Email
              </span>
              <p className="text-sm text-neutral-700 py-1">{email}</p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="onboard-name"
                className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
              >
                Full Name *
              </label>
              <input
                id="onboard-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Brian Otieno"
                className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="onboard-phone"
                className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500"
              >
                Phone Number *
              </label>
              <input
                id="onboard-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +254712345678"
                className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-md bg-[#C81E2B] hover:bg-[#A61621] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold tracking-wide transition-colors cursor-pointer"
            >
              {submitting ? "Saving profile..." : "Save & Continue"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <OnboardingInner />
    </Suspense>
  );
}
