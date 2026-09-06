import type {
  RealtimeChannel,
  SupabaseClient,
} from "@supabase/supabase-js";
import type { GameRow, MoveRow } from "@/types/game";

type GameChannelHandlers = {
  onMove: (move: MoveRow) => void;
  onGameUpdate: (game: GameRow) => void;
};

export function subscribeToGame(
  supabase: SupabaseClient,
  gameId: string,
  handlers: GameChannelHandlers,
): RealtimeChannel {
  const channel = supabase
    .channel(`game:${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "moves",
        filter: `game_id=eq.${gameId}`,
      },
      (payload) => {
        handlers.onMove(payload.new as MoveRow);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        handlers.onGameUpdate(payload.new as GameRow);
      },
    )
    .subscribe();

  return channel;
}

export function unsubscribeFromGame(
  supabase: SupabaseClient,
  channel: RealtimeChannel,
): void {
  void supabase.removeChannel(channel);
}
