import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types/profile";

const PROFILE_COLUMNS =
  "id, username, avatar_url, rating, games_played, wins, losses, draws, created_at";

export async function getProfileById(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile | null;
}

export async function getProfileByUsername(
  supabase: SupabaseClient,
  username: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .ilike("username", username)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile | null;
}

export async function isUsernameAvailable(
  supabase: SupabaseClient,
  username: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data === null;
}

export function profileUpdateErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    return "That username is already taken.";
  }
  if (error.code === "23514") {
    return "That username is not allowed.";
  }
  return "Could not save username. Please try again.";
}
