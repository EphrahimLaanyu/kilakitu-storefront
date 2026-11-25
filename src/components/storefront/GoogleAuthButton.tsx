"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeNextPath } from "@/lib/auth/redirects";

export function GoogleAuthButton({
  nextPath = "/",
  label = "Continue with Google",
}: {
  nextPath?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const supabase = createClient();
      const safeNext = sanitizeNextPath(nextPath, "/");
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        safeNext
      )}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      }
    } catch {
      setErrorMsg("Unable to start Google sign-in right now. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading}
        onClick={handleGoogleSignIn}
        className="w-full py-3 px-4 rounded-md border border-neutral-300 hover:border-neutral-950 bg-white text-neutral-950 text-xs sm:text-sm font-semibold tracking-wide transition-colors inline-flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
          />
          <path
            fill="#34A853"
            d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09Z"
          />
          <path
            fill="#EA4335"
            d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96Z"
          />
        </svg>
        <span>{loading ? "Redirecting to Google..." : label}</span>
      </button>

      {errorMsg && (
        <p className="text-[11px] text-[#C81E2B] font-medium">{errorMsg}</p>
      )}
    </div>
  );
}
