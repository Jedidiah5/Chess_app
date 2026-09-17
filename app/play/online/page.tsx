"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { OfflineGate } from "@/components/offline/OfflineUI";
import { OptionPlate } from "@/components/ui/OptionPlate";
import { PaperButton } from "@/components/ui/PaperButton";
import { PaperCard } from "@/components/ui/PaperCard";
import { TIME_CONTROLS } from "@/lib/chess/timeControl";
import { createGame } from "@/lib/supabase/functions";
import type { TimeControl } from "@/types/game";

export default function PlayOnlinePage() {
  const router = useRouter();
  const [timeControl, setTimeControl] = useState<TimeControl>("blitz");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCreateGame() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await createGame(timeControl);
      if (!result.ok) {
        setErrorMessage(result.error);
        return;
      }
      router.push(`/play/${result.gameId}`);
    } catch {
      setErrorMessage("Could not create game. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <OfflineGate feature="Online play">
      <main className="paper-grain min-h-dvh px-5 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-md">
          <header>
            <div className="flex items-center gap-4">
              <span className="print-rule" aria-hidden />
              <span className="meta-caps whitespace-nowrap">Set the game</span>
              <span className="print-rule" aria-hidden />
            </div>
            <h1
              className="mt-6 text-center text-4xl font-semibold tracking-[-0.03em]"
              style={{ color: "var(--ink)" }}
            >
              Play online
            </h1>
            <p className="meta-caps mt-3 text-center">Rated · Live clocks</p>
          </header>

          <PaperCard className="mt-8">
            <p className="text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
              Choose a time control, create the game, then share the invite
              link with your opponent.
            </p>

            <fieldset className="mt-6">
              <legend className="meta-caps">Time control</legend>
              <div className="mt-3 space-y-2.5">
                {(Object.keys(TIME_CONTROLS) as TimeControl[]).map((key) => (
                  <OptionPlate
                    key={key}
                    name="timeControl"
                    checked={timeControl === key}
                    onSelect={() => setTimeControl(key)}
                    label={TIME_CONTROLS[key].label}
                  />
                ))}
              </div>
            </fieldset>

            {errorMessage && (
              <p className="paper-alert mt-5" role="alert">
                {errorMessage}
              </p>
            )}

            <PaperButton
              variant="primary"
              onClick={handleCreateGame}
              disabled={loading}
              className="mt-7 w-full"
            >
              {loading ? "Creating…" : "Create game"}
            </PaperButton>
          </PaperCard>

          <footer className="mt-8 text-center">
            <Link href="/play" className="paper-link text-sm font-semibold">
              Back to play menu
            </Link>
          </footer>
        </div>
      </main>
    </OfflineGate>
  );
}
