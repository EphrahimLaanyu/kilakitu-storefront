"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function SignupFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/orders";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setSubmitting(false);
        return;
      }

      if (data.user) {
        await supabase
          .from("profiles")
          .upsert(
            {
              id: data.user.id,
              full_name: fullName.trim(),
              phone: phone.trim(),
              email: email.trim(),
            },
            { onConflict: "id" }
          );
      }

      if (data.session) {
        const safeNext = nextPath.startsWith("/") ? nextPath : "/orders";
        router.push(safeNext);
        router.refresh();
      } else {
        setInfoMsg(
          "Account created! Please check your email to confirm your account, then sign in to continue."
        );
        setSubmitting(false);
      }
    } catch {
      setErrorMsg("Unable to create account. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-auto space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">Create Your KilaKitu Account</h1>
        <p className="text-xs text-slate-500">
          Your name and phone number are saved to your profile so checkout and rider delivery coordination are quick.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {infoMsg && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900">
          {infoMsg}
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Brian Otieno"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Phone Number (for Delivery & Order Updates) *
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +254712345678"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Password (min 6 characters) *
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-900"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-bold cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          <span>{submitting ? "Creating account..." : "Create Account & Continue"}</span>
        </button>
      </form>

      <p className="text-xs text-slate-600 text-center pt-2 border-t border-slate-100">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(nextPath)}`}
          className="font-bold text-teal-700 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Catalog</span>
          </Link>
          <span className="text-xs font-semibold text-teal-700">
            Create Account
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Suspense fallback={<div className="text-xs text-slate-500">Loading...</div>}>
          <SignupFormInner />
        </Suspense>
      </main>
    </div>
  );
}