import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameRow, MoveRow } from "@/types/game";

export async function fetchGame(
  supabase: SupabaseClient,
  gameId: string,
): Promise<GameRow | null> {
  const { data, error } = await supabase
    .from("games")
    .select(
      "id, white_id, black_id, current_fen, ply, status, result, reason, rated, initial_ms, increment_ms, white_ms, black_ms, last_move_at, created_at, started_at, ended_at",
    )
    .eq("id", gameId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as GameRow | null;
}

export async function fetchMoves(
  supabase: SupabaseClient,
  gameId: string,
): Promise<MoveRow[]> {
  const { data, error } = await supabase
    .from("moves")
    .select("game_id, ply, san, uci, fen_after, ms_left, created_at")
    .eq("game_id", gameId)
    .order("ply", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as MoveRow[];
}

export async function fetchInviteCode(
  supabase: SupabaseClient,
  gameId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("game_invites")
    .select("code")
    .eq("game_id", gameId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.code ?? null;
}

export function gameResultLabel(
  result: GameRow["result"],
  reason: GameRow["reason"],
  userId: string,
  whiteId: string,
): string | null {
  if (!result) {
    return null;
  }

  if (result === "draw") {
    return reason ? `Draw — ${reason.replaceAll("_", " ")}` : "Draw";
  }

  const won =
    (result === "white" && userId === whiteId) ||
    (result === "black" && userId !== whiteId);

  const outcome = won ? "You win" : "You lose";
  return reason ? `${outcome} — ${reason.replaceAll("_", " ")}` : outcome;
}
