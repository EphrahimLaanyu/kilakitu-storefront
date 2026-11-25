const AUTH_LOOP_PATHS = new Set(["/login", "/signup", "/auth/callback"]);

/**
 * Strictly sanitizes an internal `next` redirect path to prevent open redirects
 * and auth redirect loops. Only relative internal paths starting with `/`
 * (and never `//`, `/\`, backslashes, or control characters) are allowed.
 */
export function sanitizeNextPath(
  next: string | null | undefined,
  fallback = "/"
): string {
  const safeFallback =
    fallback.startsWith("/") &&
    !fallback.startsWith("//") &&
    !fallback.startsWith("/\\")
      ? fallback
      : "/";

  if (!next || typeof next !== "string") {
    return safeFallback;
  }

  const trimmed = next.trim();
  if (
    !trimmed ||
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(trimmed)
  ) {
    return safeFallback;
  }

  try {
    const parsed = new URL(trimmed, "http://kilakitu.local");
    if (
      parsed.origin !== "http://kilakitu.local" ||
      !parsed.pathname.startsWith("/") ||
      parsed.pathname.startsWith("//")
    ) {
      return safeFallback;
    }

    if (AUTH_LOOP_PATHS.has(parsed.pathname)) {
      return safeFallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return safeFallback;
  }
}

export function buildAuthPath(
  route: "/login" | "/signup",
  next: string | null | undefined,
  fallback = "/"
): string {
  const safeNext = sanitizeNextPath(next, fallback);
  return `${route}?next=${encodeURIComponent(safeNext)}`;
}
