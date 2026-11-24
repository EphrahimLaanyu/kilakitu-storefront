"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/orders";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setSubmitting(false);
        return;
      }

      const safeNext = nextPath.startsWith("/") ? nextPath : "/orders";
      router.push(safeNext);
      router.refresh();
    } catch {
      setErrorMsg("Unable to sign in. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-auto space-y-5">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">Sign In to KilaKitu</h1>
        <p className="text-xs text-slate-500">
          Sign in with your customer account—or your KilaKitu merchant/staff account—to add items, order, and track deliveries.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Email Address
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
            Password
          </label>
          <input
            type="password"
            required
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
          <LogIn className="h-4 w-4" />
          <span>{submitting ? "Signing in..." : "Sign In"}</span>
        </button>
      </form>

      <p className="text-xs text-slate-600 text-center pt-2 border-t border-slate-100">
        New to KilaKitu?{" "}
        <Link
          href={`/signup?next=${encodeURIComponent(nextPath)}`}
          className="font-bold text-teal-700 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
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
            Account Sign In
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Suspense fallback={<div className="text-xs text-slate-500">Loading...</div>}>
          <LoginFormInner />
        </Suspense>
      </main>
    </div>
  );
}