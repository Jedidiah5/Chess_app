/**
 * IndexedDB for offline games — no sync queue, no merge strategy.
 * Upload is a best-effort one-shot when online; failure leaves the row local.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { StockfishLevel } from "@/lib/chess/stockfish";
import type { Color, EndReason, GameResult } from "@/lib/chess/types";

const DB_NAME = "chess-offline";
const DB_VERSION = 1;

export type OfflineMode = "local" | "computer";

export type OfflineMove = {
  ply: number;
  san: string;
  uci: string;
  fen_after: string;
};

export type ActiveOfflineGame = {
  id: string;
  mode: OfflineMode;
  fen: string;
  historySan: string[];
  moves: OfflineMove[];
  playerColor: Color;
  level: StockfishLevel | null;
  updatedAt: string;
};

export type FinishedOfflineGame = {
  id: string;
  mode: OfflineMode;
  result: GameResult;
  reason: EndReason;
  fen: string;
  moves: OfflineMove[];
  playerColor: Color;
  level: StockfishLevel | null;
  endedAt: string;
  /** Set after a successful archive upload. */
  uploaded: boolean;
};

export type CachedOnlineGame = {
  id: string;
  whiteUsername: string | null;
  blackUsername: string | null;
  result: string | null;
  reason: string | null;
  rated: boolean;
  fen: string;
  moves: OfflineMove[];
  endedAt: string | null;
  cachedAt: string;
};

interface ChessOfflineDB extends DBSchema {
  active_offline_game: {
    key: string;
    value: ActiveOfflineGame;
  };
  offline_games: {
    key: string;
    value: FinishedOfflineGame;
    indexes: { "by-ended": string };
  };
  cached_games: {
    key: string;
    value: CachedOnlineGame;
    indexes: { "by-cached": string };
  };
}

let dbPromise: Promise<IDBPDatabase<ChessOfflineDB>> | null = null;

function getDb() {
  if (typeof indexedDB === "undefined") {
    throw new Error("indexeddb_unavailable");
  }
  if (!dbPromise) {
    dbPromise = openDB<ChessOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("active_offline_game")) {
          db.createObjectStore("active_offline_game", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("offline_games")) {
          const store = db.createObjectStore("offline_games", { keyPath: "id" });
          store.createIndex("by-ended", "endedAt");
        }
        if (!db.objectStoreNames.contains("cached_games")) {
          const store = db.createObjectStore("cached_games", { keyPath: "id" });
          store.createIndex("by-cached", "cachedAt");
        }
      },
    });
  }
  return dbPromise;
}

const ACTIVE_KEY = "current";

export async function saveActiveOfflineGame(
  game: Omit<ActiveOfflineGame, "id" | "updatedAt"> & { id?: string },
): Promise<ActiveOfflineGame> {
  const db = await getDb();
  const row: ActiveOfflineGame = {
    ...game,
    id: ACTIVE_KEY,
    updatedAt: new Date().toISOString(),
  };
  await db.put("active_offline_game", row);
  return row;
}

export async function getActiveOfflineGame(): Promise<ActiveOfflineGame | null> {
  const db = await getDb();
  return (await db.get("active_offline_game", ACTIVE_KEY)) ?? null;
}

export async function clearActiveOfflineGame(): Promise<void> {
  const db = await getDb();
  await db.delete("active_offline_game", ACTIVE_KEY);
}

export async function saveFinishedOfflineGame(
  game: FinishedOfflineGame,
): Promise<void> {
  const db = await getDb();
  await db.put("offline_games", game);
  await db.delete("active_offline_game", ACTIVE_KEY);
}

export async function listFinishedOfflineGames(): Promise<FinishedOfflineGame[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex("offline_games", "by-ended");
  return rows.reverse();
}

export async function getFinishedOfflineGame(
  id: string,
): Promise<FinishedOfflineGame | null> {
  const db = await getDb();
  return (await db.get("offline_games", id)) ?? null;
}

export async function markOfflineGameUploaded(id: string): Promise<void> {
  const db = await getDb();
  const row = await db.get("offline_games", id);
  if (!row) return;
  await db.put("offline_games", { ...row, uploaded: true });
}

export async function listPendingUploads(): Promise<FinishedOfflineGame[]> {
  const db = await getDb();
  const all = await db.getAll("offline_games");
  return all.filter((g) => !g.uploaded);
}

export async function cacheOnlineGame(game: CachedOnlineGame): Promise<void> {
  const db = await getDb();
  await db.put("cached_games", game);
}

export async function listCachedOnlineGames(): Promise<CachedOnlineGame[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex("cached_games", "by-cached");
  return rows.reverse();
}

export async function getCachedOnlineGame(
  id: string,
): Promise<CachedOnlineGame | null> {
  const db = await getDb();
  return (await db.get("cached_games", id)) ?? null;
}

export function newOfflineId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
