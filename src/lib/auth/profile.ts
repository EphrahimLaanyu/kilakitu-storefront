import type { SupabaseClient, User } from "@supabase/supabase-js";

export type ProfileSyncOverrides = {
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type UserProfileSnapshot = {
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

function cleanValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Returns true if the Supabase Auth user signed in via Google OAuth
 * (or has a linked Google identity).
 */
export function isGoogleUser(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.app_metadata?.provider === "google") return true;
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.includes("google")) return true;
  if (
    Array.isArray(user.identities) &&
    user.identities.some((identity) => identity.provider === "google")
  ) {
    return true;
  }
  return false;
}

/**
 * Extracts fields explicitly provided by Google OAuth / Auth metadata
 * (without fabricating a full name from the email prefix).
 */
export function getGoogleProvidedFields(user: User): {
  email: string;
  fullName: string;
} {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const email = cleanValue(user.email);
  const fullName = cleanValue(metadata.full_name) || cleanValue(metadata.name);
  return { email, fullName };
}

/**
 * A profile is complete when both `full_name` and `phone` are non-empty.
 */
export function isProfileComplete(
  profile:
    | { full_name?: string | null; phone?: string | null }
    | null
    | undefined
): boolean {
  return Boolean(cleanValue(profile?.full_name) && cleanValue(profile?.phone));
}

/**
 * Safely upserts `public.profiles` with `id`, `email`, `full_name`, `phone`,
 * and `profile_completed: true` when complete. If the `profile_completed`
 * column is absent in the target schema, automatically retries without it.
 */
export async function upsertProfileSafe(
  supabase: SupabaseClient,
  payload: {
    id: string;
    email: string | null;
    full_name: string;
    phone: string | null;
    markCompleted?: boolean;
  }
): Promise<{ error: string | null }> {
  const baseRecord = {
    id: payload.id,
    email: payload.email,
    full_name: payload.full_name,
    phone: payload.phone,
  };

  if (payload.markCompleted) {
    const { error } = await supabase
      .from("profiles")
      .upsert({ ...baseRecord, profile_completed: true }, { onConflict: "id" });

    if (!error) {
      return { error: null };
    }

    const msg = error.message.toLowerCase();
    const isMissingColumn =
      error.code === "42703" ||
      error.code === "PGRST204" ||
      msg.includes("profile_completed");

    if (!isMissingColumn) {
      return { error: error.message };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(baseRecord, { onConflict: "id" });

  return { error: error ? error.message : null };
}

/**
 * Ensures a `public.profiles` row exists and is synced for the authenticated user
 * with `id`, `full_name`, `phone`, and `email`.
 * Never throws or crashes when a profile row is missing or already exists.
 */
export async function syncUserProfile(
  supabase: SupabaseClient,
  user: User,
  overrides?: ProfileSyncOverrides
): Promise<{
  error: string | null;
  profile: UserProfileSnapshot;
  isComplete: boolean;
}> {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fallbackProfile: UserProfileSnapshot = {
    email: cleanValue(overrides?.email) || cleanValue(user.email) || null,
    full_name:
      cleanValue(overrides?.fullName) ||
      cleanValue(metadata.full_name) ||
      cleanValue(metadata.name) ||
      "",
    phone: cleanValue(overrides?.phone) || cleanValue(metadata.phone) || null,
  };

  try {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("full_name, phone, email")
      .eq("id", user.id)
      .maybeSingle<UserProfileSnapshot>();

    const resolvedEmail =
      cleanValue(overrides?.email) ||
      cleanValue(user.email) ||
      cleanValue(existingProfile?.email) ||
      null;

    const resolvedFullName =
      cleanValue(overrides?.fullName) ||
      cleanValue(existingProfile?.full_name) ||
      cleanValue(metadata.full_name) ||
      cleanValue(metadata.name) ||
      "";

    const resolvedPhone =
      cleanValue(overrides?.phone) ||
      cleanValue(existingProfile?.phone) ||
      cleanValue(metadata.phone) ||
      null;

    const resolvedProfile: UserProfileSnapshot = {
      email: resolvedEmail,
      full_name: resolvedFullName,
      phone: resolvedPhone,
    };

    const complete = isProfileComplete(resolvedProfile);

    const { error } = await upsertProfileSafe(supabase, {
      id: user.id,
      email: resolvedEmail,
      full_name: resolvedFullName,
      phone: resolvedPhone,
      markCompleted: complete,
    });

    return {
      error,
      profile: resolvedProfile,
      isComplete: complete,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to sync profile.",
      profile: fallbackProfile,
      isComplete: isProfileComplete(fallbackProfile),
    };
  }
}
