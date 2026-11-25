import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/auth/redirects";
import { isProfileComplete, syncUserProfile } from "@/lib/auth/profile";

const VALID_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function resolveRedirectOrigin(request: Request, origin: string): string {
  const isLocalEnv = process.env.NODE_ENV === "development";
  if (isLocalEnv) {
    return origin;
  }

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();

  if (forwardedHost && /^[a-zA-Z0-9.-]+(?::\d+)?$/.test(forwardedHost)) {
    const forwardedProto = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();
    const protocol = forwardedProto === "http" ? "http" : "https";
    return `${protocol}://${forwardedHost}`;
  }

  return origin;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const emailHint = searchParams.get("email")?.trim() ?? "";
  const providerError = searchParams.get("error")?.trim() ?? "";
  const providerErrorCode = searchParams.get("error_code")?.trim() ?? "";
  const safeNext = sanitizeNextPath(searchParams.get("next"), "/");
  const redirectOrigin = resolveRedirectOrigin(request, origin);

  const supabase = await createClient();
  let authSucceeded = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authSucceeded = !error;
  } else if (
    tokenHash &&
    typeParam &&
    VALID_OTP_TYPES.has(typeParam as EmailOtpType)
  ) {
    const { error } = await supabase.auth.verifyOtp({
      type: typeParam as EmailOtpType,
      token_hash: tokenHash,
    });
    authSucceeded = !error;
  }

  // Always check whether a valid user session exists (covers both fresh exchange
  // and edge cases where the confirmation link was clicked twice in the same browser).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (authSucceeded || user) {
    if (user) {
      // Password recovery callbacks must continue directly to /reset-password.
      const isPasswordRecovery =
        typeParam === "recovery" || safeNext.startsWith("/reset-password");

      if (!isPasswordRecovery) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .maybeSingle();

        const syncResult = await syncUserProfile(supabase, user);
        const profileReady =
          isProfileComplete(existingProfile) || syncResult.isComplete;

        if (!profileReady) {
          const setupRedirectUrl = new URL(safeNext, redirectOrigin);
          setupRedirectUrl.searchParams.set("setup", "1");
          return NextResponse.redirect(setupRedirectUrl);
        }
      }
    }

    return NextResponse.redirect(`${redirectOrigin}${safeNext}`);
  }

  const loginRedirectUrl = new URL("/login", redirectOrigin);

  // Explicit OAuth cancellation/error from provider (e.g., Google access_denied)
  // without an email confirmation context.
  if (
    providerError &&
    providerErrorCode !== "otp_expired" &&
    !emailHint &&
    !tokenHash
  ) {
    loginRedirectUrl.searchParams.set("error", "auth_callback_failed");
  } else {
    // Email confirmation link opened in a different browser/mail app (missing PKCE
    // code_verifier cookie), already consumed, or missing code/token_hash.
    loginRedirectUrl.searchParams.set("message", "email_confirmed_or_retry");
  }

  if (emailHint) {
    loginRedirectUrl.searchParams.set("email", emailHint);
  }
  if (safeNext !== "/") {
    loginRedirectUrl.searchParams.set("next", safeNext);
  }

  return NextResponse.redirect(loginRedirectUrl);
}
