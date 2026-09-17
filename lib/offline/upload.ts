/**
 * Best-effort upload of finished offline games when online.
 * No queue, no backoff — try once per call; leave unuploaded on failure.
 */

import {
  listPendingUploads,
  markOfflineGameUploaded,
  type FinishedOfflineGame,
} from "@/lib/offline/db";

export async function uploadOfflineGame(
  game: FinishedOfflineGame,
): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return false;
  }

  try {
    const res = await fetch("/api/offline-games/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        localId: game.id,
        mode: game.mode,
        result: game.result,
        reason: game.reason,
        fen: game.fen,
        moves: game.moves,
        playerColor: game.playerColor,
        endedAt: game.endedAt,
      }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { ok?: boolean };
    if (!json.ok) return false;
    await markOfflineGameUploaded(game.id);
    return true;
  } catch {
    return false;
  }
}

/** Fire-and-forget: attempt any pending local archives. Failures are ignored. */
export async function tryUploadPendingOfflineGames(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }
  let pending: FinishedOfflineGame[] = [];
  try {
    pending = await listPendingUploads();
  } catch {
    return;
  }
  for (const game of pending) {
    await uploadOfflineGame(game);
  }
}
