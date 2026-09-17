"use client";

import { useEffect } from "react";
import { cacheOnlineGame } from "@/lib/offline/db";

type Move = {
  ply: number;
  san: string;
  uci?: string;
  fen_after: string;
};

type Props = {
  id: string;
  whiteUsername: string | null;
  blackUsername: string | null;
  result: string | null;
  reason: string | null;
  rated: boolean;
  fen: string;
  moves: Move[];
  endedAt: string | null;
};

/** Best-effort cache of a finished online game for offline replay. */
export function CacheOnlineGameEffect(props: Props) {
  useEffect(() => {
    void cacheOnlineGame({
      id: props.id,
      whiteUsername: props.whiteUsername,
      blackUsername: props.blackUsername,
      result: props.result,
      reason: props.reason,
      rated: props.rated,
      fen: props.fen,
      moves: props.moves.map((m) => ({
        ply: m.ply,
        san: m.san,
        uci: m.uci ?? "",
        fen_after: m.fen_after,
      })),
      endedAt: props.endedAt,
      cachedAt: new Date().toISOString(),
    }).catch(() => {
      // ignore
    });
    // Cache once per game id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id]);

  return null;
}
