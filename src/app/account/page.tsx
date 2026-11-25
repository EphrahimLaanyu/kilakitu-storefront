"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function AccountSettingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const updatedBanner = searchParams.get("updated");

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>("email");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [busySection, setBusySection] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(
    updatedBanner === "password"
      ? { type: "success", text: "Your password has been updated." }
      : null
  );

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      if (!user) {
        router.replace("/login?next=/account");
        return;
      }

      setUserId(user.id);
      setCurrentEmail(user.email ?? "");
      setNewEmail(user.email ?? "");
      setProvider(user.app_metadata?.provider || "email");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

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

    loadAccount();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleSaveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;
    setNotice(null);
    setBusySection("profile");

    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").upsert(
        {
          id: userId,
          email: currentEmail || null,
          full_name: fullName.trim(),
          phone: phone.trim(),
        },
        { onConflict: "id" }
      );

      if (error) {
        setNotice({ type: "error", text: error.message });
      } else {
        setNotice({ type: "success", text: "Profile details saved." });
        router.refresh();
      }
    } finally {
      setBusySection(null);
    }
  }

  async function handleChangePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);

    if (newPassword.length < 6) {
      setNotice({
        type: "error",
        text: "New password must be at least 6 characters.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotice({ type: "error", text: "Passwords do not match." });
      return;
    }

    setBusySection("password");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setNotice({ type: "error", text: error.message });
      } else {
        setNewPassword("");
        setConfirmPassword("");
        setNotice({ type: "success", text: "Password updated successfully." });
      }
    } finally {
      setBusySection(null);
    }
  }

  async function handleChangeEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);
    const trimmed = newEmail.trim();
    if (!trimmed || trimmed === currentEmail) {
      setNotice({ type: "error", text: "Enter a new email address first." });
      return;
    }

    setBusySection("email");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser(
        { email: trimmed },
        {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
        }
      );

      if (error) {
        setNotice({ type: "error", text: error.message });
      } else {
        setNotice({
          type: "success",
          text: "Confirmation link sent to your new email address. Click it to complete the change.",
        });
      }
    } finally {
      setBusySection(null);
    }
  }

  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-6 pb-20 space-y-8">
        <div className="flex items-center justify-between gap-4 pb-6 border-b border-neutral-200 text-xs">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-medium text-neutral-600 hover:text-neutral-950 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Catalog</span>
          </Link>
          <Link
            href="/orders"
            className="font-medium text-neutral-600 hover:text-neutral-950 underline underline-offset-4"
          >
            My Orders
          </Link>
        </div>

        <div className="border-b border-neutral-200 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C81E2B]">
            Account & Security
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 mt-1">
            Account Settings
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Manage your contact information, sign-in email, and password.
          </p>
        </div>

        {notice && (
          <div
            className={`border-l-2 bg-neutral-50 px-4 py-3 text-xs font-medium ${
              notice.type === "error"
                ? "border-[#C81E2B] text-[#C81E2B]"
                : "border-neutral-950 text-neutral-900"
            }`}
          >
            {notice.text}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-neutral-500">Loading account...</p>
        ) : (
          <div className="divide-y divide-neutral-200 border-b border-neutral-200">
            {/* Section 1: Contact & Delivery Profile */}
            <form onSubmit={handleSaveProfile} className="py-7 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-neutral-950">
                  Contact Details
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Pre-filled at checkout for faster orders and rider handovers.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254712345678"
                    className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={busySection === "profile"}
                  className="py-2.5 px-5 rounded-md bg-neutral-950 hover:bg-[#C81E2B] disabled:opacity-50 text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer"
                >
                  {busySection === "profile" ? "Saving..." : "Save Contact Details"}
                </button>
              </div>
            </form>

            {/* Section 2: Password */}
            <form onSubmit={handleChangePassword} className="py-7 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-neutral-950">
                  Password
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {provider === "google"
                    ? "Your account uses Google Sign-In. You can also set a password here if you want to sign in with email and password."
                    : "Update your password at any time."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={busySection === "password"}
                  className="py-2.5 px-5 rounded-md bg-neutral-950 hover:bg-[#C81E2B] disabled:opacity-50 text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer"
                >
                  {busySection === "password" ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>

            {/* Section 3: Email Address */}
            <form onSubmit={handleChangeEmail} className="py-7 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-neutral-950">
                  Email Address
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Current email: <span className="text-neutral-900">{currentEmail}</span>
                </p>
              </div>

              <div className="max-w-md space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  New Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full border-b border-neutral-300 focus:border-neutral-950 bg-transparent py-2 text-sm text-neutral-950 focus:outline-none"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={busySection === "email"}
                  className="py-2.5 px-5 rounded-md border border-neutral-300 hover:border-neutral-950 disabled:opacity-50 text-neutral-950 text-xs font-semibold tracking-wide transition-colors cursor-pointer"
                >
                  {busySection === "email"
                    ? "Sending confirmation..."
                    : "Change Email Address"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AccountSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <AccountSettingsInner />
    </Suspense>
  );
}