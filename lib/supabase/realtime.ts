import type {
  RealtimeChannel,
  SupabaseClient,
} from "@supabase/supabase-js";
import type { GameRow, MoveRow } from "@/types/game";

type GameChannelHandlers = {
  onMove: (move: MoveRow) => void;
  onGameUpdate: (game: GameRow) => void;
  onPresenceSync?: (presentUserIds: string[]) => void;
  onPresenceJoin?: (userId: string) => void;
  onPresenceLeave?: (userId: string) => void;
};

export function subscribeToGame(
  supabase: SupabaseClient,
  gameId: string,
  userId: string,
  handlers: GameChannelHandlers,
): RealtimeChannel {
  const channel = supabase
    .channel(`game:${gameId}`, {
      config: {
        presence: { key: userId },
      },
    })
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
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ userId: string }>();
      const ids = Object.keys(state);
      handlers.onPresenceSync?.(ids);
    })
    .on("presence", { event: "join" }, ({ key }) => {
      handlers.onPresenceJoin?.(key);
    })
    .on("presence", { event: "leave" }, ({ key }) => {
      handlers.onPresenceLeave?.(key);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ userId });
      }
    });

  return channel;
}

export function unsubscribeFromGame(
  supabase: SupabaseClient,
  channel: RealtimeChannel,
): void {
  void supabase.removeChannel(channel);
}
