"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  User,
  ChevronDown,
  ShoppingBag,
  X,
  ArrowUpRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildAuthPath, sanitizeNextPath } from "@/lib/auth/redirects";
import { useCart } from "./CartContext";

export type NavCategory = {
  id: string;
  name: string;
  slug: string;
};

type NavUserInfo = {
  id: string;
  email: string | null;
  fullName: string;
  firstName: string;
  initials: string;
};

type SearchSuggestionProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  price_kes: number;
  image_url: string | null;
};

type SearchSuggestionCategory = {
  id: string;
  name: string;
  slug: string;
};

function StorefrontNavbarInner({
  categories = [],
}: {
  categories: NavCategory[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { totalCount, openDrawer, closeDrawer } = useCart();

  const currentQuery = searchParams.get("q") || searchParams.get("search") || "";
  const activeCategory = searchParams.get("category") || "all";

  const [query, setQuery] = useState(currentQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    products: SearchSuggestionProduct[];
    categories: SearchSuggestionCategory[];
  }>({ products: [], categories: [] });

  const [navUser, setNavUser] = useState<NavUserInfo | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const accountRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let syncSeq = 0;

    async function syncUser() {
      const seq = ++syncSeq;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active || seq !== syncSeq) return;

        if (!user) {
          setNavUser(null);
          setAuthReady(true);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .maybeSingle();

        if (!active || seq !== syncSeq) return;

        const rawName =
          profile?.full_name?.trim() ||
          user.user_metadata?.full_name?.trim() ||
          user.user_metadata?.name?.trim() ||
          profile?.email?.split("@")[0] ||
          user.email?.split("@")[0] ||
          "Account";

        const parts = rawName.split(/\s+/).filter(Boolean);
        const firstName = parts[0] || "Account";
        const initials =
          parts.length >= 2
            ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
            : rawName.slice(0, 2).toUpperCase();

        setNavUser({
          id: user.id,
          email: user.email ?? null,
          fullName: rawName,
          firstName,
          initials,
        });
        setAuthReady(true);
      } catch {
        if (!active || seq !== syncSeq) return;
        setNavUser(null);
        setAuthReady(true);
      }
    }

    void syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        syncSeq += 1;
        setNavUser(null);
        setAccountOpen(false);
        setAuthReady(true);
        return;
      }

      window.setTimeout(() => {
        if (active) {
          void syncUser();
        }
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        accountRef.current &&
        !accountRef.current.contains(e.target as Node)
      ) {
        setAccountOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions({ products: [], categories: [] });
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions({
            products: data.products ?? [],
            categories: data.categories ?? [],
          });
        }
      } catch {
        // Ignore transient network errors
      } finally {
        setSearching(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query]);

  function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSearchFocused(false);
    const trimmed = query.trim();
    const params = new URLSearchParams(
      pathname === "/" ? searchParams.toString() : ""
    );
    params.delete("search");
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  function clearSearch() {
    setQuery("");
    setSuggestions({ products: [], categories: [] });
    if (pathname === "/") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("q");
      params.delete("search");
      const qs = params.toString();
      router.push(qs ? `/?${qs}` : "/");
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setNavUser(null);
      setAccountOpen(false);
      closeDrawer();

      const isProtectedRoute =
        pathname?.startsWith("/checkout") ||
        pathname?.startsWith("/orders") ||
        pathname?.startsWith("/account") ||
        pathname?.startsWith("/onboarding");

      if (isProtectedRoute) {
        router.replace("/");
      }
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const rawSearch = searchParams.toString();
  const currentLocation =
    pathname === "/login" || pathname === "/signup"
      ? searchParams.get("next") || "/"
      : rawSearch
      ? `${pathname || "/"}?${rawSearch}`
      : pathname || "/";
  const safeNextForAuth = sanitizeNextPath(currentLocation, "/");
  const loginHref = buildAuthPath("/login", safeNextForAuth, "/");
  const signupHref = buildAuthPath("/signup", safeNextForAuth, "/");
  const showDropdown =
    searchFocused &&
    query.trim().length >= 2 &&
    (searching ||
      suggestions.products.length > 0 ||
      suggestions.categories.length > 0);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
      {/* Primary Utility Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="h-16 md:h-20 flex items-center justify-between gap-4 md:gap-8">
          {/* Brand Logo */}
          <Link
            href="/"
            aria-label="KilaKitu Home"
            className="shrink-0 flex items-center focus:outline-none"
          >
            <img
              src="/logo11.svg"
              alt="KilaKitu.co.ke"
              className="h-9 sm:h-10 md:h-11 w-auto object-contain"
            />
          </Link>

          {/* Desktop Dynamic Search */}
          <div ref={searchRef} className="hidden md:block flex-1 max-w-xl relative">
            <form
              onSubmit={handleSearchSubmit}
              role="search"
              className="flex items-center border border-neutral-300 focus-within:border-neutral-950 rounded-lg bg-neutral-50/60 focus-within:bg-white transition-colors"
            >
              <Search className="h-4 w-4 text-neutral-400 ml-3.5 shrink-0" />
              <input
                type="search"
                name="q"
                value={query}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchFocused(true);
                }}
                placeholder="Search phones, laptops, audio, brands..."
                aria-label="Search products, brands and categories"
                className="w-full bg-transparent px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-400 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="p-1.5 text-neutral-400 hover:text-neutral-900 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold tracking-wide uppercase text-neutral-950 hover:text-[#C81E2B] border-l border-neutral-200 transition-colors cursor-pointer shrink-0"
              >
                Search
              </button>
            </form>

            {/* Clean Autocomplete Dropdown */}
            {showDropdown && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] bg-white border border-neutral-200 rounded-lg shadow-lg divide-y divide-neutral-100 overflow-hidden z-50">
                {searching ? (
                  <div className="px-4 py-3 text-xs text-neutral-500">
                    Searching catalog...
                  </div>
                ) : (
                  <>
                    {suggestions.categories.length > 0 && (
                      <div className="py-1.5">
                        <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                          Categories
                        </p>
                        {suggestions.categories.map((cat) => (
                          <Link
                            key={cat.id}
                            href={`/?category=${encodeURIComponent(cat.slug)}`}
                            onClick={() => setSearchFocused(false)}
                            className="flex items-center justify-between px-4 py-2 hover:bg-neutral-50 text-xs font-medium text-neutral-900"
                          >
                            <span>{cat.name}</span>
                            <ArrowUpRight className="h-3.5 w-3.5 text-neutral-400" />
                          </Link>
                        ))}
                      </div>
                    )}

                    {suggestions.products.length > 0 && (
                      <div className="py-1.5">
                        <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                          Products
                        </p>
                        {suggestions.products.map((prod) => (
                          <Link
                            key={prod.id}
                            href={`/products/${prod.slug}`}
                            onClick={() => setSearchFocused(false)}
                            className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-neutral-50 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {prod.image_url ? (
                                <img
                                  src={prod.image_url}
                                  alt={prod.name}
                                  className="h-9 w-9 object-contain bg-neutral-50 border border-neutral-100 shrink-0"
                                />
                              ) : (
                                <div className="h-9 w-9 bg-neutral-50 border border-neutral-100 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-neutral-950 truncate">
                                  {prod.name}
                                </p>
                                <p className="text-[11px] text-neutral-500">
                                  {prod.brand}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-neutral-950 tabular-nums shrink-0">
                              KES {prod.price_kes.toLocaleString("en-KE")}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}

                    <Link
                      href={`/?q=${encodeURIComponent(query.trim())}`}
                      onClick={() => setSearchFocused(false)}
                      className="block w-full px-4 py-2.5 text-center text-xs font-semibold text-[#C81E2B] hover:bg-neutral-50 transition"
                    >
                      View all results for &ldquo;{query.trim()}&rdquo;
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Utility Actions */}
          <div className="flex items-center divide-x divide-neutral-200 shrink-0">
            {/* Account Menu */}
            <div ref={accountRef} className="relative pr-3 sm:pr-4">
              <button
                type="button"
                onClick={() => setAccountOpen((prev) => !prev)}
                aria-expanded={accountOpen}
                className="inline-flex items-center gap-2 py-1.5 text-neutral-900 hover:text-[#C81E2B] transition-colors cursor-pointer"
              >
                <User className="h-4 w-4 stroke-[1.75]" />
                <span className="text-xs font-semibold tracking-tight">
                  {authReady && navUser ? navUser.firstName : "Account"}
                </span>
                {authReady && navUser && (
                  <span
                    title="Signed in"
                    className="h-1.5 w-1.5 rounded-full bg-emerald-600"
                  />
                )}
                <ChevronDown
                  className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${
                    accountOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {accountOpen && (
                <div className="absolute right-3 sm:right-4 top-[calc(100%+12px)] w-60 bg-white border border-neutral-200 rounded-lg shadow-lg divide-y divide-neutral-100 z-50">
                  {authReady && navUser ? (
                    <>
                      <div className="px-4 py-3">
                        <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-medium">
                          Signed in
                        </p>
                        <p className="text-sm font-semibold text-neutral-950 truncate mt-0.5">
                          {navUser.fullName}
                        </p>
                        {navUser.email && (
                          <p className="text-xs text-neutral-500 truncate">
                            {navUser.email}
                          </p>
                        )}
                      </div>

                      <div className="py-1">
                        <Link
                          href="/orders"
                          onClick={() => setAccountOpen(false)}
                          className="block px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 hover:text-neutral-950"
                        >
                          My Orders & Handover PINs
                        </Link>
                        <Link
                          href="/account"
                          onClick={() => setAccountOpen(false)}
                          className="block px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 hover:text-neutral-950"
                        >
                          Account & Password Settings
                        </Link>
                        <Link
                          href="/policies"
                          onClick={() => setAccountOpen(false)}
                          className="block px-4 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 hover:text-neutral-950"
                        >
                          Warranty & Return Policy
                        </Link>
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          disabled={signingOut}
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-[#C81E2B] hover:bg-neutral-50 cursor-pointer"
                        >
                          {signingOut ? "Signing out..." : "Sign Out"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 space-y-2.5">
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Sign in to manage orders, warranties, and handover PINs.
                      </p>
                      <Link
                        href={loginHref}
                        onClick={() => setAccountOpen(false)}
                        className="block w-full py-2 px-3 rounded-md bg-[#C81E2B] hover:bg-[#A61621] text-white text-center text-xs font-semibold transition"
                      >
                        Sign In
                      </Link>
                      <Link
                        href={signupHref}
                        onClick={() => setAccountOpen(false)}
                        className="block w-full py-2 px-3 rounded-md border border-neutral-300 hover:border-neutral-950 text-neutral-950 text-center text-xs font-semibold transition"
                      >
                        Create Account
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Policies Link (Desktop) */}
            <Link
              href="/policies"
              className="hidden lg:inline-flex items-center px-4 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-950 transition-colors"
            >
              Policies
            </Link>

            {/* Cart Trigger */}
            <button
              type="button"
              onClick={openDrawer}
              aria-label={`Shopping bag with ${totalCount} items`}
              className="pl-3 sm:pl-4 py-1.5 inline-flex items-center gap-2 text-neutral-950 hover:text-[#C81E2B] transition-colors cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4 stroke-[1.75]" />
              <span className="text-xs font-semibold tracking-tight">
                Bag
              </span>
              <span className="text-xs font-bold text-[#C81E2B] tabular-nums">
                ({totalCount})
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-3">
          <form
            onSubmit={handleSearchSubmit}
            role="search"
            className="flex items-center border border-neutral-300 focus-within:border-neutral-950 rounded-lg bg-neutral-50/70 focus-within:bg-white transition-colors"
          >
            <Search className="h-4 w-4 text-neutral-400 ml-3 shrink-0" />
            <input
              type="search"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, brands..."
              aria-label="Search products, brands and categories"
              className="w-full bg-transparent px-2.5 py-2 text-sm text-neutral-950 placeholder:text-neutral-400 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="p-1.5 text-neutral-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-950 border-l border-neutral-200 shrink-0 cursor-pointer"
            >
              Go
            </button>
          </form>
        </div>
      </div>

      {/* Category Underline Bar */}
      <nav
        aria-label="Product categories"
        className="border-t border-neutral-100 bg-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar text-xs whitespace-nowrap">
            <Link
              href="/"
              className={`py-3 border-b-2 transition-colors shrink-0 ${
                pathname === "/" && activeCategory === "all"
                  ? "border-[#C81E2B] text-neutral-950 font-semibold"
                  : "border-transparent text-neutral-500 hover:text-neutral-950 font-medium"
              }`}
            >
              All Products
            </Link>

            {categories.map((cat) => {
              const isSelected = pathname === "/" && activeCategory === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={`/?category=${encodeURIComponent(cat.slug)}`}
                  className={`py-3 border-b-2 transition-colors shrink-0 ${
                    isSelected
                      ? "border-[#C81E2B] text-neutral-950 font-semibold"
                      : "border-transparent text-neutral-500 hover:text-neutral-950 font-medium"
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}

            <Link
              href="/orders"
              className={`ml-auto py-3 border-b-2 transition-colors shrink-0 ${
                pathname?.startsWith("/orders")
                  ? "border-[#C81E2B] text-neutral-950 font-semibold"
                  : "border-transparent text-neutral-500 hover:text-neutral-950 font-medium"
              }`}
            >
              My Orders
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

export function StorefrontNavbar({
  categories = [],
}: {
  categories?: NavCategory[];
}) {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-40 h-16 bg-white border-b border-neutral-200" />
      }
    >
      <StorefrontNavbarInner categories={categories} />
    </Suspense>
  );
}