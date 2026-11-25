import type { SupabaseClient, User } from "@supabase/supabase-js";

export type ProfileSyncOverrides = {
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
};

type ExistingProfileRow = {
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

function cleanValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
): Promise<{ error: string | null }> {
  try {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("full_name, phone, email")
      .eq("id", user.id)
      .maybeSingle<ExistingProfileRow>();

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;

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
      (resolvedEmail ? resolvedEmail.split("@")[0] : "");

    const resolvedPhone =
      cleanValue(overrides?.phone) ||
      cleanValue(existingProfile?.phone) ||
      cleanValue(metadata.phone) ||
      null;

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: resolvedEmail,
        full_name: resolvedFullName,
        phone: resolvedPhone,
      },
      { onConflict: "id" }
    );

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to sync profile.",
    };
  }
}
