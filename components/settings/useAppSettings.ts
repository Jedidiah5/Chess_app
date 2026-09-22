"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_APP_SETTINGS,
  patchAppSettings,
  readAppSettings,
  subscribeAppSettings,
  type AppSettings,
} from "@/lib/settings/preferences";

function getServerSnapshot(): AppSettings {
  return DEFAULT_APP_SETTINGS;
}

export function useAppSettings() {
  const settings = useSyncExternalStore(
    subscribeAppSettings,
    readAppSettings,
    getServerSnapshot,
  );

  const update = useCallback((patch: Partial<AppSettings>) => {
    patchAppSettings(patch);
  }, []);

  return {
    settings,
    update,
    setShowScoreSheet: (showScoreSheet: boolean) =>
      update({ showScoreSheet }),
    setConfirmQuit: (confirmQuit: boolean) => update({ confirmQuit }),
    setAutoFlipBoard: (autoFlipBoard: boolean) => update({ autoFlipBoard }),
    setShowLegalMoves: (showLegalMoves: boolean) => update({ showLegalMoves }),
  };
}
