"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
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
    <main className="min-h-screen bg-stone-100 px-4 py-12">
      <div className="mx-auto max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">Play online</h1>
        <p className="mt-2 text-sm text-stone-600">
          Choose a time control, create a game, and share the invite link.
        </p>

        <fieldset className="mt-6 space-y-2">
          <legend className="text-sm font-medium text-stone-700">Time control</legend>
          {(Object.keys(TIME_CONTROLS) as TimeControl[]).map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50"
            >
              <input
                type="radio"
                name="timeControl"
                value={key}
                checked={timeControl === key}
                onChange={() => setTimeControl(key)}
              />
              {TIME_CONTROLS[key].label}
            </label>
          ))}
        </fieldset>

        {errorMessage && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={handleCreateGame}
          disabled={loading}
          className="mt-6 w-full rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create game"}
        </button>

        <Link
          href="/play"
          className="mt-4 block text-center text-sm text-stone-600 underline-offset-2 hover:underline"
        >
          Back to play menu
        </Link>
      </div>
    </main>
  );
}
