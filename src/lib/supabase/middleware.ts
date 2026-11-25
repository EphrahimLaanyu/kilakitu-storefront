import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_SESSION_PREFIXES = [
  "/checkout",
  "/orders",
  "/account",
  "/onboarding",
  "/reset-password",
  "/api/payments",
];

function isAuthSensitivePath(pathname: string): boolean {
  return AUTH_SESSION_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isPrefetchRequest(request: NextRequest): boolean {
  return (
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch"
  );
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      ({ name }) => name.startsWith("sb-") && name.includes("-auth-token")
    );
}

/**
 * Refreshes the Supabase auth session only when auth cookies are present on
 * auth-sensitive routes (skipping anonymous traffic, public catalog/product
 * routes, and RSC prefetches so navigation never blocks on unnecessary
 * Supabase Auth round-trips).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (isPrefetchRequest(request)) {
    return supabaseResponse;
  }

  if (!hasSupabaseAuthCookie(request)) {
    return supabaseResponse;
  }

  if (!isAuthSensitivePath(request.nextUrl.pathname)) {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}
