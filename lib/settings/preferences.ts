export type AppSettings = {
  /** When false, the move list / score sheet is hidden on game screens. */
  showScoreSheet: boolean;
  /** Ask before quitting a game from the settings sheet. */
  confirmQuit: boolean;
  /** Pass & play: flip the board toward the side to move. */
  autoFlipBoard: boolean;
  /** Highlight legal target squares when a piece is selected. */
  showLegalMoves: boolean;
};

export const DEFAULT_APP_SETTINGS: AppSettings = Object.freeze({
  showScoreSheet: true,
  confirmQuit: true,
  autoFlipBoard: false,
  showLegalMoves: true,
});

const STORAGE_KEY = "chess-app-settings";
const CHANGE_EVENT = "chess-settings-change";

/** Cached client snapshot — same reference until settings change. */
let cachedSnapshot: AppSettings = DEFAULT_APP_SETTINGS;
let cacheHydrated = false;

function sameSettings(a: AppSettings, b: AppSettings): boolean {
  return (
    a.showScoreSheet === b.showScoreSheet &&
    a.confirmQuit === b.confirmQuit &&
    a.autoFlipBoard === b.autoFlipBoard &&
    a.showLegalMoves === b.showLegalMoves
  );
}

function coerceSettings(parsed: Partial<AppSettings>): AppSettings {
  return {
    showScoreSheet:
      typeof parsed.showScoreSheet === "boolean"
        ? parsed.showScoreSheet
        : DEFAULT_APP_SETTINGS.showScoreSheet,
    confirmQuit:
      typeof parsed.confirmQuit === "boolean"
        ? parsed.confirmQuit
        : DEFAULT_APP_SETTINGS.confirmQuit,
    autoFlipBoard:
      typeof parsed.autoFlipBoard === "boolean"
        ? parsed.autoFlipBoard
        : DEFAULT_APP_SETTINGS.autoFlipBoard,
    showLegalMoves:
      typeof parsed.showLegalMoves === "boolean"
        ? parsed.showLegalMoves
        : DEFAULT_APP_SETTINGS.showLegalMoves,
  };
}

function parseSettings(raw: string | null): AppSettings {
  if (!raw) return DEFAULT_APP_SETTINGS;
  try {
    const next = coerceSettings(JSON.parse(raw) as Partial<AppSettings>);
    if (sameSettings(next, cachedSnapshot)) {
      return cachedSnapshot;
    }
    return next;
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

function hydrateCache(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_APP_SETTINGS;
  }
  cachedSnapshot = parseSettings(window.localStorage.getItem(STORAGE_KEY));
  cacheHydrated = true;
  return cachedSnapshot;
}

export function readAppSettings(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_APP_SETTINGS;
  }
  if (!cacheHydrated) {
    return hydrateCache();
  }
  return cachedSnapshot;
}

export function writeAppSettings(next: AppSettings): void {
  if (typeof window === "undefined") return;
  const snapshot = coerceSettings(next);
  cachedSnapshot = snapshot;
  cacheHydrated = true;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: snapshot }));
}

export function patchAppSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...readAppSettings(), ...patch };
  writeAppSettings(next);
  return cachedSnapshot;
}

export function subscribeAppSettings(onStoreChange: () => void): () => void {
  const handler = () => {
    if (typeof window !== "undefined") {
      cachedSnapshot = parseSettings(window.localStorage.getItem(STORAGE_KEY));
      cacheHydrated = true;
    }
    onStoreChange();
  };
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
