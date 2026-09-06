import type { SupabaseClient } from "@supabase/supabase-js";
import type { OnboardedProfile } from "@/types/profile";

export type LeaderboardRow = {
  rank: number;
  id: string;
  username: string;
  avatar_url: string | null;
  rating: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
};

export type HeadToHead = {
  wins: number;
  losses: number;
  draws: number;
  total: number;
};

export type ArchiveGame = {
  id: string;
  white_id: string;
  black_id: string | null;
  status: string;
  result: string | null;
  reason: string | null;
  rated: boolean;
  white_rating_before: number | null;
  black_rating_before: number | null;
  white_rating_delta: number | null;
  black_rating_delta: number | null;
  ended_at: string | null;
  created_at: string;
  white: { username: string } | null;
  black: { username: string } | null;
};

export async function fetchLeaderboardTop(
  supabase: SupabaseClient,
  limit = 20,
): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .order("rank", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as LeaderboardRow[];
}

export async function fetchMyLeaderboardRank(
  supabase: SupabaseClient,
  userId: string,
): Promise<LeaderboardRow | null> {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as LeaderboardRow | null;
}

export async function fetchHeadToHead(
  supabase: SupabaseClient,
  me: string,
  them: string,
): Promise<HeadToHead> {
  const { data, error } = await supabase.rpc("head_to_head", {
    me,
    them,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    wins: row?.wins ?? 0,
    losses: row?.losses ?? 0,
    draws: row?.draws ?? 0,
    total: row?.total ?? 0,
  };
}

export async function fetchPlayerGames(
  supabase: SupabaseClient,
  userId: string,
  options: { includeUnrated: boolean },
): Promise<ArchiveGame[]> {
  let query = supabase
    .from("games")
    .select(
      `
      id, white_id, black_id, status, result, reason, rated,
      white_rating_before, black_rating_before, white_rating_delta, black_rating_delta,
      ended_at, created_at,
      white:white_id(username),
      black:black_id(username)
    `,
    )
    .or(`white_id.eq.${userId},black_id.eq.${userId}`)
    .in("status", ["finished", "abandoned"])
    .order("ended_at", { ascending: false, nullsFirst: false })
    .limit(50);

  if (!options.includeUnrated) {
    query = query.eq("rated", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as ArchiveGame[];
}

export async function fetchGameForReplay(
  supabase: SupabaseClient,
  gameId: string,
) {
  const { data, error } = await supabase
    .from("games")
    .select(
      `
      id, white_id, black_id, status, result, reason, rated, current_fen,
      white_rating_before, black_rating_before, white_rating_delta, black_rating_delta,
      ended_at, created_at,
      white:white_id(username),
      black:black_id(username)
    `,
    )
    .eq("id", gameId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export function winRate(profile: OnboardedProfile): number | null {
  if (profile.games_played === 0) {
    return null;
  }
  return Math.round((profile.wins / profile.games_played) * 100);
}

export function gamesUntilRanked(gamesPlayed: number): number {
  return Math.max(0, 5 - gamesPlayed);
}

/** Streak from most recent rated finished games (newest first). */
export function currentStreak(
  games: ArchiveGame[],
  userId: string,
): { type: "W" | "L" | "D" | null; count: number } {
  let type: "W" | "L" | "D" | null = null;
  let count = 0;

  for (const game of games) {
    if (!game.rated || game.status !== "finished" || !game.result) {
      continue;
    }

    let outcome: "W" | "L" | "D";
    if (game.result === "draw") {
      outcome = "D";
    } else if (
      (game.result === "white" && game.white_id === userId) ||
      (game.result === "black" && game.black_id === userId)
    ) {
      outcome = "W";
    } else {
      outcome = "L";
    }

    if (type === null) {
      type = outcome;
      count = 1;
      continue;
    }

    if (outcome !== type) {
      break;
    }
    count += 1;
  }

  return { type, count };
}
